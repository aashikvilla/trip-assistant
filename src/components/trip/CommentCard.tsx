import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ThumbsUp, 
  ThumbsDown, 
  Reply, 
  MoreHorizontal,
  Clock,
  Loader2,
  Send
} from 'lucide-react';
import { TripComment, useTripComments } from '@/hooks/useTripFeed';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface CommentCardProps {
  comment: TripComment;
  postId: string;
  level: number;
}

export const CommentCard: React.FC<CommentCardProps> = ({ 
  comment, 
  postId, 
  level 
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const { 
    createComment, 
    isCreatingComment, 
    toggleCommentReaction, 
    isTogglingCommentReaction 
  } = useTripComments(postId);

  const getAuthorInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    try {
      await createComment({ 
        content: replyContent.trim(), 
        parentCommentId: comment.id 
      });
      setReplyContent('');
      setShowReplyForm(false);
    } catch (error) {
      console.error('Failed to create reply:', error);
    }
  };

  const handleLike = () => {
    toggleCommentReaction({ commentId: comment.id, reactionType: 'like' });
  };

  const handleDislike = () => {
    toggleCommentReaction({ commentId: comment.id, reactionType: 'dislike' });
  };

  if (comment.is_deleted) {
    return (
      <div className={cn("opacity-60", level > 0 && "ml-8")}>
        <p className="text-sm text-gray-500 italic">This comment has been deleted</p>
      </div>
    );
  }

  const maxNestingLevel = 3;
  const shouldNest = level < maxNestingLevel;

  return (
    <div className={cn("space-y-3", level > 0 && shouldNest && "ml-8")}>
      <div className="flex gap-3">
        <Avatar className="h-6 w-6 mt-1">
          <AvatarImage src={comment.author_avatar || undefined} />
          <AvatarFallback className="text-xs">
            {getAuthorInitials(comment.author_name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-2">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{comment.author_name}</span>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  {formatTimeAgo(comment.created_at)}
                  {comment.updated_at !== comment.created_at && (
                    <span className="ml-1">(edited)</span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {comment.content}
            </p>
          </div>

          {/* Comment Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={isTogglingCommentReaction}
              className={cn(
                "h-6 px-2 text-xs",
                comment.user_reaction === 'like' && "bg-green-100 text-green-700 hover:bg-green-200"
              )}
            >
              <ThumbsUp className={cn(
                "h-3 w-3 mr-1",
                comment.user_reaction === 'like' && "fill-current"
              )} />
              {comment.like_count}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDislike}
              disabled={isTogglingCommentReaction}
              className={cn(
                "h-6 px-2 text-xs",
                comment.user_reaction === 'dislike' && "bg-red-100 text-red-700 hover:bg-red-200"
              )}
            >
              <ThumbsDown className={cn(
                "h-3 w-3 mr-1",
                comment.user_reaction === 'dislike' && "fill-current"
              )} />
              {comment.dislike_count}
            </Button>

            {shouldNest && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="h-6 px-2 text-xs"
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
            )}
          </div>

          {/* Reply Form */}
          {showReplyForm && (
            <form onSubmit={handleReply} className="space-y-2">
              <Textarea
                placeholder={`Reply to ${comment.author_name}...`}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[60px] resize-none text-sm"
                disabled={isCreatingComment}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!replyContent.trim() || isCreatingComment}
                >
                  {isCreatingComment ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Send className="h-3 w-3 mr-1" />
                  )}
                  Reply
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyContent('');
                  }}
                  disabled={isCreatingComment}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map((reply) => (
            <CommentCard 
              key={reply.id} 
              comment={reply} 
              postId={postId}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
