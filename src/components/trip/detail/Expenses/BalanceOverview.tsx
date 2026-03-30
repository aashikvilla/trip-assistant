import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { useBalanceCalculation } from '@/hooks/useBalanceCalculation';
import { useAuth } from '@/hooks/useAuth';
import { useTripMembers } from '@/hooks/useTripMembers';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface BalanceOverviewProps {
  tripId: string;
  onSettle?: (prefill: { from_user_id: string; to_user_id: string; amount: number; description: string; date?: string }) => void;
}

export const BalanceOverview: React.FC<BalanceOverviewProps> = ({ tripId, onSettle }) => {
  const { user } = useAuth();
  const { data: balance, isLoading, isFetching } = useBalanceCalculation(tripId, user?.id) as any;
  const { data: members = [] } = useTripMembers(tripId);

  const nameMap = new Map<string, { name: string; avatar?: string }>();
  members.forEach(m => nameMap.set(m.profile_id, { name: `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Member', avatar: m.avatar_url }));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Your Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!balance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Your Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No balance information available</p>
        </CardContent>
      </Card>
    );
  }

  const { net_balance, individual_balances } = balance;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Your Balance
          {isFetching && (
            <span className="ml-2 text-xs text-muted-foreground">recalculating...</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Net Balance */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="font-medium">Net Balance</span>
          <div className="flex items-center gap-2">
            {net_balance > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : net_balance < 0 ? (
              <TrendingDown className="h-4 w-4 text-red-600" />
            ) : null}
            <span
              className={`font-semibold ${
                net_balance > 0
                  ? 'text-green-600'
                  : net_balance < 0
                  ? 'text-red-600'
                  : 'text-muted-foreground'
              }`}
            >
              ${Math.abs(net_balance).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Individual Balances redesigned */}
        {individual_balances.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Individual Balances</h4>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {individual_balances.map((b) => {
                const info = nameMap.get(b.with_user_id);
                const name = info?.name || b.with_user_name;
                const avatar = info?.avatar;
                const positive = b.amount > 0;
                return (
                  <div key={b.with_user_id} className="min-w-[220px] flex items-center gap-3 p-3 rounded-lg border bg-card">
                    {avatar ? (
                      <img src={avatar} alt={name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {name?.[0]?.toUpperCase() || '?' }
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium">{name}</div>
                      <div className={`text-xs ${positive ? 'text-green-600' : 'text-red-600'}`}>{positive ? `Owes you $${b.amount.toFixed(2)}` : `You owe $${Math.abs(b.amount).toFixed(2)}`}</div>
                    </div>
                    {!positive && onSettle && user?.id && (
                      <button
                        className="text-xs px-3 py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90"
                        onClick={() => onSettle({ from_user_id: user.id, to_user_id: b.with_user_id, amount: Math.abs(b.amount), description: 'Settling dues' })}
                      >
                        Settle
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground text-sm">All settled up! 🎉</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
