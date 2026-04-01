import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users, Clock } from 'lucide-react';
import { PollData } from '@/hooks/useTripChat';

interface PollComponentProps {
  poll: PollData;
  onVote: (data: { pollId: string; optionIndex: number; rating?: number }) => void;
  currentUserId?: string | null;
}

export const PollComponent: React.FC<PollComponentProps> = ({ poll, onVote, currentUserId }) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(1);

  // Add safety checks for poll data
  if (!poll || typeof poll !== 'object') {
    return <div className="text-red-500 text-sm">Invalid poll data</div>;
  }

  
  // Handle JSONB data from database
  let parsedOptions: string[] = [];
  if (poll.options) {
    if (typeof poll.options === 'string') {
      try {
        parsedOptions = JSON.parse(poll.options);
      } catch (e) {
        console.error('Failed to parse options JSON:', e);
        parsedOptions = [];
      }
    } else if (Array.isArray(poll.options)) {
      parsedOptions = poll.options;
    }
  }

  const totalVotes = (poll.votes || []).length;
  const userVote = (poll.votes || []).find(vote => vote.user_id === currentUserId);
  const hasVoted = !!userVote;

  const getOptionVoteCount = (optionIndex: number) => {
    return (poll.votes || []).filter(vote => vote.option_index === optionIndex).length;
  };

  const getOptionPercentage = (optionIndex: number) => {
    if (totalVotes === 0) return 0;
    return (getOptionVoteCount(optionIndex) / totalVotes) * 100;
  };

  const handleVote = () => {
    // For rating polls, we don't require selecting an option. Use optionIndex 0.
    if (poll.poll_type !== 'rating' && selectedOption === null) return;

    onVote({
      pollId: poll.poll_id,
      optionIndex: poll.poll_type === 'rating' ? 0 : (selectedOption as number),
      rating: poll.poll_type === 'rating' ? selectedRating : undefined
    });
  };

  const renderYesNoOptions = () => (
    <div className="space-y-3">
      {['Yes', 'No'].map((option, index) => {
        const voteCount = getOptionVoteCount(index);
        const percentage = getOptionPercentage(index);
        const isSelected = selectedOption === index;
        const userVotedThis = userVote?.option_index === index;

        return (
          <div key={option} className="space-y-2">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => !hasVoted && setSelectedOption(index)}
                disabled={hasVoted}
                className={`flex-1 justify-start font-medium transition-all duration-200 ${
                  isSelected 
                    ? 'bg-blue-100 border-blue-300 text-blue-800 shadow-sm' 
                    : userVotedThis 
                      ? 'bg-green-50 border-green-300 text-green-800 shadow-sm' 
                      : 'hover:bg-blue-50 hover:border-blue-300 border-blue-200 text-gray-700 hover:text-blue-800'
                }`}
              >
                {option}
                {userVotedThis && <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 text-xs">Your vote</Badge>}
              </Button>
              <span className="text-sm text-gray-500 ml-3 min-w-[60px] text-right">
                {voteCount} ({percentage.toFixed(0)}%)
              </span>
            </div>
            {hasVoted && (
              <Progress value={percentage} className="h-2" />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderMultipleChoiceOptions = () => {
    return (
      <div className="space-y-3">
        {parsedOptions.map((option, index) => {
          const voteCount = getOptionVoteCount(index);
          const percentage = getOptionPercentage(index);
          const isSelected = selectedOption === index;
          const userVotedThis = userVote?.option_index === index;

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => !hasVoted && setSelectedOption(index)}
                  disabled={hasVoted}
                  className={`flex-1 justify-start text-left font-medium transition-all duration-200 ${
                    isSelected 
                      ? 'bg-blue-100 border-blue-300 text-blue-800 shadow-sm' 
                      : userVotedThis 
                        ? 'bg-green-50 border-green-300 text-green-800 shadow-sm' 
                        : 'hover:bg-blue-50 hover:border-blue-300 border-blue-200 text-gray-700 hover:text-blue-800'
                  }`}
                >
                  <span className="truncate">{option}</span>
                  {userVotedThis && <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 text-xs">Your vote</Badge>}
                </Button>
                <span className="text-sm text-gray-500 ml-3 min-w-[60px] text-right">
                  {voteCount} ({percentage.toFixed(0)}%)
                </span>
              </div>
              {hasVoted && (
                <Progress value={percentage} className="h-2" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderRatingOptions = () => (
    <div className="space-y-4">
      <div className="text-sm text-gray-700 font-medium text-center">Rate from 1 to 5 stars:</div>
      <div className="flex items-center gap-2 justify-center">
        {[1, 2, 3, 4, 5].map((rating) => (
          <Button
            key={rating}
            variant="outline"
            size="sm"
            onClick={() => !hasVoted && setSelectedRating(rating)}
            disabled={hasVoted}
            className={`w-10 h-10 rounded-lg font-medium text-sm transition-all duration-200 ${
              selectedRating === rating 
                ? 'bg-blue-100 border-blue-300 text-blue-800 shadow-sm' 
                : 'hover:bg-blue-50 hover:border-blue-300 border-blue-200 text-gray-700 hover:text-blue-800'
            }`}
          >
            {rating}⭐
          </Button>
        ))}
      </div>
      {hasVoted && (
        <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="text-sm text-gray-700">
            Average Rating: <span className="font-medium text-yellow-700">{((poll.votes || []).reduce((sum, vote) => sum + (vote.rating || 0), 0) / totalVotes).toFixed(1)}⭐</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Card className="max-w-md bg-white/90 backdrop-blur-md border border-blue-200/30 shadow-lg shadow-blue-100/20 rounded-2xl overflow-hidden">
      <CardHeader className="pb-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 backdrop-blur-sm border-b border-blue-200/50 rounded-t-2xl">
        <p className="text-sm text-blue-900 leading-relaxed font-semibold">{poll.question}</p>
      </CardHeader>
      
      <CardContent className="space-y-5 p-5">
        {poll.poll_type === 'yes_no' && renderYesNoOptions()}
        {poll.poll_type === 'multiple_choice' && renderMultipleChoiceOptions()}
        {poll.poll_type === 'rating' && renderRatingOptions()}

        {/* Show submit for rating polls without requiring an option selection */}
        {!hasVoted && (
          poll.poll_type === 'rating'
            ? (
              <Button 
                onClick={handleVote} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 shadow-sm"
                size="sm"
              >
                Submit Rating
              </Button>
            )
            : selectedOption !== null && (
              <Button 
                onClick={handleVote} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 shadow-sm"
                size="sm"
              >
                Submit Vote
              </Button>
            )
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
          </div>
          {poll.expires_at && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Expires {new Date(poll.expires_at).toLocaleDateString()}</span>
            </div>
          )}
          {poll.is_closed && (
            <Badge variant="secondary" className="text-xs">Closed</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
