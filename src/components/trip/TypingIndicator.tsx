import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TypingIndicator as TypingIndicatorType } from '@/hooks/useTripChat';

interface TypingIndicatorProps {
  indicators: TypingIndicatorType[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ indicators }) => {
  if (indicators.length === 0) return null;

  const getTypingText = () => {
    if (indicators.length === 1) {
      return `${indicators[0].user_name} is typing...`;
    } else if (indicators.length === 2) {
      return `${indicators[0].user_name} and ${indicators[1].user_name} are typing...`;
    } else {
      return `${indicators[0].user_name} and ${indicators.length - 1} others are typing...`;
    }
  };

  return (
    <div className="flex items-center gap-2 px-2 py-1 text-sm text-gray-500">
      <div className="flex -space-x-1">
        {indicators.slice(0, 3).map((indicator) => (
          <Avatar key={indicator.user_id} className="h-5 w-5 border border-white">
            <AvatarFallback className="text-xs">
              {indicator.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      
      <span className="italic">{getTypingText()}</span>
      
      {/* Animated dots */}
      <div className="flex space-x-1">
        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
};
