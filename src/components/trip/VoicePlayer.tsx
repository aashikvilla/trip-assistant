import React from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import { useVoicePlayback } from '@/hooks/useVoicePlayback';

interface VoicePlayerProps {
  messageId: string;
  audioUrl: string;
  durationSeconds: number;
  waveformData: number[] | null;
  isOwnMessage: boolean;
}

const BARS = 28;
const PLACEHOLDER_HEIGHTS = Array.from({ length: BARS }, (_, i) =>
  0.2 + 0.5 * Math.abs(Math.sin(i * 0.6))
);

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({
  messageId,
  audioUrl,
  durationSeconds,
  waveformData,
  isOwnMessage,
}) => {
  const { isPlaying, currentTime, duration, hasError, toggle } = useVoicePlayback(
    messageId,
    audioUrl
  );

  const totalDuration = duration > 0 ? duration : durationSeconds;
  const progress = totalDuration > 0 ? currentTime / totalDuration : 0;
  const bars = waveformData && waveformData.length > 0
    ? waveformData.length <= BARS
      ? waveformData
      : waveformData.filter((_, i) => i % Math.ceil(waveformData.length / BARS) === 0).slice(0, BARS)
    : PLACEHOLDER_HEIGHTS;

  if (hasError) {
    return (
      <div className="flex items-center gap-2 py-1 opacity-50">
        <Mic className="h-4 w-4" />
        <span className="text-xs">Voice message unavailable</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 min-w-[200px] max-w-[280px]">
      {/* Play/Pause — WhatsApp-style circle */}
      <button
        onClick={toggle}
        className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 transition-colors ${
          isOwnMessage
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
        }`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" />
        )}
      </button>

      {/* Waveform + duration */}
      <div className="flex-1 flex flex-col gap-1">
        {/* Waveform bars */}
        <div className="flex items-end gap-[2px] h-6">
          {bars.map((amplitude, i) => {
            const barProgress = i / bars.length;
            const isActive = barProgress <= progress;
            const height = Math.max(3, Math.round(amplitude * 22));
            return (
              <div
                key={i}
                className={`rounded-full flex-1 min-w-[2px] transition-colors duration-75 ${
                  isActive
                    ? isOwnMessage ? 'bg-white' : 'bg-blue-600'
                    : isOwnMessage ? 'bg-white/30' : 'bg-blue-200'
                }`}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>

        {/* Duration label */}
        <span className={`text-[10px] tabular-nums ${
          isOwnMessage ? 'text-blue-100' : 'text-gray-400'
        }`}>
          {isPlaying ? formatDuration(currentTime) : formatDuration(totalDuration)}
        </span>
      </div>

      {/* Small mic icon badge — like WhatsApp */}
      <div className={`flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 ${
        isOwnMessage ? 'bg-white/15' : 'bg-blue-50'
      }`}>
        <Mic className={`h-3 w-3 ${isOwnMessage ? 'text-blue-100' : 'text-blue-400'}`} />
      </div>
    </div>
  );
};
