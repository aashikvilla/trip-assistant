import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  Pin, 
  MoreHorizontal,
  Clock
} from 'lucide-react';
import { TripPost } from '@/hooks/useTripFeed';
import { PostActions } from './PostActions';
import { CommentSection } from './CommentSection';
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  post: TripPost;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [showComments, setShowComments] = useState(false);

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

  if (post.is_deleted) {
    return (
      <Card className="opacity-60">
        <CardContent className="pt-4">
          <p className="text-gray-500 italic">This post has been deleted</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={post.is_pinned ? 'border-blue-200 bg-blue-50/30' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.author_avatar || undefined} />
              <AvatarFallback className="text-xs">
                {getAuthorInitials(post.author_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{post.author_name}</span>
                {post.is_pinned && (
                  <Badge variant="secondary" className="text-xs">
                    <Pin className="h-3 w-3 mr-1" />
                    Pinned
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {formatTimeAgo(post.created_at)}
                {post.updated_at !== post.created_at && (
                  <span className="ml-1">(edited)</span>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="mb-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>
        </div>

        <PostActions 
          post={post}
          onToggleComments={() => setShowComments(!showComments)}
          showComments={showComments}
        />

        {showComments && (
          <div className="mt-4 pt-4 border-t">
            <CommentSection postId={post.id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
