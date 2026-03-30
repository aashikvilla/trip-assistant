import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageCircle, 
  Send, 
  BarChart3, 
  Loader2,
  Plus,
  Reply
} from 'lucide-react';
import { useTripChat } from '@/hooks/useTripChat';
import { ChatMessage } from './ChatMessage';
import { CreatePollDialog } from './CreatePollDialog';
import { ReactionPicker } from './ReactionPicker';
import { TypingIndicator } from './TypingIndicator';

interface TripChatProps {
  tripId: string;
}

export const TripChat: React.FC<TripChatProps> = ({ tripId }) => {
  const [message, setMessage] = useState('');
  const [showPollDialog, setShowPollDialog] = useState(false);
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
    updateTypingIndicator,
  } = useTripChat(tripId);

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

  // Load more messages when scrolling to top
  const handleScrollTop = () => {
    if (messagesContainerRef.current?.scrollTop === 0) {
      // TODO: Implement loading previous messages
      console.log('Load previous messages...');
    }
  };

  // Handle typing indicators
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    
    // Update typing indicator
    updateTypingIndicator(true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingIndicator(false);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSendingMessage) return;

    const messageContent = message.trim();
    setMessage('');
    
    // Stop typing indicator
    updateTypingIndicator(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      await sendMessage({
        content: messageContent,
        messageType: 'text',
        replyToId: replyToMessage
      });
      setReplyToMessage(null);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessage(messageContent); // Restore message on error
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
  }) => {
    try {
      await createPoll(pollData);
      setShowPollDialog(false);
    } catch (error) {
      console.error('Failed to create poll:', error);
    }
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
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Chat Header */}
      <div className="flex flex-row items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 shadow-lg">
        <h3 className="flex items-center gap-3 text-xl font-bold text-white">
          <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
            <MessageCircle className="h-6 w-6 text-white flex-shrink-0" />
          </div>
          <span className="sm:inline">
            <span className="sm:hidden">Chat</span>
            <span className="hidden sm:inline">Trip Chat</span>
          </span>
        </h3>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPollDialog(true)}
            className="flex items-center justify-center w-11 h-11 p-0 text-white hover:bg-white/20 hover:backdrop-blur-sm rounded-xl border border-white/20 sm:w-auto sm:px-4 sm:h-auto transition-all duration-200"
            title="Create Poll"
          >
            <BarChart3 className="h-5 w-5" />
            <span className="sr-only sm:not-sr-only sm:ml-2 sm:text-sm font-medium">Poll</span>
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
          {/* Messages Area */}
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <div className="bg-gradient-to-br from-blue-100 to-indigo-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <MessageCircle className="h-10 w-10 text-blue-600" />
                </div>
                <p className="text-xl font-semibold mb-3 text-gray-800">No messages yet</p>
                <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">Start the conversation and share your thoughts about this amazing trip!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.message_id} className="relative">
                  <ChatMessage
                    message={msg}
                    onReaction={(reactionType) => handleReaction(msg.message_id, reactionType)}
                    onReply={() => setReplyToMessage(msg.message_id)}
                    onVote={votePoll}
                    showReactionPicker={showReactionPicker === msg.message_id}
                    onToggleReactionPicker={() => 
                      setShowReactionPicker(
                        showReactionPicker === msg.message_id ? null : msg.message_id
                      )
                    }
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
        {replyToMessage && (
          <div className="sticky bottom-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-200 p-3 sm:p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 text-sm text-blue-700">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Reply className="h-4 w-4" />
              </div>
              <span className="font-medium">Replying to message</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyToMessage(null)}
              className="h-8 w-8 rounded-lg hover:bg-blue-100 text-blue-600"
            >
              ×
            </Button>
          </div>
        )}

        {/* Message Input */}
        <div className="sticky bottom-0 bg-gradient-to-r from-white via-blue-50/50 to-white border-t border-gray-200 p-4 shadow-lg backdrop-blur-sm z-10">
          <form onSubmit={handleSendMessage} className="flex items-center gap-3 w-full">
            <Input
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              placeholder="Share your thoughts about this trip..."
              className="flex-1 rounded-2xl border-2 border-gray-200 px-5 py-3 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white/80 backdrop-blur-sm shadow-sm transition-all duration-200"
              disabled={isSendingMessage}
              maxLength={1000}
            />
            <Button
              type="submit"
              size="icon"
              className="h-12 w-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex-shrink-0 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              disabled={!message.trim() || isSendingMessage}
            >
              {isSendingMessage ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
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
  );
};
