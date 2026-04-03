import React, { useCallback } from 'react';
import { Mic, Loader2, AlertCircle, X, Send } from 'lucide-react';
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
  replyToId = null,
  onSent,
}) => {
  const { user } = useAuth();

  const sendVoiceMessage = useCallback(
    async ({
      messageId,
      audioUrl,
      durationSeconds,
      waveformData,
      replyToId: replyId,
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
        reply_to_id: replyId || null,
        metadata: {
          audio_url: audioUrl,
          duration_seconds: durationSeconds,
          waveform_data: waveformData,
        },
      });
      if (error) throw error;
    },
    [user, tripId]
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
  } = useVoiceRecorder(tripId, replyToId, onSent, sendVoiceMessage);

  if (!isSupported) return null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // WhatsApp-style recording bar
  if (state === 'recording') {
    return (
      <div className="flex items-center gap-2 flex-1 bg-white rounded-2xl border-2 border-red-300 px-3 py-2 shadow-sm animate-in fade-in duration-200">
        {/* Cancel button */}
        <button
          className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          onClick={cancelRecording}
          aria-label="Cancel recording"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Red pulsing dot + timer */}
        <div className="flex items-center gap-2 flex-1">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <span className="text-sm font-mono text-red-600 tabular-nums">
            {formatTime(elapsedSeconds)}
          </span>
          <span className="text-xs text-gray-400 flex-1 text-center">
            Recording...
          </span>
        </div>

        {/* Send button */}
        <button
          className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
          style={{ touchAction: 'none' }}
          onClick={stopRecording}
          aria-label="Send voice message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (state === 'processing') {
    return (
      <div className="flex items-center justify-center w-11 h-11">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center gap-1">
        <button
          className="flex items-center justify-center w-11 h-11 rounded-full text-red-500 hover:bg-red-50 transition-colors"
          onClick={retryUpload}
          title={errorMessage || 'Error'}
        >
          <AlertCircle className="h-5 w-5" />
        </button>
        <span className="text-[10px] text-red-500">Retry</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <button
        className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          e.preventDefault();
          startRecording();
        }}
        aria-label="Hold to record voice message"
        title="Hold to record"
      >
        <Mic className="h-5 w-5" />
      </button>
      {hintMessage && (
        <span className="text-[10px] text-amber-600 whitespace-nowrap">{hintMessage}</span>
      )}
    </div>
  );
};
