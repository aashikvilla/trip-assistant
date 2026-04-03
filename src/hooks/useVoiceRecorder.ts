import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { analyseWaveform } from '@/lib/analyseWaveform';

type RecorderState = 'idle' | 'requesting' | 'recording' | 'processing' | 'error';

interface VoiceRecorderResult {
  state: RecorderState;
  elapsedSeconds: number;
  hintMessage: string | null;
  errorMessage: string | null;
  isSupported: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;
  retryUpload: () => Promise<void>;
}

const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/ogg;codecs=opus',
  'audio/mp4',
];

function getSupportedMimeType(): string | null {
  if (typeof window === 'undefined' || !window.MediaRecorder) return null;
  return PREFERRED_MIME_TYPES.find(t => MediaRecorder.isTypeSupported(t)) ?? null;
}

export function useVoiceRecorder(
  tripId: string,
  replyToId: string | null,
  onSent: (messageId: string) => void,
  sendVoiceMessage: (params: {
    messageId: string;
    audioUrl: string;
    durationSeconds: number;
    waveformData: number[] | null;
    replyToId?: string | null;
  }) => Promise<void>
): VoiceRecorderResult {
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retainedBlobRef = useRef<Blob | null>(null);
  const retainedMessageIdRef = useRef<string | null>(null);

  const isSupported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!window.MediaRecorder;

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const vibrate = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  const uploadAndSend = useCallback(
    async (blob: Blob, messageId: string) => {
      setState('processing');
      const mimeType = blob.type || 'audio/webm';
      const ext = mimeType.split('/')[1]?.split(';')[0] || 'webm';
      const path = `${tripId}/${messageId}.${ext}`;

      const durationSeconds = Math.round(
        (Date.now() - startTimeRef.current) / 1000
      );

      let waveformData: number[] | null = null;
      try {
        const wf = await analyseWaveform(blob);
        waveformData = wf.length > 0 ? wf : null;
      } catch {
        // leave null
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(path, blob, { contentType: mimeType, upsert: false });

      if (uploadError) {
        retainedBlobRef.current = blob;
        retainedMessageIdRef.current = messageId;
        setState('error');
        setErrorMessage('Upload failed — tap to retry.');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(path);
      const audioUrl = urlData.publicUrl;

      try {
        await sendVoiceMessage({
          messageId,
          audioUrl,
          durationSeconds,
          waveformData,
          replyToId,
        });
        retainedBlobRef.current = null;
        retainedMessageIdRef.current = null;
        setState('idle');
        setElapsedSeconds(0);
        onSent(messageId);
      } catch {
        retainedBlobRef.current = blob;
        retainedMessageIdRef.current = messageId;
        setState('error');
        setErrorMessage('Failed to send message — tap to retry.');
      }
    },
    [tripId, sendVoiceMessage, onSent]
  );

  const startRecording = useCallback(async () => {
    if (!isSupported) return;
    setState('requesting');
    setErrorMessage(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      const msg =
        err?.name === 'NotAllowedError'
          ? err?.message?.includes('policy')
            ? 'Microphone access is blocked by your browser settings.'
            : 'Microphone access is required to send voice messages'
          : 'Could not access microphone.';
      setState('error');
      setErrorMessage(msg);
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    startTimeRef.current = Date.now();

    const mimeType = getSupportedMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorderRef.current = recorder;
    recorder.start(100);
    setState('recording');
    setElapsedSeconds(0);
    vibrate(50);

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed >= 120) {
        stopRecording();
      }
    }, 1000);
  }, [isSupported]);

  const stopRecording = useCallback(async () => {
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    clearTimer();

    if (elapsed < 1) {
      releaseStream();
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current = null;
      setState('idle');
      setElapsedSeconds(0);
      setHintMessage('Hold longer to record');
      setTimeout(() => setHintMessage(null), 2000);
      return;
    }

    vibrate(100);

    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    releaseStream();
    mediaRecorderRef.current = null;

    const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
    const messageId = crypto.randomUUID();
    await uploadAndSend(blob, messageId);
  }, [uploadAndSend]);

  const cancelRecording = useCallback(() => {
    clearTimer();
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    releaseStream();
    chunksRef.current = [];
    setState('idle');
    setElapsedSeconds(0);
  }, []);

  const retryUpload = useCallback(async () => {
    const blob = retainedBlobRef.current;
    const messageId = retainedMessageIdRef.current;
    if (!blob || !messageId) return;
    setErrorMessage(null);
    await uploadAndSend(blob, messageId);
  }, [uploadAndSend]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      releaseStream();
    };
  }, []);

  return {
    state,
    elapsedSeconds,
    hintMessage,
    errorMessage,
    isSupported,
    startRecording,
    stopRecording,
    cancelRecording,
    retryUpload,
  };
}
