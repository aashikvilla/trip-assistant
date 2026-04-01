import React, { useState } from 'react';
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/skeleton';
import { TabContent, TabCard } from '@/components/trip/detail/Common/TabContent';
import {
  ArrowLeft,
  Calendar,
  CalendarRange,
  MapPin,
  Users,
  Hotel,
  DollarSign,
  Plus,
  Edit,
  MessageSquare,
  Sparkles,
  Loader2,
} from 'lucide-react';

// Import components
import { MembersTab } from '@/components/trip/detail/Members/MembersTab';
import { useAuth } from '@/hooks/useAuth';
import { useTripMembers } from '@/hooks/useTripMembers';

// Types
type TabType = 'itinerary' | 'chat' | 'bookings' | 'expenses' | 'members';

interface TripHeaderProps {
  trip: {
    id: string;
    name: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    destination?: string;
    destination_main?: string;
    trip_code?: string;
  };
  isOwner: boolean;
  onEditClick: () => void;
}

const TripHeader: React.FC<TripHeaderProps> = ({ trip, isOwner, onEditClick }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{trip.name}</h1>
        {trip.destination_main && (
          <div className="flex items-center text-sm text-muted-foreground mt-1">
            <MapPin className="mr-1 h-4 w-4" />
            {trip.destination_main}
          </div>
        )}
      </div>
      {isOwner && (
        <Button variant="outline" size="sm" onClick={onEditClick}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Trip
        </Button>
      )}
    </div>

    {(trip.start_date || trip.end_date) && (
      <div className="flex items-center space-x-4 text-sm">
        {trip.start_date && (
          <div className="flex items-center">
            <Calendar className="mr-2 h-4 w-4 opacity-70" />
            {format(new Date(trip.start_date), 'MMM d, yyyy')}
          </div>
        )}
        {trip.start_date && trip.end_date && (
          <span className="text-muted-foreground">to</span>
        )}
        {trip.end_date && (
          <div className="flex items-center">
            <CalendarRange className="mr-2 h-4 w-4 opacity-70" />
            {format(new Date(trip.end_date), 'MMM d, yyyy')}
          </div>
        )}
      </div>
    )}

    {trip.description && (
      <p className="text-muted-foreground mt-2">{trip.description}</p>
    )}
  </div>
);

const TripDetailPage: React.FC = () => {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('itinerary');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Fetch trip data
  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch trip members
  const { data: members } = useTripMembers(id);
  
  // Check if current user is the owner
  const isOwner = React.useMemo(() => {
    if (!user || !members) return false;
    return members.some(
      (member) => 
        member.profile_id === user.id && 
        member.role === 'owner'
    );
  }, [user, members]);

  if (isLoading || !trip) {
    return (
      <div className="container py-8">
        <div className="flex items-center space-x-2 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/trips">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/trips">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to trips</span>
            </Link>
          </Button>
          <TripHeader 
            trip={trip} 
            isOwner={isOwner} 
            onEditClick={() => setShowEditDialog(true)} 
          />
        </div>

        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as TabType)}
          className="space-y-6"
        >
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger 
              value="itinerary" 
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Itinerary
            </TabsTrigger>
            <TabsTrigger 
              value="chat" 
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger 
              value="bookings" 
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none"
            >
              <Hotel className="mr-2 h-4 w-4" />
              Bookings
            </TabsTrigger>
            <TabsTrigger 
              value="expenses" 
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Expenses
            </TabsTrigger>
            <TabsTrigger 
              value="members" 
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none"
            >
              <Users className="mr-2 h-4 w-4" />
              Members
            </TabsTrigger>
          </TabsList>

          <div className="space-y-6">
            <TabsContent value="itinerary" className="space-y-6">
              <TabContent 
                title="Trip Itinerary"
                description="View and manage your trip itinerary"
                action={
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Activity
                  </Button>
                }
              >
                <TabCard title="Daily Schedule">
                  {/* Itinerary content will go here */}
                  <div className="py-4 text-center text-muted-foreground">
                    <p>No activities planned yet.</p>
                  </div>
                </TabCard>
              </TabContent>
            </TabsContent>

            <TabsContent value="chat" className="space-y-6">
              <TabContent 
                title="Trip Chat"
                description="Chat with your trip members"
              >
                <TabCard title="Group Chat">
                  <div className="py-8 text-center text-muted-foreground">
                    <MessageSquare className="mx-auto h-12 w-12 opacity-20 mb-2" />
                    <p>Send a message to start the conversation</p>
                  </div>
                </TabCard>
              </TabContent>
            </TabsContent>

            <TabsContent value="bookings" className="space-y-6">
              <TabContent 
                title="Bookings"
                description="Manage your trip bookings"
                action={
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Booking
                  </Button>
                }
              >
                <TabCard title="Your Bookings">
                  <div className="py-8 text-center text-muted-foreground">
                    <Hotel className="mx-auto h-12 w-12 opacity-20 mb-2" />
                    <p>No bookings added yet</p>
                  </div>
                </TabCard>
              </TabContent>
            </TabsContent>

            <TabsContent value="expenses" className="space-y-6">
              <TabContent 
                title="Expenses"
                description="Track and split expenses with your group"
                action={
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Expense
                  </Button>
                }
              >
                <TabCard title="Expense Summary">
                  <div className="py-8 text-center text-muted-foreground">
                    <DollarSign className="mx-auto h-12 w-12 opacity-20 mb-2" />
                    <p>No expenses added yet</p>
                  </div>
                </TabCard>
              </TabContent>
            </TabsContent>

            <TabsContent value="members" className="space-y-6">
              <TabContent title="Trip Members">
                <MembersTab 
                  tripId={trip.id} 
                  tripName={trip.name} 
                  tripCode={trip.trip_code || ''}
                  isOwner={isOwner}
                />
              </TabContent>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default TripDetailPage;
