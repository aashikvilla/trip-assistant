import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  expiresAt: string;
}

function getRemainingParts(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return null;

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  return { days, hours, minutes, totalMinutes };
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ expiresAt }) => {
  const [remaining, setRemaining] = useState(() => getRemainingParts(expiresAt));

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(getRemainingParts(expiresAt));
    }, 60000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!remaining) return null;

  const { days, hours, minutes, totalMinutes } = remaining;
  const isClosingSoon = totalMinutes < 60;

  let label = '';
  if (days > 0) label = `${days}d ${hours}h remaining`;
  else if (hours > 0) label = `${hours}h ${minutes}m remaining`;
  else label = `${minutes}m remaining`;

  return (
    <div
      className={`flex items-center gap-1 text-xs ${
        isClosingSoon ? 'text-red-600 font-semibold' : 'text-gray-500'
      }`}
    >
      <Clock className="h-3 w-3" />
      <span>{isClosingSoon ? `Closing soon — ${label}` : label}</span>
    </div>
  );
};
