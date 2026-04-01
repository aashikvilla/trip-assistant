import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, MessageSquare } from 'lucide-react';
import { useTripComments } from '@/hooks/useTripFeed';
import { CommentCard } from './CommentCard';

interface CommentSectionProps {
  postId: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ postId }) => {
  const [newComment, setNewComment] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const { 
    comments, 
    isLoading, 
    error, 
    createComment, 
    isCreatingComment 
  } = useTripComments(postId);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await createComment({ content: newComment.trim() });
      setNewComment('');
      setShowReplyForm(false);
    } catch (error) {
      console.error('Failed to create comment:', error);
    }
  };

  // Organize comments into a tree structure
  const organizeComments = (comments: any[]) => {
    const commentMap = new Map();
    const topLevelComments: any[] = [];

    // First pass: create map of all comments
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: organize into tree structure
    comments.forEach(comment => {
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id);
        if (parent) {
          parent.replies.push(commentMap.get(comment.id));
        }
      } else {
        topLevelComments.push(commentMap.get(comment.id));
      }
    });

    return topLevelComments;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-gray-500">Loading comments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-red-600">Failed to load comments</p>
      </div>
    );
  }

  const organizedComments = organizeComments(comments);

  return (
    <div className="space-y-4">
      {/* Comment Form */}
      <div className="space-y-3">
        {!showReplyForm ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReplyForm(true)}
            className="w-full justify-start text-gray-600"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Add a comment...
          </Button>
        ) : (
          <form onSubmit={handleSubmitComment} className="space-y-3">
            <Textarea
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none text-sm"
              disabled={isCreatingComment}
            />
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={!newComment.trim() || isCreatingComment}
              >
                {isCreatingComment ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Send className="h-3 w-3 mr-1" />
                )}
                Comment
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowReplyForm(false);
                  setNewComment('');
                }}
                disabled={isCreatingComment}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Comments List */}
      {organizedComments.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No comments yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {organizedComments.map((comment) => (
            <CommentCard 
              key={comment.id} 
              comment={comment} 
              postId={postId}
              level={0}
            />
          ))}
        </div>
      )}
    </div>
  );
};
