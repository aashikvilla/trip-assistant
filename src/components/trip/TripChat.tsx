import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  MessageCircle,
  Send,
  BarChart3,
  Loader2,
  Reply,
  WifiOff,
  Bell,
} from 'lucide-react';
import { useTripChat } from '@/hooks/useTripChat';
import { useNotifications } from '@/hooks/useNotifications';
import { ChatMessage } from './ChatMessage';
import { CreatePollDialog } from './CreatePollDialog';
import { ReactionPicker } from './ReactionPicker';
import { TypingIndicator } from './TypingIndicator';
import { VoiceRecorderButton } from './VoiceRecorderButton';
import { VoicePlaybackProvider } from '@/contexts/VoicePlaybackContext';
import { useConnectivity } from '@/hooks/useConnectivity';
import { enqueueAction } from '@/lib/background-sync';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface TripChatProps {
  tripId: string;
}

export const TripChat: React.FC<TripChatProps> = ({ tripId }) => {
  const [message, setMessage] = useState('');
  const [showPollDialog, setShowPollDialog] = useState(false);
  const { isOffline } = useConnectivity();
  const { toast } = useToast();
  const [replyToMessage, setReplyToMessage] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [isAtBottom, setIsAtBottom] = useState(true);

  const {
    messages,
    typingIndicators,
    isLoading,
    error,
    sendMessage,
    isSendingMessage,
    toggleReaction,
    createPoll,
    votePoll,
    nudgePoll,
    isNudging,
    updateTypingIndicator,
  } = useTripChat(tripId);

  const { unreadCount, markRead } = useNotifications(tripId);

  // Mark notifications as read when chat is open
  useEffect(() => {
    if (unreadCount > 0) {
      markRead(tripId);
    }
  }, [unreadCount, tripId]);

  // Auto-scroll to bottom when new messages arrive and user is at bottom
  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAtBottom]);

  // Handle scroll events to detect when user scrolls up
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - (scrollTop + clientHeight) < 100;
    setIsAtBottom(isNearBottom);
  };

  const handleScrollTop = () => {
    if (messagesContainerRef.current?.scrollTop === 0) {
      // TODO: Implement loading previous messages
    }
  };

  // Handle typing indicators
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    updateTypingIndicator(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingIndicator(false);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSendingMessage) return;

    const messageContent = message.trim();
    setMessage('');
    updateTypingIndicator(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (isOffline) {
      await enqueueAction({
        tripId,
        type: 'send_message',
        payload: { content: messageContent, replyToId: replyToMessage },
      });
      setReplyToMessage(null);
      toast({
        title: 'Message queued',
        description: "Will send when you're back online.",
      });
      return;
    }

    try {
      await sendMessage({
        content: messageContent,
        messageType: 'text',
        replyToId: replyToMessage ?? undefined,
      });
      setReplyToMessage(null);
    } catch {
      setMessage(messageContent);
    }
  };

  const handleReaction = (messageId: string, reactionType: string) => {
    toggleReaction({ messageId, reactionType });
    setShowReactionPicker(null);
  };

  const handlePollCreate = async (pollData: {
    question: string;
    options: string[];
    pollType: 'multiple_choice' | 'yes_no' | 'rating';
    expiresAt?: string | null;
    isImportant?: boolean;
  }) => {
    try {
      await createPoll(pollData);
      setShowPollDialog(false);
    } catch {
      // error handled by react-query
    }
  };

  const handleNudge = async (pollId: string) => {
    await nudgePoll({ pollId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading chat...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <div className="text-center text-red-600">
          <p className="font-medium">Failed to load chat</p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <VoicePlaybackProvider>
      <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        {/* Chat Header — compact on mobile, full on desktop */}
        <div className="flex flex-row items-center justify-between px-3 py-2 md:px-6 md:py-4 bg-blue-700 md:bg-gradient-to-r md:from-blue-600 md:via-blue-700 md:to-indigo-700 shadow-md md:shadow-lg">
          <h3 className="flex items-center gap-2 md:gap-3 text-base md:text-xl font-bold text-white">
            <div className="p-1.5 md:p-2.5 bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl border border-white/30">
              <MessageCircle className="h-4 w-4 md:h-6 md:w-6 text-white flex-shrink-0" />
            </div>
            <span className="hidden md:inline">Trip Chat</span>
            <span className="md:hidden">Chat</span>
          </h3>
          <div className="flex gap-2 md:gap-3 items-center">
            {unreadCount > 0 && (
              <div className="relative">
                <Bell className="h-4 w-4 md:h-5 md:w-5 text-white" />
                <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-red-500 text-white border-0">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPollDialog(true)}
              className="h-9 w-9 p-0 md:w-auto md:px-4 md:h-auto text-white hover:bg-white/20 rounded-lg md:rounded-xl border border-white/20 transition-all duration-200"
              title="Create Poll"
            >
              <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden md:inline md:ml-2 md:text-sm font-medium">Poll</span>
            </Button>
          </div>
        </div>

        {/* Messages Container */}
        <div
          ref={messagesContainerRef}
          onScroll={() => {
            handleScroll();
            handleScrollTop();
          }}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-transparent to-white/50"
        >
          <div className="flex-1 flex flex-col p-0">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-gray-600">
                  <div className="bg-gradient-to-br from-blue-100 to-indigo-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <MessageCircle className="h-10 w-10 text-blue-600" />
                  </div>
                  <p className="text-xl font-semibold mb-3 text-gray-800">No messages yet</p>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                    Start the conversation and share your thoughts about this amazing trip!
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.message_id} className="relative">
                    <ChatMessage
                      message={msg}
                      tripId={tripId}
                      onReaction={(reactionType) => handleReaction(msg.message_id, reactionType)}
                      onReply={() => {
                        setReplyToMessage(msg.message_id);
                        // Auto-scroll to input after selecting reply
                        setTimeout(() => {
                          inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          inputRef.current?.focus();
                        }, 100);
                      }}
                      onVote={votePoll}
                      onNudge={handleNudge}
                      showReactionPicker={showReactionPicker === msg.message_id}
                      onToggleReactionPicker={() =>
                        setShowReactionPicker(
                          showReactionPicker === msg.message_id ? null : msg.message_id
                        )
                      }
                      allMessages={messages}
                    />
                  </div>
                ))
              )}

              {/* Typing Indicators */}
              {typingIndicators.length > 0 && (
                <TypingIndicator indicators={typingIndicators} />
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Reply Preview */}
          {replyToMessage && (() => {
            const repliedMsg = messages.find(m => m.message_id === replyToMessage);
            const previewName = repliedMsg?.author_name || 'someone';
            const previewText = repliedMsg
              ? repliedMsg.message_type === 'voice'
                ? 'Voice message'
                : repliedMsg.message_type === 'poll'
                  ? repliedMsg.poll_data?.question || 'Poll'
                  : repliedMsg.content.length > 60
                    ? repliedMsg.content.slice(0, 60) + '...'
                    : repliedMsg.content
              : 'Message';
            return (
              <div className="sticky bottom-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-200 p-3 sm:p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 text-sm text-blue-700 min-w-0 flex-1">
                  <div className="p-1.5 bg-blue-100 rounded-lg flex-shrink-0">
                    <Reply className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-xs">{previewName}</div>
                    <div className="text-xs opacity-70 truncate">{previewText}</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyToMessage(null)}
                  className="h-8 w-8 rounded-lg hover:bg-blue-100 text-blue-600 flex-shrink-0"
                >
                  ×
                </Button>
              </div>
            );
          })()}

          {/* Message Input — compact on mobile */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-2 py-2 md:px-4 md:py-4 shadow-lg backdrop-blur-sm z-10">
            {isOffline && (
              <div className="flex items-center gap-2 text-xs text-amber-600 mb-2">
                <WifiOff className="h-3 w-3" />
                <span className="hidden md:inline">Messages will be queued and sent when online</span>
                <span className="md:hidden">Offline — messages queued</span>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 w-full">
              <VoiceRecorderButton
                tripId={tripId}
                replyToId={replyToMessage}
                onSent={() => setReplyToMessage(null)}
              />
              <Input
                ref={inputRef}
                value={message}
                onChange={handleInputChange}
                placeholder="Message..."
                className="flex-1 rounded-full border-2 border-gray-200 px-4 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white shadow-sm transition-all duration-200"
                disabled={isSendingMessage}
                maxLength={1000}
              />
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0 shadow-md transition-all duration-200"
                disabled={!message.trim() || isSendingMessage}
              >
                {isSendingMessage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Create Poll Dialog */}
        <CreatePollDialog
          open={showPollDialog}
          onOpenChange={setShowPollDialog}
          onCreatePoll={handlePollCreate}
        />
      </div>
    </VoicePlaybackProvider>
  );
};
