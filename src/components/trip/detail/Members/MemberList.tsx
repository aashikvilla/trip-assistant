import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface MemberProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

interface Member extends MemberProfile {
  role: 'owner' | 'editor' | 'viewer';
  profile_id: string;
}

interface MemberListProps {
  members: Member[];
  currentUserId: string;
  isLoading?: boolean;
}

export const MemberList: React.FC<MemberListProps> = ({ 
  members, 
  currentUserId,
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gray-200"></div>
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
                <div className="h-3 w-20 bg-gray-100 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No members found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {members.map((member) => {
        const displayName = member.first_name 
          ? `${member.first_name}${member.last_name ? ` ${member.last_name}` : ''}`
          : `User ${member.profile_id.slice(0, 6)}`;
          
        const avatarInitial = displayName[0]?.toUpperCase() || 'U';
        
        return (
          <div 
            key={member.id} 
            className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-100"
          >
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={member.avatar_url} alt={displayName} />
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {avatarInitial}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-gray-900">{displayName}</p>
                <p className="text-sm text-gray-500 capitalize">{member.role}</p>
              </div>
            </div>
            <Badge
              variant={member.role === 'owner' ? 'default' : 'outline'}
              className={member.role === 'owner' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {member.role}
            </Badge>
          </div>
        );
      })}
    </div>
  );
};
