import React, { useCallback } from 'react';
import { Mic, Loader2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface VoiceRecorderButtonProps {
  tripId: string;
  replyToId?: string | null;
  onSent: () => void;
}

export const VoiceRecorderButton: React.FC<VoiceRecorderButtonProps> = ({
  tripId,
  replyToId,
  onSent,
}) => {
  const { user } = useAuth();

  const sendVoiceMessage = useCallback(
    async ({
      messageId,
      audioUrl,
      durationSeconds,
      waveformData,
    }: {
      messageId: string;
      audioUrl: string;
      durationSeconds: number;
      waveformData: number[] | null;
      replyToId?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('trip_messages').insert({
        id: messageId,
        content: '',
        author_id: user.id,
        trip_id: tripId,
        message_type: 'voice',
        reply_to_id: replyToId || null,
        metadata: {
          audio_url: audioUrl,
          duration_seconds: durationSeconds,
          waveform_data: waveformData,
        },
      });
      if (error) throw error;
    },
    [user, tripId, replyToId]
  );

  const {
    state,
    elapsedSeconds,
    hintMessage,
    errorMessage,
    isSupported,
    startRecording,
    stopRecording,
    cancelRecording,
    retryUpload,
  } = useVoiceRecorder(tripId, onSent, sendVoiceMessage);

  if (!isSupported) return null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (state === 'recording') {
    return (
      <div className="flex items-center gap-2">
        {/* Cancel swipe affordance */}
        <span className="text-xs text-gray-500 select-none">Slide to cancel</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-gray-500 hover:bg-gray-100"
          onPointerUp={cancelRecording}
          onPointerLeave={cancelRecording}
        >
          <X className="h-4 w-4" />
        </Button>
        {/* Elapsed time */}
        <span className="text-xs font-mono text-red-600 min-w-[40px]">
          {formatTime(elapsedSeconds)}
        </span>
        {/* Pulsing red record button — release to send */}
        <button
          className="relative flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full bg-red-600 text-white shadow-lg"
          style={{ touchAction: 'none' }}
          onPointerUp={stopRecording}
          onPointerLeave={cancelRecording}
          aria-label="Release to send voice message"
        >
          <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-60" />
          <Mic className="h-5 w-5 relative z-10" />
        </button>
      </div>
    );
  }

  if (state === 'processing') {
    return (
      <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full" disabled>
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      </Button>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full text-red-500 hover:bg-red-50"
          onClick={retryUpload}
          title={errorMessage || 'Error'}
        >
          <AlertCircle className="h-5 w-5" />
        </Button>
        <span className="text-xs text-red-500">Retry</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <button
        className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
        style={{ touchAction: 'none' }}
        onPointerDown={startRecording}
        aria-label="Hold to record voice message"
        title="Hold to record"
      >
        <Mic className="h-5 w-5" />
      </button>
      {hintMessage && (
        <span className="text-xs text-amber-600 whitespace-nowrap">{hintMessage}</span>
      )}
    </div>
  );
};
