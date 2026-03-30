import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import { supabase } from '../../integrations/supabase/client';

// Minimal type for the trip data we need
interface TripData {
  id: string;
  name: string;
  code: string;
}


interface JoinTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinTripDialog({ open, onOpenChange }: JoinTripDialogProps) {
  const [tripCode, setTripCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinTrip = async () => {
    if (!tripCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a trip code',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Use the RPC function to join the trip
      const { data, error } = await supabase
        .rpc('join_trip_by_code', {
          code_param: tripCode.trim().toUpperCase()
        });

      if (error) {
        console.error('RPC Error:', error);
        throw new Error('Failed to join trip. Please try again.');
      }

      const result = data as { success: boolean; error?: string; trip_id?: string; trip_name?: string };

      if (!result.success) {
        throw new Error(result.error || 'Invalid trip code. Please check and try again.');
      }

      toast({
        title: 'Success!',
        description: `You've successfully joined the trip: ${result.trip_name}`,
      });

      // Close the dialog and refresh the trips list
      onOpenChange(false);
      setTripCode('');
      window.location.reload();
    } catch (error) {
      console.error('Error joining trip:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to join trip. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join a Trip</DialogTitle>
          <DialogDescription>
            Enter the trip code provided by the trip organizer to join an existing trip.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tripCode" className="text-right">
              Trip Code
            </Label>
            <Input
              id="tripCode"
              value={tripCode}
              onChange={(e) => setTripCode(e.target.value)}
              placeholder="Enter trip code"
              className="col-span-3"
              autoCapitalize="characters"
              maxLength={8}
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleJoinTrip}
            disabled={isLoading || !tripCode.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              'Join Trip'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
