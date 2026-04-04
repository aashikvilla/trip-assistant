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
    <>
      {/* Backdrop to close picker on outside click */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <Card className="absolute z-50 bottom-full mb-2 right-0 p-1.5 shadow-xl bg-white border border-gray-200 rounded-full w-max">
        <CardContent className="p-0">
          <div className="flex gap-0.5">
            {Object.entries(REACTION_EMOJIS).slice(0, 6).map(([type, emoji]) => (
              <Button
                key={type}
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 hover:bg-gray-100 rounded-full text-lg transition-transform hover:scale-110"
                onClick={() => handleReaction(type)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
};
