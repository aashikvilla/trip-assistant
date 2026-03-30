import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MessageSquare, Plus } from 'lucide-react';
import { useTripFeed } from '@/hooks/useTripFeed';
import { PostCard } from './PostCard';
import { CreatePostForm } from './CreatePostForm';

interface TripFeedProps {
  tripId: string;
}

export const TripFeed: React.FC<TripFeedProps> = ({ tripId }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { posts, isLoading, error, refetch } = useTripFeed(tripId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading discussion...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Trip Discussion
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Post
            </Button>
          </CardHeader>
          <CardContent>
            {showCreateForm && (
              <div className="mb-4">
                <CreatePostForm
                  tripId={tripId}
                  onSuccess={() => {
                    setShowCreateForm(false);
                    refetch();
                  }}
                  onCancel={() => setShowCreateForm(false)}
                />
              </div>
            )}
            
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">
                <p>Failed to load discussion feed</p>
                <Button variant="outline" onClick={() => refetch()} className="mt-2">
                  Try Again
                </Button>
              </div>
              <div className="text-gray-500 mt-6">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Start a discussion</p>
                <p className="text-sm">You can still create a new post while we fix the loading issue</p>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(true)}
                  className="mt-4"
                >
                  Create Post
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Trip Discussion
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Post
          </Button>
        </CardHeader>
        <CardContent>
          {showCreateForm && (
            <div className="mb-4">
              <CreatePostForm
                tripId={tripId}
                onSuccess={() => {
                  setShowCreateForm(false);
                  refetch();
                }}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          )}
          
          {posts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No posts yet</p>
              <p className="text-sm">Be the first to start a discussion!</p>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(true)}
                className="mt-4"
              >
                Create First Post
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
