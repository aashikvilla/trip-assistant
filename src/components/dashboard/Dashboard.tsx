"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Plus, MapPin, Calendar, Users, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { TripsList } from './TripsList';
import { CreateTripDialog } from './CreateTripDialog';
import { JoinTripDialog } from './JoinTripDialog';
import { PendingInvitations } from './PendingInvitations';
import { TravelPreferencesDialog } from '@/components/onboarding/TravelPreferencesDialog';
import Link from "next/link";
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
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">Vibe Trip</span>
            </div>

            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Icon-only on mobile, labeled on desktop */}
              <Button variant="outline" size="sm" asChild className="h-9 w-9 p-0 md:w-auto md:px-3" title="Settings">
                <Link href="/settings">
                  <Settings className="h-4 w-4" />
                  <span className="hidden md:inline md:ml-2">Settings</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut} className="h-9 w-9 p-0 md:w-auto md:px-3" title="Sign Out">
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline md:ml-2">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="flex items-center justify-between mb-4 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Trips</h1>
            <p className="text-sm text-muted-foreground">Plan and manage your adventures</p>
          </div>

          <div className="flex gap-2">
            {/* Icon-only on mobile, labeled on desktop */}
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

        {/* Quick Stats — 3-col on mobile, 3-col on desktop */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-8">
          <Card className="p-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3 md:pb-2 md:pt-4 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">Upcoming</CardTitle>
              <Calendar className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
              <div className="text-xl md:text-2xl font-bold">{stats?.upcomingTripsCount ?? '—'}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground leading-tight">
                {stats?.nextTripDays != null ? `In ${stats.nextTripDays}d` : 'None'}
              </p>
            </CardContent>
          </Card>

          <Card className="p-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3 md:pb-2 md:pt-4 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">Places</CardTitle>
              <MapPin className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
              <div className="text-xl md:text-2xl font-bold">{stats?.placesVisitedCount ?? '—'}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground leading-tight">Activities</p>
            </CardContent>
          </Card>

          <Card className="p-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3 md:pb-2 md:pt-4 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">Buddies</CardTitle>
              <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
              <div className="text-xl md:text-2xl font-bold">{stats?.travelBuddiesCount ?? '—'}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground leading-tight">Connections</p>
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
