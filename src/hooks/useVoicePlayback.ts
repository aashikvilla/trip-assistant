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
  const retryCountRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);

  // Create audio element once
  useEffect(() => {
    if (!audioUrl) {
      setHasError(true);
      return;
    }

    const audio = new Audio();
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setHasError(false);
    };
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
      setActiveMessageId(null);
    };
    audio.onerror = () => {
      // Retry up to 2 times with a short delay
      if (retryCountRef.current < 2) {
        retryCountRef.current++;
        setTimeout(() => {
          audio.src = audioUrl;
          audio.load();
        }, 1000 * retryCountRef.current);
      } else {
        setHasError(true);
      }
    };

    // Set crossOrigin for CORS and then load
    audio.crossOrigin = 'anonymous';
    audio.preload = 'metadata';
    audio.src = audioUrl;

    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load(); // release resources
    };
  }, [audioUrl, setActiveMessageId]);

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
      setHasError(false);
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
