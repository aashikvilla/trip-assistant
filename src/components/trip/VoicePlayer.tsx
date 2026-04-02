import React from 'react';
import { Play, Pause, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useVoicePlayback } from '@/hooks/useVoicePlayback';

interface VoicePlayerProps {
  messageId: string;
  audioUrl: string;
  durationSeconds: number;
  waveformData: number[] | null;
  isOwnMessage: boolean;
}

const BARS = 40;
const PLACEHOLDER_HEIGHTS = Array.from({ length: BARS }, (_, i) =>
  0.3 + 0.4 * Math.abs(Math.sin(i * 0.7))
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
  const bars = waveformData && waveformData.length > 0 ? waveformData : PLACEHOLDER_HEIGHTS;

  const activeColor = isOwnMessage ? 'bg-white' : 'bg-blue-600';
  const inactiveColor = isOwnMessage ? 'bg-blue-200/60' : 'bg-blue-200';
  const timeColor = isOwnMessage ? 'text-blue-100' : 'text-gray-500';
  const btnClass = isOwnMessage
    ? 'text-white hover:bg-white/20'
    : 'text-blue-600 hover:bg-blue-50';

  if (hasError) {
    return (
      <div className="flex items-center gap-2 py-1">
        <AlertCircle className={`h-4 w-4 ${isOwnMessage ? 'text-red-300' : 'text-red-500'}`} />
        <span className={`text-xs ${timeColor}`}>Failed to load audio</span>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 px-2 text-xs ${btnClass}`}
          onClick={() => window.location.reload()}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1 min-w-[180px]">
      {/* Play/Pause button */}
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 rounded-full flex-shrink-0 ${btnClass}`}
        onClick={toggle}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>

      {/* Waveform */}
      <div className="flex items-center gap-[2px] flex-1 h-8">
        {bars.map((amplitude, i) => {
          const barProgress = i / bars.length;
          const isActive = barProgress <= progress;
          const height = Math.max(4, Math.round(amplitude * 28));
          return (
            <div
              key={i}
              className={`rounded-full flex-1 transition-colors duration-75 ${
                isActive ? activeColor : inactiveColor
              }`}
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>

      {/* Duration */}
      <span className={`text-xs tabular-nums flex-shrink-0 ${timeColor}`}>
        {isPlaying
          ? formatDuration(currentTime)
          : formatDuration(totalDuration)}
      </span>
    </div>
  );
};
