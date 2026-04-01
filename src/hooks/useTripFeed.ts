import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TripPost {
  id: string;
  content: string;
  author_id: string;
  trip_id: string;
  post_type: string;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  metadata: any;
  author_name: string;
  author_avatar: string | null;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  user_reaction: string | null;
}

export interface TripComment {
  id: string;
  content: string;
  author_id: string;
  post_id: string;
  parent_comment_id: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_avatar: string | null;
  like_count: number;
  dislike_count: number;
  user_reaction: string | null;
  replies?: TripComment[];
}

export const useTripFeed = (tripId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: posts = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['trip-feed', tripId],
    queryFn: async (): Promise<TripPost[]> => {
      if (!user) throw new Error('User not authenticated');
      
      // Try the RPC function first, fallback to direct table query if it doesn't exist
      try {
        const { data, error } = await supabase.rpc('get_trip_feed' as any, {
          p_trip_id: tripId,
          p_user_id: user.id
        });
        
        if (error) throw error;
        return data || [];
      } catch (error: any) {
        // If RPC function doesn't exist, try direct query as fallback
        if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
          console.warn('get_trip_feed function not found, using fallback query');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('trip_posts')
            .select(`
              *,
              author:profiles!trip_posts_author_id_fkey(first_name, last_name, avatar_url)
            `)
            .eq('trip_id', tripId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });
          
          if (fallbackError) throw fallbackError;
          
          // Transform data to match expected format
          return (fallbackData || []).map(post => ({
            ...post,
            author_name: post.author ? `${post.author.first_name} ${post.author.last_name}`.trim() : 'Anonymous',
            author_avatar: post.author?.avatar_url || null,
            like_count: 0,
            dislike_count: 0,
            comment_count: 0,
            user_reaction: null
          }));
        }
        throw error;
      }
    },
    enabled: !!user && !!tripId,
  });

  const createPostMutation = useMutation({
    mutationFn: async ({ content, postType = 'text' }: { content: string; postType?: string }) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('trip_posts')
        .insert({
          content,
          author_id: user.id,
          trip_id: tripId,
          post_type: postType,
          metadata: {}
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-feed', tripId] });
    },
  });

  const toggleReactionMutation = useMutation({
    mutationFn: async ({ postId, reactionType }: { postId: string; reactionType: 'like' | 'dislike' }) => {
      if (!user) throw new Error('User not authenticated');
      
      // Check if user already has a reaction
      const { data: existingReaction } = await supabase
        .from('trip_post_reactions')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (existingReaction) {
        if (existingReaction.reaction_type === reactionType) {
          // Remove reaction if same type
          const { error } = await supabase
            .from('trip_post_reactions')
            .delete()
            .eq('id', existingReaction.id);
          if (error) throw error;
        } else {
          // Update reaction if different type
          const { error } = await supabase
            .from('trip_post_reactions')
            .update({ reaction_type: reactionType })
            .eq('id', existingReaction.id);
          if (error) throw error;
        }
      } else {
        // Create new reaction
        const { error } = await supabase
          .from('trip_post_reactions')
          .insert({
            post_id: postId,
            user_id: user.id,
            reaction_type: reactionType
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-feed', tripId] });
    },
  });

  return {
    posts,
    isLoading,
    error,
    refetch,
    createPost: createPostMutation.mutate,
    isCreatingPost: createPostMutation.isPending,
    toggleReaction: toggleReactionMutation.mutate,
    isTogglingReaction: toggleReactionMutation.isPending,
  };
};

export const useTripComments = (postId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: comments = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['trip-comments', postId],
    queryFn: async (): Promise<TripComment[]> => {
      if (!user) throw new Error('User not authenticated');
      
      try {
        const { data, error } = await supabase.rpc('get_post_comments' as any, {
          p_post_id: postId,
          p_user_id: user.id
        });
        
        if (error) throw error;
        return data || [];
      } catch (error: any) {
        // If RPC function doesn't exist, try direct query as fallback
        if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
          console.warn('get_post_comments function not found, using fallback query');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('trip_post_comments')
            .select(`
              *,
              author:profiles!trip_post_comments_author_id_fkey(first_name, last_name, avatar_url)
            `)
            .eq('post_id', postId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true });
          
          if (fallbackError) throw fallbackError;
          
          // Transform data to match expected format
          return (fallbackData || []).map(comment => ({
            ...comment,
            author_name: comment.author ? `${comment.author.first_name} ${comment.author.last_name}`.trim() : 'Anonymous',
            author_avatar: comment.author?.avatar_url || null,
            like_count: 0,
            dislike_count: 0,
            user_reaction: null,
            replies: []
          }));
        }
        throw error;
      }
    },
    enabled: !!user && !!postId,
  });

  const createCommentMutation = useMutation({
    mutationFn: async ({ content, parentCommentId }: { content: string; parentCommentId?: string }) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('trip_post_comments')
        .insert({
          content,
          author_id: user.id,
          post_id: postId,
          parent_comment_id: parentCommentId || null
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-comments', postId] });
    },
  });

  const toggleCommentReactionMutation = useMutation({
    mutationFn: async ({ commentId, reactionType }: { commentId: string; reactionType: 'like' | 'dislike' }) => {
      if (!user) throw new Error('User not authenticated');
      
      // Check if user already has a reaction
      const { data: existingReaction } = await supabase
        .from('trip_comment_reactions')
        .select('*')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .single();

      if (existingReaction) {
        if (existingReaction.reaction_type === reactionType) {
          // Remove reaction if same type
          const { error } = await supabase
            .from('trip_comment_reactions')
            .delete()
            .eq('id', existingReaction.id);
          if (error) throw error;
        } else {
          // Update reaction if different type
          const { error } = await supabase
            .from('trip_comment_reactions')
            .update({ reaction_type: reactionType })
            .eq('id', existingReaction.id);
          if (error) throw error;
        }
      } else {
        // Create new reaction
        const { error } = await supabase
          .from('trip_comment_reactions')
          .insert({
            comment_id: commentId,
            user_id: user.id,
            reaction_type: reactionType
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-comments', postId] });
    },
  });

  return {
    comments,
    isLoading,
    error,
    refetch,
    createComment: createCommentMutation.mutate,
    isCreatingComment: createCommentMutation.isPending,
    toggleCommentReaction: toggleCommentReactionMutation.mutate,
    isTogglingCommentReaction: toggleCommentReactionMutation.isPending,
  };
};
