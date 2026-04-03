import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  MapPin,
  Calendar,
  Users,
  Check,
  X,
  Loader2,
  Clock,
} from 'lucide-react';
import { usePendingInvitations, PendingInvitation } from '@/hooks/usePendingInvitations';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';

export const PendingInvitations: React.FC = () => {
  const { invitations, isLoading, acceptInvitation, isAccepting, declineInvitation, isDeclining } =
    usePendingInvitations();
  const { toast } = useToast();
  const router = useRouter();

  const handleAccept = async (inv: PendingInvitation) => {
    try {
      const result = await acceptInvitation(inv.invitation_token);
      toast({
        title: 'Welcome!',
        description: `You've joined "${inv.trip_name}"`,
      });
      if (result.trip_id) {
        router.push(`/trips/${result.trip_id}`);
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to accept invitation',
        variant: 'destructive',
      });
    }
  };

  const handleDecline = async (inv: PendingInvitation) => {
    try {
      await declineInvitation(inv.id);
      toast({ title: 'Declined', description: `Invitation to "${inv.trip_name}" declined.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to decline invitation', variant: 'destructive' });
    }
  };

  if (isLoading) return null;
  if (invitations.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold">Pending Invitations</h2>
        <Badge variant="secondary" className="text-xs">
          {invitations.length}
        </Badge>
      </div>

      <div className="space-y-3">
        {invitations.map((inv) => (
          <Card key={inv.id} className="border-blue-200/50 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                {/* Trip info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate">{inv.trip_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Invited by {inv.invited_by_name}
                  </p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                    {inv.trip_destination && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {inv.trip_destination}
                      </span>
                    )}
                    {inv.trip_start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(inv.trip_start_date), 'MMM d')}
                        {inv.trip_end_date && ` – ${format(new Date(inv.trip_end_date), 'MMM d')}`}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {inv.member_count} member{inv.member_count !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expires {formatDistanceToNow(new Date(inv.expires_at), { addSuffix: true })}
                    </span>
                  </div>

                  <Badge variant="secondary" className="mt-2 capitalize text-xs">
                    Join as {inv.role}
                  </Badge>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(inv)}
                    disabled={isAccepting || isDeclining}
                    className="gap-1"
                  >
                    {isAccepting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDecline(inv)}
                    disabled={isAccepting || isDeclining}
                    className="gap-1 text-muted-foreground hover:text-destructive"
                  >
                    {isDeclining ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                    Decline
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
