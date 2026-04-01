import React from 'react';
import { Button } from '@/components/ui/Button';
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare
} from 'lucide-react';
import { TripPost, useTripFeed } from '@/hooks/useTripFeed';
import { cn } from '@/lib/utils';

interface PostActionsProps {
  post: TripPost;
  onToggleComments: () => void;
  showComments: boolean;
}

export const PostActions: React.FC<PostActionsProps> = ({ 
  post, 
  onToggleComments, 
  showComments 
}) => {
  const { toggleReaction, isTogglingReaction } = useTripFeed(post.trip_id);

  const handleLike = () => {
    toggleReaction({ postId: post.id, reactionType: 'like' });
  };

  const handleDislike = () => {
    toggleReaction({ postId: post.id, reactionType: 'dislike' });
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLike}
        disabled={isTogglingReaction}
        className={cn(
          "h-8 px-3 text-xs",
          post.user_reaction === 'like' && "bg-green-100 text-green-700 hover:bg-green-200"
        )}
      >
        <ThumbsUp className={cn(
          "h-3 w-3 mr-1",
          post.user_reaction === 'like' && "fill-current"
        )} />
        {post.like_count}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleDislike}
        disabled={isTogglingReaction}
        className={cn(
          "h-8 px-3 text-xs",
          post.user_reaction === 'dislike' && "bg-red-100 text-red-700 hover:bg-red-200"
        )}
      >
        <ThumbsDown className={cn(
          "h-3 w-3 mr-1",
          post.user_reaction === 'dislike' && "fill-current"
        )} />
        {post.dislike_count}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleComments}
        className={cn(
          "h-8 px-3 text-xs",
          showComments && "bg-blue-100 text-blue-700 hover:bg-blue-200"
        )}
      >
        <MessageSquare className="h-3 w-3 mr-1" />
        {post.comment_count} {post.comment_count === 1 ? 'Comment' : 'Comments'}
      </Button>
    </div>
  );
};
