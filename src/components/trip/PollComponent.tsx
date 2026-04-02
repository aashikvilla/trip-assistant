import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users, Star } from 'lucide-react';
import { PollData } from '@/hooks/useTripChat';
import { CountdownTimer } from './CountdownTimer';
import { NonRespondersPanel } from './NonRespondersPanel';
import { usePollMembers } from '@/hooks/usePollMembers';
import { useToast } from '@/hooks/use-toast';

interface PollComponentProps {
  poll: PollData;
  tripId: string;
  onVote: (data: { pollId: string; optionIndex: number; rating?: number }) => void;
  onNudge?: (pollId: string) => Promise<void>;
  currentUserId?: string | null;
  isNudging?: boolean;
}

export const PollComponent: React.FC<PollComponentProps> = ({
  poll,
  tripId,
  onVote,
  onNudge,
  currentUserId,
  isNudging,
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(1);
  const [voteError, setVoteError] = useState<string | null>(null);
  const { members } = usePollMembers(tripId);
  const { toast } = useToast();

  if (!poll || typeof poll !== 'object') {
    return <div className="text-red-500 text-sm">Invalid poll data</div>;
  }

  let parsedOptions: string[] = [];
  if (poll.options) {
    if (typeof poll.options === 'string') {
      try { parsedOptions = JSON.parse(poll.options); } catch { parsedOptions = []; }
    } else if (Array.isArray(poll.options)) {
      parsedOptions = poll.options;
    }
  }

  const totalVotes = (poll.votes || []).length;
  const userVote = (poll.votes || []).find(vote => vote.user_id === currentUserId);
  const hasVoted = !!userVote;
  const isCreator = currentUserId === poll.creator_id;
  const isClosed = poll.is_closed;

  const getOptionVoteCount = (optionIndex: number) =>
    (poll.votes || []).filter(v => v.option_index === optionIndex).length;

  const getOptionPercentage = (optionIndex: number) =>
    totalVotes === 0 ? 0 : (getOptionVoteCount(optionIndex) / totalVotes) * 100;

  const handleVote = () => {
    if (isClosed) {
      setVoteError('This poll is closed.');
      return;
    }
    if (poll.poll_type !== 'rating' && selectedOption === null) return;
    setVoteError(null);
    try {
      onVote({
        pollId: poll.poll_id,
        optionIndex: poll.poll_type === 'rating' ? 0 : (selectedOption as number),
        rating: poll.poll_type === 'rating' ? selectedRating : undefined,
      });
    } catch {
      setVoteError('Failed to submit vote. Please try again.');
    }
  };

  const handleNudge = async () => {
    if (!onNudge) return;
    try {
      await onNudge(poll.poll_id);
      toast({ title: 'Nudge sent', description: 'Non-responders have been notified.' });
    } catch (err: any) {
      if (err?.status === 429) {
        toast({ title: 'Rate limited', description: `Next nudge allowed in ${err.retryAfter ?? 'some time'}.`, variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Failed to send nudge.', variant: 'destructive' });
      }
    }
  };

  const renderOptionButton = (label: string, index: number) => {
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
            onClick={() => !hasVoted && !isClosed && setSelectedOption(index)}
            disabled={hasVoted || isClosed}
            className={`flex-1 justify-start font-medium transition-all duration-200 ${
              isSelected
                ? 'bg-blue-100 border-blue-300 text-blue-800 shadow-sm'
                : userVotedThis
                  ? 'bg-green-50 border-green-300 text-green-800 shadow-sm'
                  : 'hover:bg-blue-50 hover:border-blue-300 border-blue-200 text-gray-700 hover:text-blue-800'
            }`}
          >
            <span className="truncate">{label}</span>
            {userVotedThis && (
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 text-xs">Your vote</Badge>
            )}
          </Button>
          <span className="text-sm text-gray-500 ml-3 min-w-[60px] text-right">
            {voteCount} ({percentage.toFixed(0)}%)
          </span>
        </div>
        {hasVoted && <Progress value={percentage} className="h-2" />}
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
            onClick={() => !hasVoted && !isClosed && setSelectedRating(rating)}
            disabled={hasVoted || isClosed}
            className={`w-10 h-10 rounded-lg font-medium text-sm transition-all duration-200 ${
              selectedRating === rating
                ? 'bg-blue-100 border-blue-300 text-blue-800 shadow-sm'
                : 'hover:bg-blue-50 hover:border-blue-300 border-blue-200 text-gray-700'
            }`}
          >
            {rating}⭐
          </Button>
        ))}
      </div>
      {hasVoted && (
        <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="text-sm text-gray-700">
            Average Rating:{' '}
            <span className="font-medium text-yellow-700">
              {((poll.votes || []).reduce((s, v) => s + (v.rating || 0), 0) / totalVotes).toFixed(1)}⭐
            </span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Card className="max-w-md bg-white/90 backdrop-blur-md border border-blue-200/30 shadow-lg shadow-blue-100/20 rounded-2xl overflow-hidden">
      <CardHeader className="pb-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 backdrop-blur-sm border-b border-blue-200/50 rounded-t-2xl">
        <div className="flex items-start gap-2">
          <p className="text-sm text-blue-900 leading-relaxed font-semibold flex-1">{poll.question}</p>
          {poll.is_important && (
            <Badge className="flex-shrink-0 flex items-center gap-1 bg-amber-100 text-amber-700 border-amber-300 text-xs">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              Important
            </Badge>
          )}
        </div>
        {isClosed && (
          <Badge variant="secondary" className="self-start mt-1 text-xs">Closed</Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        {/* Poll options */}
        {poll.poll_type === 'yes_no' && (
          <div className="space-y-3">
            {renderOptionButton('Yes', 0)}
            {renderOptionButton('No', 1)}
          </div>
        )}
        {poll.poll_type === 'multiple_choice' && (
          <div className="space-y-3">
            {parsedOptions.map((opt, i) => renderOptionButton(opt, i))}
          </div>
        )}
        {poll.poll_type === 'rating' && renderRatingOptions()}

        {/* Closed message */}
        {isClosed && !hasVoted && (
          <p className="text-xs text-gray-500 text-center">This poll is closed.</p>
        )}

        {/* Vote error */}
        {voteError && (
          <p className="text-xs text-red-500">{voteError}</p>
        )}

        {/* Submit button */}
        {!hasVoted && !isClosed && (
          poll.poll_type === 'rating' ? (
            <Button
              onClick={handleVote}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              Submit Rating
            </Button>
          ) : selectedOption !== null ? (
            <Button
              onClick={handleVote}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              Submit Vote
            </Button>
          ) : null
        )}

        {/* Countdown timer */}
        {poll.expires_at && !isClosed && (
          <CountdownTimer expiresAt={poll.expires_at} />
        )}

        {/* Non-responders panel (creator only, important polls) */}
        {poll.is_important && isCreator && (
          <NonRespondersPanel
            members={members}
            votes={poll.votes || []}
            isClosed={isClosed}
            nudgeCooldownUntil={poll.nudge_cooldown_until}
            onNudge={onNudge ? handleNudge : undefined}
            isNudging={isNudging}
          />
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
          </div>
          {poll.expires_at && (
            <span>Expires {new Date(poll.expires_at).toLocaleDateString()}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
