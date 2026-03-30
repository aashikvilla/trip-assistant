
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Plus, MapPin, Calendar, Users, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { TripsList } from './TripsList';
import { CreateTripDialog } from './CreateTripDialog';
import { JoinTripDialog } from './JoinTripDialog';
import { TravelPreferencesDialog } from '@/components/onboarding/TravelPreferencesDialog';
import { Link } from 'react-router-dom';
import { useDashboardStats } from '@/hooks/useDashboardStats';

const Dashboard = () => {
  const { signOut, user, showPreferences, handlePreferencesComplete } = useAuth();
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [showJoinTrip, setShowJoinTrip] = useState(false);
  const { data: stats } = useDashboardStats(user?.id);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">Vibe Trip</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" asChild>
                <Link to="/settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Trips</h1>
            <p className="text-muted-foreground">Plan and manage your adventures</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowJoinTrip(true)} className="gap-2">
              <Users className="h-4 w-4" />
              Join Trip
            </Button>
            <Button onClick={() => setShowCreateTrip(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Trip
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Trips</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.upcomingTripsCount ?? '—'}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.nextTripDays != null ? `Next trip in ${stats.nextTripDays} days` : 'No upcoming trips'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Places Visited</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.placesVisitedCount ?? '—'}</div>
              <p className="text-xs text-muted-foreground">Total activities across your trips</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Travel Buddies</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.travelBuddiesCount ?? '—'}</div>
              <p className="text-xs text-muted-foreground">Active connections</p>
            </CardContent>
          </Card>
        </div>

        {/* Trips List */}
        <TripsList />

        {/* Create Trip Dialog */}
        <CreateTripDialog 
          open={showCreateTrip} 
          onOpenChange={setShowCreateTrip}
        />

        {/* Join Trip Dialog */}
        <JoinTripDialog
          open={showJoinTrip}
          onOpenChange={setShowJoinTrip}
        />

        {/* Travel Preferences Dialog */}
        {user && showPreferences && (
          <TravelPreferencesDialog
            open={showPreferences}
            onComplete={handlePreferencesComplete}
            userId={user.id}
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
