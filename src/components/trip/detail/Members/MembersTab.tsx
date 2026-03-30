import React from 'react';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { MemberList } from './MemberList';
import { useTripMembers } from '@/lib/hooks/useTripMembers';
import { useAuth } from '@/hooks/useAuth';
import { InviteMemberDialog } from '@/components/trip/InviteMemberDialog';

interface MembersTabProps {
  tripId: string;
  tripName: string;
  tripCode: string;
  isOwner: boolean;
}

export const MembersTab: React.FC<MembersTabProps> = ({
  tripId,
  tripName,
  tripCode,
  isOwner,
}) => {
  const { user } = useAuth();
  const [showInviteDialog, setShowInviteDialog] = React.useState(false);
  const { data: members, isLoading } = useTripMembers(tripId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Trip Members</h3>
          <p className="text-sm text-muted-foreground">
            Manage who has access to this trip
          </p>
        </div>
        {isOwner && (
          <Button
            size="sm"
            onClick={() => setShowInviteDialog(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Invite
          </Button>
        )}
      </div>

      <MemberList 
        members={members || []} 
        currentUserId={user?.id || ''}
        isLoading={isLoading}
      />

      <InviteMemberDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        tripId={tripId}
        tripName={tripName}
        tripCode={tripCode}
      />
    </div>
  );
};
