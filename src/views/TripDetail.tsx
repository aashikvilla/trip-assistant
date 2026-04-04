"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  CalendarRange,
  MapPin,
  MessageSquare,
  Users,
  Hotel,
  DollarSign,
  Plus,
  Edit,
  Sparkles,
  Loader2,
  XCircle,
} from "lucide-react";
import { InviteMemberDialog } from "@/components/trip/InviteMemberDialog";
import { TripEditDialog } from "@/components/trip/TripEditDialog";
import { TripChat } from "@/components/trip/TripChat";
import { SimpleItineraryCalendar } from "@/components/calendar/SimpleItineraryCalendar";
import { ItineraryItemDialog } from "@/components/itinerary/ItineraryItemDialog";
import { ItineraryItemDetailsDialog } from "@/components/itinerary/ItineraryItemDetailsDialog";
import { useItineraryStream } from "@/hooks/useItineraryStream";
import { useItineraryStatus } from "@/hooks/useItineraryStatus";
import { ItineraryStatusNotification } from "@/components/itinerary/ItineraryStatusNotification";
import { StreamingThinkingPanel } from "@/components/itinerary/StreamingThinkingPanel";
import { PartialDayCard } from "@/components/itinerary/PartialDayCard";
import { ExpensesTab } from "@/components/trip/detail/Expenses/ExpensesTab";
import { BookingsTab } from "@/components/trip/detail/Bookings/BookingsTab";
import type { Tables } from "@/integrations/supabase/types";
import { MobileBottomNav, type TabId } from "@/components/trip/MobileBottomNav";
import { DownloadTripButton } from "@/components/pwa/DownloadTripButton";
import { OfflineStorageInfo } from "@/components/pwa/OfflineStorageInfo";
import { useConnectivity } from "@/hooks/useConnectivity";
import { useOfflineStore } from "@/hooks/useOfflineStore";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

// Define a type for JSON fields that can be stored in the database
type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

// Define Profile interface
interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

// Define TripMember interface
interface TripMember {
  id: string;
  role: "owner" | "editor" | "viewer";
  profile_id: string;
  profiles?: Profile;
}

// Define types for database responses
interface Booking {
  id: string;
  confirmation_code: string | null;
  created_at: string;
  created_by: string;
  currency: string | null;
  details: Record<string, unknown>;
  end_time: string | null;
  price: number;
  provider: string;
  start_time: string;
  trip_id: string;
  type: "flight" | "hotel" | "car" | "activity" | "other";
  updated_at: string;
}

// Type for raw booking data from Supabase
type RawBooking = Omit<Booking, "details"> & {
  details: unknown;
};

// Define Expense interface
interface Expense {
  id: string;
  amount: number;
  created_at: string;
  currency: string;
  description: string;
  details: Record<string, unknown>;
  incurred_on: string;
  paid_by: string;
  trip_id: string;
  updated_at: string;
  split_between: string[];
  category: string;
}

// Type for raw expense data from Supabase
type RawExpense = Omit<Expense, "details" | "split_between" | "category"> & {
  details?: unknown;
  split_between?: unknown;
  category?: string | null;
};

// Define TripData interface
interface TripData {
  id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  destination?: string;
  destination_main?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  trip_code?: string;
  trip_members: TripMember[];
  ai_itinerary_data?: JsonValue;
  itinerary_status?:
    | "draft"
    | "generating"
    | "ready"
    | "error"
    | "failed"
    | "completed"
    | string;
  expenses: Expense[];
  bookings: Booking[];
  itinerary_items?: Array<{
    id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time?: string;
    location?: string;
    type: string;
  }>;
}

const TripDetail = () => {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("itinerary");
  const [isStandalone, setIsStandalone] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const { events, status: streamStatus, itinerary: streamingItinerary, error: streamError, startStream, cancel } = useItineraryStream();
  const isGenerating = streamStatus === "streaming";
  const { data: itineraryStatus } = useItineraryStatus(id || "");
  const { isOffline } = useConnectivity();
  const { get: getOfflineTrip } = useOfflineStore();
  const [offlineData, setOfflineData] = useState<Awaited<ReturnType<typeof getOfflineTrip>>>(undefined);

  useEffect(() => {
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
  }, []);

  useEffect(() => {
    if (isOffline && id) {
      getOfflineTrip(id).then(setOfflineData);
    }
  }, [isOffline, id, getOfflineTrip]);

  usePullToRefresh({
    onRefresh: () => queryClient.invalidateQueries({ queryKey: ["trip", id] }),
    containerRef: contentRef as React.RefObject<HTMLElement>,
  });

  React.useEffect(() => {
    if (itineraryStatus?.job_status === 'completed' || itineraryStatus?.job_status === 'failed') {
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
    }
  }, [itineraryStatus?.job_status, queryClient, id]);

  // Invalidate queries when stream completes so calendar reloads
  React.useEffect(() => {
    if (streamStatus === "complete") {
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      queryClient.invalidateQueries({ queryKey: ["itinerary-status", id] });
    }
  }, [streamStatus, queryClient, id]);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedItem, setSelectedItem] =
    useState<Tables<"itinerary_items"> | null>(null);

  const handleDeleteItem = async (item: Tables<"itinerary_items">) => {
    try {
      const { error } = await supabase
        .from("itinerary_items")
        .delete()
        .eq("id", item.id);
      if (error) throw error;
      setShowDetailsDialog(false);
      setSelectedItem(null);
      // Invalidate related queries to refresh UI
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["trip", id] }),
        queryClient.invalidateQueries({ queryKey: ["itinerary-items", id] }),
      ]);
    } catch (e) {
      console.error("Failed to delete item", e);
    }
  };

  const { data: trip, isLoading } = useQuery<TripData | null>({
    queryKey: ["trip", id],
    enabled: !!id && !isOffline,
    placeholderData: isOffline && offlineData
      ? {
          id: offlineData.tripId,
          name: "Trip (offline)",
          created_at: "",
          updated_at: "",
          created_by: "",
          trip_members: offlineData.members as TripMember[],
          expenses: offlineData.expenses as Expense[],
          bookings: offlineData.bookings as Booking[],
          itinerary_items: offlineData.itinerary as TripData["itinerary_items"],
        }
      : undefined,
    queryFn: async () => {
      if (!id) {
        console.error("No trip ID provided");
        return null;
      }

      console.log("Fetching trip data for ID:", id);

      try {
        // First, get the trip data with minimal related data
        const { data: tripData, error: tripError } = await supabase
          .from("trips")
          .select("*")
          .eq("id", id)
          .single();

        if (tripError) {
          console.error("Error fetching trip:", tripError);
          throw tripError;
        }

        if (!tripData) {
          console.error("No trip data found for ID:", id);
          return null;
        }

        // First, let's check the structure of the trip_members table
        const { data: membersData, error: membersError } = await supabase
          .from("trip_members")
          .select("*")
          .eq("trip_id", id);

        if (membersError) {
          console.error("Error fetching trip members:", membersError);
          throw membersError;
        }

        console.log("Raw trip members:", JSON.stringify(membersData, null, 2));

        // Get profile IDs from members
        const profileIds = (membersData || [])
          .map((member) => member.profile_id)
          .filter(Boolean) as string[];

        // Fetch profiles in a single query
        let profiles: Profile[] = [];
        if (profileIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("*")
            .in("id", profileIds);

          if (profilesError) {
            console.error("Error fetching profiles:", profilesError);
            throw profilesError;
          }

          profiles = profilesData || [];
          console.log("Fetched profiles:", JSON.stringify(profiles, null, 2));
        }

        // Create a map of profile_id to profile
        const profilesMap = profiles.reduce<Record<string, Profile>>(
          (acc, profile) => {
            if (profile.id) {
              acc[profile.id] = profile;
            }
            return acc;
          },
          {}
        );

        // Combine members with their profiles
        const membersWithProfiles = (membersData || []).map((member) => ({
          ...member,
          profiles: member.profile_id
            ? profilesMap[member.profile_id] || null
            : null,
        }));

        console.log(
          "Members with profiles:",
          JSON.stringify(membersWithProfiles, null, 2)
        );

        // Get itinerary items
        const { data: itineraryItems, error: itineraryError } = await supabase
          .from("itinerary_items")
          .select("*")
          .eq("trip_id", id);

        if (itineraryError) {
          console.error("Error fetching itinerary items:", itineraryError);
          throw itineraryError;
        }

        // Get bookings with proper typing and transform data
        const { data: bookings, error: bookingsError } = await supabase
          .from("bookings")
          .select("*")
          .eq("trip_id", id);

        if (bookingsError) {
          console.error("Error fetching bookings:", bookingsError);
          throw bookingsError;
        }

        // Transform bookings to ensure they match our type
        const typedBookings: Booking[] = (bookings || []).map(
          (booking: RawBooking) => ({
            ...booking,
            confirmation_code: booking.confirmation_code || "",
            currency: booking.currency || "",
            end_time: booking.end_time || "",
            details:
              booking.details && typeof booking.details === "object"
                ? (booking.details as Record<string, unknown>)
                : {},
          })
        );

        // Get expenses with proper typing and transform data
        const { data: expenses, error: expensesError } = await supabase
          .from("expenses")
          .select("*")
          .eq("trip_id", id);

        if (expensesError) {
          console.error("Error fetching expenses:", expensesError);
          throw expensesError;
        }

        // Transform expenses to ensure they match our type
        const typedExpenses: Expense[] = (expenses || []).map(
          (expense: RawExpense) => ({
            ...expense,
            details:
              expense.details && typeof expense.details === "object"
                ? (expense.details as Record<string, unknown>)
                : {},
            split_between: Array.isArray(expense.split_between)
              ? (expense.split_between as string[])
              : [],
            category: expense.category || "",
          })
        );

        // Log the raw members data for debugging
        console.log("Raw members data:", JSON.stringify(membersData, null, 2));

        // Define a type for the raw member data from Supabase
        interface RawTripMember {
          id: string;
          role: "owner" | "editor" | "viewer";
          profile_id: string;
          profiles: Profile | null;
          [key: string]: unknown;
        }

        // Transform members data to ensure proper typing
        const transformedMembers = (membersData || []).map(
          (member: RawTripMember) => {
            console.log("Processing member:", JSON.stringify(member, null, 2));
            return {
              ...member,
              profiles: member.profiles || null,
            };
          }
        );

        console.log(
          "Transformed members:",
          JSON.stringify(transformedMembers, null, 2)
        );

        // Combine all the data with proper typing
        const data: TripData = {
          ...tripData,
          // Ensure trip_code is always defined, generate a default if missing
          trip_code: tripData.trip_code || `trip-${tripData.id.slice(0, 8)}`,
          trip_members: membersWithProfiles,
          itinerary_items: itineraryItems || [],
          bookings: typedBookings,
          expenses: typedExpenses,
        };

        console.log("Final trip data:", data);

        console.log("Combined trip data:", data);
        return data;
      } catch (error) {
        console.error("Error in trip query:", error);
        throw error;
      }
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Trip not found</h2>
            <p className="text-muted-foreground mb-4">
              The trip you're looking for doesn't exist or you don't have access
              to it.
            </p>
            <Button asChild>
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Offline indicator */}
      {isOffline && (
        <div className="bg-amber-500 text-white text-xs text-center py-1 px-4">
          {offlineData ? "Viewing cached data — changes will sync when online" : "You're offline"}
        </div>
      )}
      {/* Trip Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-4 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            {/* Back */}
            {isStandalone ? (
              <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="shrink-0 -ml-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" asChild className="shrink-0 -ml-1">
                <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
              </Button>
            )}

            {/* Trip name + meta */}
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-semibold leading-tight truncate">{trip.name}</h1>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {trip.destination_main && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />{trip.destination_main}
                  </span>
                )}
                {trip.start_date && trip.end_date && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(trip.start_date), "MMM d")} – {format(new Date(trip.end_date), "MMM d, yyyy")}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />{trip.trip_members?.length || 0} members
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setShowInviteDialog(true)} className="hidden sm:flex">
                <Users className="h-3.5 w-3.5 mr-1.5" />Invite
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
                <Edit className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Edit Trip</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div ref={contentRef} className="flex-1 flex flex-col h-[calc(100vh-8rem)] sm:h-[calc(100vh-9rem)] overflow-hidden">
        {/* Tabs Navigation - Enhanced Design */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabId)}
          className="flex-1 flex flex-col h-full overflow-hidden"
          defaultValue="itinerary"
        >
          <div className="border-b bg-background">
            <TabsList className="h-auto bg-transparent rounded-none p-0 px-4 sm:px-6 gap-0 w-full justify-start overflow-x-auto">
              {(
                [
                  { value: "itinerary", icon: CalendarRange, label: "Itinerary" },
                  { value: "chat",      icon: MessageSquare,  label: "Chat" },
                  { value: "bookings",  icon: Hotel,          label: "Bookings" },
                  { value: "expenses",  icon: DollarSign,     label: "Expenses" },
                  { value: "members",   icon: Users,          label: "Members" },
                ] as const
              ).map(({ value, icon: Icon, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="relative h-11 px-4 rounded-none border-0 bg-transparent text-sm font-medium text-muted-foreground shadow-none
                    data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent
                    after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0
                    data-[state=active]:after:opacity-100
                    hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Icon className="h-4 w-4 mr-2 shrink-0" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="itinerary" className="space-y-4 p-4 sm:p-6 overflow-y-auto h-full pb-24 md:pb-6">
            <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-2">
              <OfflineStorageInfo tripId={trip.id} />
              <div className="flex items-center gap-2 ml-auto">
                <DownloadTripButton tripId={trip.id} />
                {(trip.ai_itinerary_data || (trip.itinerary_items && trip.itinerary_items.length > 0)) && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startStream(trip.id)}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-1.5" />
                      )}
                      Regenerate
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedItem(null);
                        setShowItemDialog(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      Add Activity
                    </Button>
                  </>
                )}
              </div>
            </div>
            {/* AI Streaming / Generation Panel */}
            {isGenerating && (() => {
              const totalDays = trip.start_date && trip.end_date
                ? Math.max(1, Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000) + 1)
                : 7;
              let progress = 0;
              let daysReceived = 0;
              for (const ev of events) {
                if (ev.type === "agent_start" && progress < 5) progress = 5;
                else if (ev.type === "agent_handoff" && ev.toAgent === "ResearchAgent") progress = Math.max(progress, 10);
                else if (ev.type === "agent_handoff" && ev.toAgent === "PlanningAgent") progress = Math.max(progress, 20);
                else if (ev.type === "partial_itinerary") { daysReceived++; progress = Math.max(progress, 20 + (daysReceived / totalDays) * 70); }
                else if (ev.type === "itinerary_complete") progress = 100;
              }
              return (
                <div className="space-y-4">
                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Crafting your personalized itinerary...
                      </div>
                      <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {daysReceived > 0 ? `${daysReceived} of ${totalDays} days planned` : "Researching your destination..."}
                      </p>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-muted-foreground" onClick={cancel}>
                        <XCircle className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                  {/* AI thinking panel */}
                  <StreamingThinkingPanel events={events} isComplete={false} />
                  {/* Partial day cards as they arrive */}
                  {streamingItinerary && streamingItinerary.days.length > 0 && (
                    <div className="space-y-3">
                      {streamingItinerary.days.map((day, i) => (
                        <PartialDayCard
                          key={day.day}
                          day={day}
                          isStreaming={i === streamingItinerary.days.length - 1}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            {/* AI Guidance Panel — show when idle/failed and no itinerary */}
            {!isGenerating && streamStatus !== "complete" && (!trip.ai_itinerary_data ||
              trip.itinerary_status === "generating" ||
              trip.itinerary_status === "failed" ||
              streamStatus === "error") && (
              <Card>
                <CardHeader className="pb-2 text-center">
                  <CardTitle className="flex items-center justify-center gap-2 text-lg font-semibold">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Let’s plan this trip together
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground text-center">
                  {trip.itinerary_status === "failed" || streamStatus === "error" ? (
                    <div className="space-y-4">
                      <p className="text-foreground">
                        We couldn’t generate your plan just now.
                      </p>
                      {streamError && (
                        <p className="text-xs text-destructive bg-destructive/10 rounded p-2">
                          {streamError}
                        </p>
                      )}
                      <div className="inline-block text-left">
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Double-check your dates and destination.</li>
                          <li>Invite your travel buddies so we factor group preferences.</li>
                          <li>Set your travel preferences for the best recommendations.</li>
                        </ul>
                      </div>
                      <div className="flex justify-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => startStream(trip.id)}
                          disabled={isGenerating}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Retry AI Generation
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowInviteDialog(true)}
                        >
                          <Users className="h-4 w-4 mr-2" /> Add People
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <p className="text-foreground max-w-md mx-auto">
                        Ready to create some memories in {trip.destination_main}? I can whip up a personalized itinerary in just a few moments. For the best results, let’s get a few details sorted first.
                      </p>
                      <div className="inline-block text-left bg-muted p-4 rounded-lg border">
                        <ul className="space-y-3">
                          <li className="flex items-start gap-3">
                            <Users className="h-4 w-4 mt-1 shrink-0 text-primary" />
                            <div>
                              <strong>Add your travel buddies.</strong> The more I know about who’s going, the better I can tailor activities for everyone.
                              <br /><span className="text-xs text-primary">Pro-tip: Ask them to fill in their profile preferences for an even more memorable trip!</span>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <Edit className="h-4 w-4 mt-1 shrink-0 text-primary" />
                            <div>
                              <strong>Set the trip vibe.</strong> Are we going for a chill beach holiday or a fast-paced city adventure? Setting the mood helps me find the perfect spots.
                            </div>
                          </li>
                        </ul>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2 pt-2">
                        <Button size="sm" onClick={() => startStream(trip.id)} disabled={isGenerating}>
                          <Sparkles className="h-4 w-4 mr-2" />Generate AI Itinerary
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowInviteDialog(true)}>
                          <Users className="h-4 w-4 mr-2" /> Add People
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowEditDialog(true)}>
                          <Edit className="h-4 w-4 mr-2" /> Set Preferences
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            {/* AI Generated Itinerary */}
            {trip.ai_itinerary_data &&
              trip.itinerary_status === "completed" && (
                <SimpleItineraryCalendar
                  tripId={trip.id}
                  startDate={trip.start_date as unknown as string}
                  onSelect={(item) => {
                    setSelectedItem(item);
                    setShowDetailsDialog(true);
                  }}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="chat" className="p-0 overflow-y-auto h-full pb-16 md:pb-0">
            <TripChat tripId={trip.id} />
          </TabsContent>

          <TabsContent
            value="bookings"
            className="flex-1 min-h-0 overflow-y-auto p-4 pb-20 md:pb-4"
          >
            <BookingsTab tripId={trip.id} />
          </TabsContent>

          <TabsContent
            value="expenses"
            className="flex-1 min-h-0 overflow-y-auto pb-16 md:pb-0"
          >
            <div className="h-full">
              <ExpensesTab tripId={trip.id} />
            </div>
          </TabsContent>

          <TabsContent value="members" className="h-full">
            <div className="h-full flex flex-col">
              <div className="p-4 sm:px-6 border-b flex-shrink-0">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold">Members</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{trip.trip_members?.length || 0} people on this trip</p>
                  </div>
                  <Button size="sm" onClick={() => setShowInviteDialog(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Invite
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="space-y-2 max-w-2xl w-full">
                  {trip.trip_members?.map(
                    (
                      member: TripMember & Record<string, unknown>,
                      index: number
                    ) => {
                      // Log the member data for debugging
                      console.log(
                        "Raw member data:",
                        JSON.stringify(member, null, 2)
                      );

                      // Helper function to safely get nested properties
                      const getNested = (
                        obj: unknown,
                        path: string[],
                        defaultValue: unknown = null
                      ): unknown => {
                        return path.reduce((acc, key) => {
                          return acc && typeof acc === "object" && key in acc
                            ? (acc as Record<string, unknown>)[key]
                            : defaultValue;
                        }, obj);
                      };

                      // Try different possible paths to the profile data
                      const possiblePaths = [
                        ["profiles"],
                        ["profile"],
                        ["profiles_1"],
                        ["data", "profiles"],
                        ["data", "profile"],
                      ];

                      let profile: Profile | null = null;

                      // Try each path until we find the profile data
                      for (const path of possiblePaths) {
                        const potentialProfile = getNested(member, path);
                        if (
                          potentialProfile &&
                          typeof potentialProfile === "object" &&
                          ("first_name" in potentialProfile ||
                            "id" in potentialProfile)
                        ) {
                          const p = potentialProfile as Record<string, unknown>;
                          profile = {
                            id: (p.id as string) || `unknown-${index}`,
                            first_name: (p.first_name as string) || "",
                            last_name: (p.last_name as string) || "",
                            avatar_url: p.avatar_url as string | undefined,
                          };
                          break;
                        }
                      }

                      // If no profile found, create a minimal one
                      if (!profile) {
                        profile = {
                          id: member.profile_id || `unknown-${index}`,
                          first_name: "Unknown",
                          last_name: "User",
                          avatar_url: undefined,
                        };
                      }

                      console.log("Processed profile:", profile);

                      // Determine display name with better fallbacks
                      let displayName = "Member";
                      if (profile.first_name) {
                        displayName = profile.first_name;
                        if (profile.last_name) {
                          displayName += ` ${profile.last_name}`;
                        }
                      } else if (member.profile_id) {
                        displayName = `User ${member.profile_id.slice(0, 6)}`;
                      } else {
                        displayName = `Member ${index + 1}`;
                      }

                      // Determine avatar initial
                      const avatarInitial = displayName[0].toUpperCase();

                      return (
                        <div
                          key={member.id || index}
                          className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-100"
                        >
                          <div className="flex items-center space-x-3">
                            {profile.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt={displayName}
                                className="h-10 w-10 rounded-full object-cover"
                                onError={(e) => {
                                  // Fallback to initials if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                  const fallback =
                                    document.createElement("div");
                                  fallback.className =
                                    "h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium";
                                  fallback.textContent = avatarInitial;
                                  target.parentNode?.insertBefore(
                                    fallback,
                                    target.nextSibling
                                  );
                                }}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                                {avatarInitial}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">
                                {displayName}
                              </p>
                              <p className="text-sm text-gray-500 capitalize">
                                {member.role}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={
                              member.role === "owner" ? "default" : "outline"
                            }
                            className={
                              member.role === "owner"
                                ? "bg-green-600 hover:bg-green-700"
                                : ""
                            }
                          >
                            {member.role}
                          </Badge>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Invite Member Dialog */}
        {trip && (
          <InviteMemberDialog
            open={showInviteDialog}
            onOpenChange={setShowInviteDialog}
            tripId={trip.id}
            tripName={trip.name}
            tripCode={trip.trip_code}
          />
        )}

        {/* Edit Trip Dialog */}
        {trip && (
          <TripEditDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            trip={trip}
          />
        )}

        {/* Status Notifications */}
        {id && <ItineraryStatusNotification tripId={id} />}

        {/* Read-only Details Dialog */}
        {trip && (
          <ItineraryItemDetailsDialog
            open={showDetailsDialog}
            onOpenChange={setShowDetailsDialog}
            item={selectedItem}
            onEdit={(item) => {
              setSelectedItem(item);
              setShowDetailsDialog(false);
              setShowItemDialog(true);
            }}
            onDelete={handleDeleteItem}
          />
        )}

        {/* Create/Edit Itinerary Item Dialog */}
        {trip && (
          <ItineraryItemDialog
            open={showItemDialog}
            onOpenChange={setShowItemDialog}
            tripId={trip.id}
            item={selectedItem}
          />
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
};

export default TripDetail;
