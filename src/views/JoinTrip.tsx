import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  MapPin, 
  Calendar, 
  Users, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Hash,
  Plane
} from 'lucide-react';
import { format } from 'date-fns';

const JoinTrip = () => {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [invitation, setInvitation] = useState<any>(null);
  const [trip, setTrip] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(!token);

  useEffect(() => {
    if (token) {
      fetchInvitationByToken();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const fetchInvitationByToken = async () => {
    try {
      const { data: invitationData, error: invitationError } = await supabase
        .from('trip_invitations')
        .select(`
          *,
          trips(
            id,
            name,
            description,
            destination_main,
            start_date,
            end_date,
            travel_style,
            trip_members(role, profiles(first_name, last_name))
          )
        `)
        .eq('invitation_token', token!)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (invitationError || !invitationData) {
        toast({
          title: "Invalid invitation",
          description: "This invitation link is invalid or has expired.",
          variant: "destructive"
        });
        return;
      }

      setInvitation(invitationData);
      setTrip(invitationData.trips);
    } catch (error: any) {
      toast({
        title: "Error loading invitation",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvitationByCode = async () => {
    if (!invitationCode.trim()) {
      toast({
        title: "Code required",
        description: "Please enter a 6-digit invitation code.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data: invitationData, error: invitationError } = await supabase
        .from('trip_invitations')
        .select(`
          *,
          trips(
            id,
            name,
            description,
            destination_main,
            start_date,
            end_date,
            travel_style,
            trip_members(role, profiles(first_name, last_name))
          )
        `)
        .eq('invitation_code', invitationCode.trim())
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (invitationError || !invitationData) {
        toast({
          title: "Invalid code",
          description: "This invitation code is invalid or has expired.",
          variant: "destructive"
        });
        return;
      }

      setInvitation(invitationData);
      setTrip(invitationData.trips);
      setShowCodeInput(false);
    } catch (error: any) {
      toast({
        title: "Error loading invitation",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to join this trip.",
        variant: "destructive"
      });
      router.push('/auth');
      return;
    }

    setIsJoining(true);

    try {
      const { data, error } = await supabase
        .rpc('accept_trip_invitation', {
          invitation_token_param: invitation.invitation_token
        });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; trip_id?: string };

      if (!result.success) {
        toast({
          title: "Error joining trip",
          description: result.error || "Failed to join trip",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Welcome to the trip!",
        description: `You've successfully joined ${trip.name}`,
      });

      router.push(`/trips/${result.trip_id}`);
    } catch (error: any) {
      toast({
        title: "Error joining trip",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showCodeInput) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
                <Plane className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">Vibe Trip</span>
            </div>
            <CardTitle>Join a Trip</CardTitle>
            <CardDescription>Enter your 6-digit invitation code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Invitation Code</Label>
              <Input
                id="code"
                placeholder="123456"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value)}
                maxLength={6}
                className="text-center text-lg font-mono tracking-wider"
              />
            </div>
            <Button 
              onClick={fetchInvitationByCode} 
              disabled={isLoading || invitationCode.length !== 6}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Hash className="h-4 w-4 mr-2" />
                  Join Trip
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation || !trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="mb-2">Invitation Not Found</CardTitle>
            <CardDescription className="mb-4">
              This invitation link is invalid or has expired.
            </CardDescription>
            <Button asChild>
              <a href="/dashboard">Go to Dashboard</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
              <Plane className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">Vibe Trip</span>
          </div>
          <CardTitle>You're Invited!</CardTitle>
          <CardDescription>
            You've been invited to join a trip
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trip Details */}
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold">{trip.name}</h2>
              {trip.description && (
                <p className="text-muted-foreground mt-2">{trip.description}</p>
              )}
            </div>

            <div className="grid gap-3">
              {trip.destination_main && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{trip.destination_main}</span>
                </div>
              )}
              
              {trip.start_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(trip.start_date), 'MMM d, yyyy')}
                    {trip.end_date && ` - ${format(new Date(trip.end_date), 'MMM d, yyyy')}`}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{trip.trip_members?.length || 0} current members</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground">You'll join as:</span>
              <Badge variant="secondary" className="capitalize">
                {invitation.role}
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {user ? (
              <Button 
                onClick={acceptInvitation} 
                disabled={isJoining}
                className="w-full"
                size="lg"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Joining Trip...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept Invitation
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Sign in to accept this invitation
                </p>
                <Button asChild className="w-full" size="lg">
                  <a href="/auth">Sign In to Join</a>
                </Button>
              </div>
            )}
            
            <Button variant="outline" className="w-full" asChild>
              <a href="/dashboard">Maybe Later</a>
            </Button>
          </div>

          {/* Expiration Notice */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              This invitation expires on {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinTrip;