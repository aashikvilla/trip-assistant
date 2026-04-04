"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Plus, MapPin, Calendar, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { TripsList } from './TripsList';
import { CreateTripDialog } from './CreateTripDialog';
import { JoinTripDialog } from './JoinTripDialog';
import { PendingInvitations } from './PendingInvitations';
import { TravelPreferencesDialog } from '@/components/onboarding/TravelPreferencesDialog';
import Link from "next/link";
import { useDashboardStats } from '@/hooks/useDashboardStats';

const Dashboard = () => {
  const { user, showPreferences, handlePreferencesComplete } = useAuth();
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [showJoinTrip, setShowJoinTrip] = useState(false);
  const { data: stats } = useDashboardStats(user?.id);

  return (
    <div>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Trips</h1>
            <p className="text-sm text-muted-foreground">Plan and manage your adventures</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowJoinTrip(true)} className="h-9 w-9 p-0 md:w-auto md:px-4 md:gap-2" title="Join Trip">
              <Users className="h-4 w-4" />
              <span className="hidden md:inline">Join Trip</span>
            </Button>
            <Button onClick={() => setShowCreateTrip(true)} className="h-9 w-9 p-0 md:w-auto md:px-4 md:gap-2" title="New Trip">
              <Plus className="h-4 w-4" />
              <span className="hidden md:inline">New Trip</span>
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

        {/* Pending Invitations */}
        <PendingInvitations />

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
