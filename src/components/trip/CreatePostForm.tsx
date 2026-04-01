import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/Card';
import { Loader2, Send, X } from 'lucide-react';
import { useTripFeed } from '@/hooks/useTripFeed';

interface CreatePostFormProps {
  tripId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const CreatePostForm: React.FC<CreatePostFormProps> = ({
  tripId,
  onSuccess,
  onCancel,
}) => {
  const [content, setContent] = useState('');
  const { createPost, isCreatingPost } = useTripFeed(tripId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      await createPost({ content: content.trim() });
      setContent('');
      onSuccess();
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="What's on your mind about this trip?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none"
            disabled={isCreatingPost}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isCreatingPost}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!content.trim() || isCreatingPost}
            >
              {isCreatingPost ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Post
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
