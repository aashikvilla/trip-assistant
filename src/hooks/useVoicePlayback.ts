import { useRef, useState, useEffect, useCallback } from 'react';
import { useVoicePlaybackContext } from '@/contexts/VoicePlaybackContext';

interface VoicePlaybackResult {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  hasError: boolean;
  toggle: () => void;
  seek: (time: number) => void;
}

export function useVoicePlayback(
  messageId: string,
  audioUrl: string
): VoicePlaybackResult {
  const { activeMessageId, setActiveMessageId } = useVoicePlaybackContext();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);

  // Create audio element once
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
      setActiveMessageId(null);
    };
    audio.onerror = () => setHasError(true);

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl]);

  // Pause when another message becomes active
  useEffect(() => {
    if (activeMessageId !== messageId && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [activeMessageId, messageId, isPlaying]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setActiveMessageId(messageId);
      audio.play().then(() => setIsPlaying(true)).catch(() => setHasError(true));
    }
  }, [isPlaying, messageId, setActiveMessageId]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  return { isPlaying, currentTime, duration, hasError, toggle, seek };
}
