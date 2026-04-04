import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  ThumbsUp, 
  Laugh, 
  Reply, 
  MoreHorizontal,
  BarChart3 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ChatMessage as ChatMessageType, PollData, VoiceMetadata } from '@/hooks/useTripChat';
import { PollComponent } from './PollComponent';
import { VoicePlayer } from './VoicePlayer';
import { ReactionPicker } from './ReactionPicker';
import { useAuth } from '@/hooks/useAuth';

// Utility functions
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const REACTION_EMOJIS: Record<string, string> = {
  like: '👍',
  love: '❤️',
  laugh: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😠',
  thumbs_up: '👍',
  thumbs_down: '👎',
  fire: '🔥',
  party: '🎉'
};

const getReactionEmoji = (reactionType: string) => {
  return REACTION_EMOJIS[reactionType] || '👍';
};

interface ChatMessageProps {
  message: ChatMessageType;
  tripId: string;
  onReaction: (reactionType: string) => void;
  onReply: () => void;
  onVote: (data: { pollId: string; optionIndex: number; rating?: number }) => void;
  onNudge?: (pollId: string) => Promise<void>;
  showReactionPicker: boolean;
  onToggleReactionPicker: () => void;
  allMessages?: ChatMessageType[];
};

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  tripId,
  onReaction,
  onReply,
  onVote,
  onNudge,
  showReactionPicker,
  onToggleReactionPicker,
  allMessages = [],
}) => {
  const { user } = useAuth();
  const isOwnMessage = user?.id === message.author_id;
  
  const handleQuickReaction = (reactionType: string) => {
    onReaction(reactionType);
  };

  const renderReactions = () => (
    message.reactions && message.reactions.length > 0 && (
      <div className={`flex flex-wrap gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
        {message.reactions.map((reaction) => (
          <Badge
            key={reaction.reaction_type}
            variant={reaction.user_reacted ? "default" : "secondary"}
            className="text-xs px-2 py-0 cursor-pointer hover:bg-gray-200 bg-white text-gray-700 border border-gray-300 rounded-full"
            onClick={() => onReaction(reaction.reaction_type)}
          >
            {getReactionEmoji(reaction.reaction_type)} {reaction.count}
          </Badge>
        ))}
      </div>
    )
  );

  const renderQuickReactions = () => (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {['like', 'love', 'laugh'].map((reactionType) => (
        <Button
          key={reactionType}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-gray-100"
          onClick={() => handleQuickReaction(reactionType)}
        >
          {REACTION_EMOJIS[reactionType]}
        </Button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-gray-100"
        onClick={onToggleReactionPicker}
      >
        <MoreHorizontal className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-gray-100"
        onClick={onReply}
      >
        <Reply className="h-3 w-3" />
      </Button>
    </div>
  );

  const renderAvatar = () => (
    <div className="relative w-8 h-8 flex-shrink-0 mt-1 rounded-full overflow-hidden bg-gray-100">
      {message.author_avatar ? (
        <img 
          src={message.author_avatar} 
          alt={message.author_name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
      ) : null}
      <div className={`w-full h-full flex items-center justify-center bg-gradient-hero text-white text-xs ${message.author_avatar ? 'hidden' : ''}`}>
        {getInitials(message.author_name || 'U')}
      </div>
    </div>
  );

  return (
    <div className={`flex gap-3 mb-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      {!isOwnMessage && renderAvatar()}
      
      <div className={`flex flex-col max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        {!isOwnMessage && (
          <span className="text-xs text-gray-600 mb-2 px-3 font-semibold">
            {message.author_name}
          </span>
        )}
        
        <div className={`relative rounded-2xl px-4 py-3 max-w-full shadow-sm backdrop-blur-sm overflow-hidden ${
          isOwnMessage 
            ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white rounded-br-md' 
            : 'bg-gradient-to-br from-blue-50 via-white to-blue-100/80 text-gray-800 rounded-bl-md border border-blue-200/60'
        }`}>
          {message.message_type === 'image' && message.content && (
            <div className="mb-2 rounded-md overflow-hidden">
              <img 
                src={message.content} 
                alt="Shared content"
                className="max-w-full max-h-64 object-contain rounded"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.alt = 'Failed to load image';
                  target.classList.add('bg-gray-100', 'p-4');
                }}
              />
            </div>
          )}
          {message.reply_to_id && (() => {
            const repliedMsg = allMessages.find(m => m.message_id === message.reply_to_id);
            const previewName = repliedMsg?.author_name || 'someone';
            const previewText = repliedMsg
              ? repliedMsg.message_type === 'voice'
                ? 'Voice message'
                : repliedMsg.message_type === 'poll'
                  ? repliedMsg.poll_data?.question || 'Poll'
                  : repliedMsg.content.length > 80
                    ? repliedMsg.content.slice(0, 80) + '...'
                    : repliedMsg.content
              : 'Deleted message';
            return (
              <div className={`mb-3 p-2.5 rounded-xl text-xs border-l-4 ${
                isOwnMessage
                  ? 'bg-blue-700/30 border-blue-300 text-blue-100'
                  : 'bg-blue-50 border-blue-300 text-blue-700'
              }`}>
                <div className="font-semibold mb-0.5 flex items-center gap-1">
                  <Reply className="h-3 w-3" />
                  {previewName}
                </div>
                <p className="opacity-80 truncate">{previewText}</p>
              </div>
            );
          })()}
          
          <div className="space-y-2">
            {message.message_type === 'voice' && message.metadata ? (
              <VoicePlayer
                messageId={message.message_id}
                audioUrl={(message.metadata as VoiceMetadata).audio_url}
                durationSeconds={(message.metadata as VoiceMetadata).duration_seconds}
                waveformData={(message.metadata as VoiceMetadata).waveform_data}
                isOwnMessage={isOwnMessage}
              />
            ) : message.message_type !== 'poll' ? (
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
            ) : null}

            {message.message_type === 'poll' && message.poll_data && (
              <PollComponent
                poll={message.poll_data}
                tripId={tripId}
                onVote={onVote}
                onNudge={onNudge}
                currentUserId={user?.id ?? null}
              />
            )}
          </div>
          
          <div className="flex items-center justify-between mt-3 text-xs">
            <span className={isOwnMessage ? 'text-blue-100' : 'text-gray-500'}>
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
              {message.is_edited && ' (edited)'}
            </span>
            
            <div className="flex items-center gap-2 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onReply}
                className={`h-7 w-7 p-0 rounded-lg opacity-70 hover:opacity-100 transition-all duration-200 ${
                  isOwnMessage ? 'hover:bg-blue-700/30 text-blue-100' : 'hover:bg-blue-50 text-blue-600'
                }`}
              >
                <Reply className="h-3 w-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleReactionPicker}
                className={`h-7 w-7 p-0 rounded-lg opacity-70 hover:opacity-100 transition-all duration-200 ${
                  isOwnMessage ? 'hover:bg-blue-700/30 text-blue-100' : 'hover:bg-blue-50 text-blue-600'
                }`}
              >
                <Heart className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={`flex flex-wrap gap-2 mt-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            {message.reactions.map((reaction) => (
              <Badge
                key={reaction.reaction_type}
                variant={reaction.user_reacted ? "default" : "secondary"}
                className={`text-xs px-3 py-1.5 cursor-pointer transition-all duration-200 rounded-full shadow-sm ${
                  reaction.user_reacted 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600' 
                    : 'bg-white/80 text-gray-700 border border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                }`}
                onClick={() => onReaction(reaction.reaction_type)}
              >
                {getReactionEmoji(reaction.reaction_type)} {reaction.count}
              </Badge>
            ))}
          </div>
        )}
        
        {/* Reaction Picker */}
        {showReactionPicker && (
          <div className={`relative ${isOwnMessage ? 'self-end' : 'self-start'}`}>
            <ReactionPicker
              onReaction={onReaction}
              onClose={onToggleReactionPicker}
            />
          </div>
        )}
      </div>
    </div>
  );
};
