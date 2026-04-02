import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Bell } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';

interface Member {
  user_id: string;
  user_name: string;
}

interface NonRespondersPanelProps {
  members: Member[];
  votes: { user_id: string }[];
  isClosed: boolean;
  nudgeCooldownUntil: string | null;
  onNudge?: () => Promise<void>;
  isNudging?: boolean;
}

function getRemainingCooldown(until: string | null): string | null {
  if (!until) return null;
  const diff = new Date(until).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export const NonRespondersPanel: React.FC<NonRespondersPanelProps> = ({
  members,
  votes,
  isClosed,
  nudgeCooldownUntil,
  onNudge,
  isNudging,
}) => {
  const [open, setOpen] = useState(false);

  const votedIds = new Set(votes.map(v => v.user_id));
  const nonResponders = members.filter(m => !votedIds.has(m.user_id));

  const cooldown = getRemainingCooldown(nudgeCooldownUntil);
  const canNudge = !isClosed && nonResponders.length > 0 && !cooldown;

  if (nonResponders.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
        <span>Everyone has responded</span>
      </div>
    );
  }

  return (
    <div className="border border-amber-200 rounded-lg bg-amber-50/60 overflow-hidden">
      <button
        className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100/60 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span>
          Non-Responders
          <Badge variant="secondary" className="ml-2 text-xs bg-amber-100 text-amber-700 border-amber-300">
            {nonResponders.length}
          </Badge>
        </span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          <div className="space-y-1">
            {nonResponders.map(m => (
              <div key={m.user_id} className="text-xs text-amber-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                {m.user_name}
              </div>
            ))}
          </div>

          {onNudge && !isClosed && (
            cooldown ? (
              <p className="text-xs text-gray-500">Next nudge in {cooldown}</p>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={onNudge}
                disabled={isNudging || !canNudge}
              >
                <Bell className="h-3 w-3 mr-1" />
                {isNudging ? 'Sending…' : 'Nudge Non-Responders'}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
};
