import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

interface ReactionPickerProps {
  onReaction: (reactionType: string) => void;
  onClose: () => void;
}

const REACTION_EMOJIS: Record<string, string> = {
  like: '👍',
  love: '❤️',
  laugh: '😂',
  wow: '😮',
  sad: '😢',
  fire: '🔥'
};

export const ReactionPicker: React.FC<ReactionPickerProps> = ({ onReaction, onClose }) => {
  const handleReaction = (reactionType: string) => {
    onReaction(reactionType);
    onClose();
  };

  return (
    <Card className="absolute z-50 bottom-full mb-2 p-2 shadow-lg bg-white border border-gray-200 rounded-full">
      <CardContent className="p-0">
        <div className="flex gap-1">
          {Object.entries(REACTION_EMOJIS).slice(0, 6).map(([type, emoji]) => (
            <Button
              key={type}
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 hover:bg-gray-100 rounded-full text-lg transition-transform hover:scale-110"
              onClick={() => handleReaction(type)}
            >
              {emoji}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
