import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ChatMessage {
  message_id: string;
  content: string;
  message_type: 'text' | 'image' | 'poll' | 'system';
  reply_to_id: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  reactions: MessageReaction[];
  poll_data: PollData | null;
}

export interface MessageReaction {
  reaction_type: string;
  count: number;
  users: { user_id: string; user_name: string }[];
  user_reacted: boolean;
}

export interface PollData {
  poll_id: string;
  question: string;
  poll_type: 'multiple_choice' | 'yes_no' | 'rating';
  options: string[];
  settings: {
    multiple_votes: boolean;
    anonymous: boolean;
  };
  expires_at: string | null;
  is_closed: boolean;
  votes: PollVote[];
}

export interface PollVote {
  option_index: number;
  rating: number | null;
  user_id: string;
  user_name: string;
}

export interface TypingIndicator {
  user_id: string;
  user_name: string;
  is_typing: boolean;
}

export const useTripChat = (tripId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);

  // Fetch chat messages
  const {
    data: messages = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['trip-chat', tripId],
    queryFn: async (): Promise<ChatMessage[]> => {
      if (!user) throw new Error('User not authenticated');
      
      try {
        const { data, error } = await supabase.rpc('get_trip_chat_messages' as any, {
          p_trip_id: tripId,
          p_limit: 50,
          p_offset: 0
        });
        
        if (error) throw error;
        return data || [];
      } catch (error: any) {
        // Fallback query if RPC function doesn't exist
        if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
          console.warn('get_trip_chat_messages function not found, using fallback query');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('trip_messages')
            .select(`
              *,
              author:profiles!trip_messages_author_id_fkey(first_name, last_name, avatar_url)
            `)
            .eq('trip_id', tripId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true })
            .limit(50);
          
          if (fallbackError) throw fallbackError;
          
          return (fallbackData || []).map(message => ({
            message_id: message.id,
            content: message.content,
            message_type: message.message_type,
            reply_to_id: message.reply_to_id,
            is_edited: message.is_edited,
            created_at: message.created_at,
            updated_at: message.updated_at,
            author_id: message.author_id,
            author_name: message.author ? `${message.author.first_name} ${message.author.last_name}`.trim() : 'Anonymous',
            author_avatar: message.author?.avatar_url || null,
            reactions: [],
            poll_data: null
          }));
        }
        throw error;
      }
    },
    enabled: !!user && !!tripId,
  });

  // Fetch typing indicators
  const { data: typingIndicators = [] } = useQuery({
    queryKey: ['trip-typing', tripId],
    queryFn: async (): Promise<TypingIndicator[]> => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('trip_typing_indicators')
        .select(`
          user_id,
          is_typing,
          profiles!trip_typing_indicators_user_id_fkey(first_name, last_name)
        `)
        .eq('trip_id', tripId)
        .eq('is_typing', true)
        .neq('user_id', user.id);
      
      if (error) return [];
      
      return (data || []).reverse().map(indicator => ({
        user_id: indicator.user_id,
        user_name: indicator.profiles ? 
          `${indicator.profiles.first_name} ${indicator.profiles.last_name}`.trim() : 
          'Anonymous',
        is_typing: indicator.is_typing
      }));
    },
    enabled: !!user && !!tripId,
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user || !tripId) return;

    const channel = supabase
      .channel(`trip-chat-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_messages',
          filter: `trip_id=eq.${tripId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['trip-chat', tripId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_message_reactions'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['trip-chat', tripId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_typing_indicators',
          filter: `trip_id=eq.${tripId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['trip-typing', tripId] });
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [user, tripId, queryClient]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, messageType = 'text', replyToId }: { 
      content: string; 
      messageType?: 'text' | 'image' | 'poll' | 'system';
      replyToId?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('trip_messages')
        .insert({
          content,
          author_id: user.id,
          trip_id: tripId,
          message_type: messageType,
          reply_to_id: replyToId || null,
          metadata: {}
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-chat', tripId] });
    },
  });

  // Toggle reaction mutation
  const toggleReactionMutation = useMutation({
    mutationFn: async ({ messageId, reactionType }: { 
      messageId: string; 
      reactionType: string;
    }) => {
      if (!user) throw new Error('User not authenticated');
      
      // Fetch any existing reactions for this user and message
      const { data: existingReactions, error: fetchErr } = await supabase
        .from('trip_message_reactions')
        .select('id, reaction_type')
        .eq('message_id', messageId)
        .eq('user_id', user.id);
      if (fetchErr) throw fetchErr;

      const sameReaction = existingReactions?.find(r => r.reaction_type === reactionType);

      if (sameReaction) {
        // Toggle off the same reaction
        const { error: delErr } = await supabase
          .from('trip_message_reactions')
          .delete()
          .eq('id', sameReaction.id);
        if (delErr) throw delErr;
        return;
      }

      // Remove any other reactions from this user for this message
      if (existingReactions && existingReactions.length > 0) {
        const { error: clearErr } = await supabase
          .from('trip_message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id);
        if (clearErr) throw clearErr;
      }

      // Insert the new reaction
      const { error: insErr } = await supabase
        .from('trip_message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          reaction_type: reactionType
        });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-chat', tripId] });
    },
  });

  // Create poll mutation
  const createPollMutation = useMutation({
    mutationFn: async ({ 
      question, 
      options, 
      pollType = 'multiple_choice',
      settings = { multiple_votes: false, anonymous: false }
    }: {
      question: string;
      options: string[];
      pollType?: 'multiple_choice' | 'yes_no' | 'rating';
      settings?: { multiple_votes: boolean; anonymous: boolean };
    }) => {
      if (!user) throw new Error('User not authenticated');
      
      // First create the message
      const { data: message, error: messageError } = await supabase
        .from('trip_messages')
        .insert({
          content: question,
          author_id: user.id,
          trip_id: tripId,
          message_type: 'poll',
          metadata: {}
        })
        .select()
        .single();
      
      if (messageError) throw messageError;
      
      // Then create the poll
      const { data: poll, error: pollError } = await supabase
        .from('trip_polls')
        .insert({
          message_id: message.id,
          question,
          poll_type: pollType,
          options: options,
          settings: JSON.stringify(settings)
        })
        .select()
        .single();
      
      if (pollError) throw pollError;
      return { message, poll };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-chat', tripId] });
    },
  });

  // Vote on poll mutation
  const votePollMutation = useMutation({
    mutationFn: async ({ 
      pollId, 
      optionIndex, 
      rating 
    }: {
      pollId: string;
      optionIndex: number;
      rating?: number;
    }) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('trip_poll_votes')
        .insert({
          poll_id: pollId,
          user_id: user.id,
          option_index: optionIndex,
          rating: rating || null
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-chat', tripId] });
    },
  });

  // Update typing indicator
  const updateTypingIndicator = async (isTyping: boolean) => {
    if (!user) return;
    
    try {
      await supabase.rpc('update_typing_indicator' as any, {
        p_trip_id: tripId,
        p_is_typing: isTyping
      });
    } catch (error) {
      // Fallback if function doesn't exist
      await supabase
        .from('trip_typing_indicators')
        .upsert({
          trip_id: tripId,
          user_id: user.id,
          is_typing: isTyping,
          last_activity: new Date().toISOString()
        });
    }
    
    queryClient.invalidateQueries({ queryKey: ['trip-typing', tripId] });
  };

  return {
    messages,
    typingIndicators,
    isLoading,
    error,
    refetch,
    sendMessage: sendMessageMutation.mutate,
    isSendingMessage: sendMessageMutation.isPending,
    toggleReaction: toggleReactionMutation.mutate,
    isTogglingReaction: toggleReactionMutation.isPending,
    createPoll: createPollMutation.mutate,
    isCreatingPoll: createPollMutation.isPending,
    votePoll: votePollMutation.mutate,
    isVotingPoll: votePollMutation.isPending,
    updateTypingIndicator,
  };
};
