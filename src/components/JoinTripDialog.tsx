import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/Card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Hash, Loader2, CheckCircle, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface JoinTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JoinTripDialog: React.FC<JoinTripDialogProps> = ({
  open,
  onOpenChange
}) => {
  const [tripCode, setTripCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleJoinTrip = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to join a trip.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    if (!tripCode.trim() || tripCode.length !== 4) {
      toast({
        title: "Invalid code",
        description: "Please enter a valid 4-character trip code.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .rpc('join_trip_by_code', {
          code_param: tripCode.toUpperCase()
        });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; trip_id?: string; trip_name?: string };

      if (!result.success) {
        toast({
          title: "Failed to join trip",
          description: result.error || "Invalid trip code",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Successfully joined trip!",
        description: `Welcome to ${result.trip_name}`,
      });

      onOpenChange(false);
      setTripCode('');
      navigate(`/trips/${result.trip_id}`);
    } catch (error: any) {
      toast({
        title: "Error joining trip",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (value: string) => {
    // Only allow alphanumeric characters and limit to 4 characters
    const cleanValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    setTripCode(cleanValue);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTripCode('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Join a Trip
          </DialogTitle>
          <DialogDescription>
            Enter a 4-character trip code to join an existing trip
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="tripCode">Trip Code</Label>
            <Input
              id="tripCode"
              placeholder="ABCD"
              value={tripCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              className="text-center text-2xl font-mono tracking-widest uppercase"
              maxLength={4}
            />
            <p className="text-xs text-muted-foreground text-center">
              Enter the 4-character code shared by the trip organizer
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleJoinTrip}
              disabled={isLoading || tripCode.length !== 4}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Join Trip
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};