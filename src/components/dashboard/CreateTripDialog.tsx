import React from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/Card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarIcon, MapPin, X, Users, Heart, UserCheck, UsersRound, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Database } from '@/integrations/supabase/types';

interface CreateTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateTripDialog: React.FC<CreateTripDialogProps> = ({ open, onOpenChange }) => {
  const [startDate, setStartDate] = React.useState<Date>();
  const [endDate, setEndDate] = React.useState<Date>();
  const [destinations, setDestinations] = React.useState<string[]>([]);
  const [currentDestination, setCurrentDestination] = React.useState('');
  const [travelStyle, setTravelStyle] = React.useState<string>('');
  const [vibe, setVibe] = React.useState<string>('');
  const [activityLevel, setActivityLevel] = React.useState<string>('');
  const [mustDoActivities, setMustDoActivities] = React.useState<string[]>([]);
  const [currentMustDo, setCurrentMustDo] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const travelStyleOptions = [
    { 
      value: 'solo', 
      label: 'Solo Travel', 
      icon: UserCheck, 
      description: 'Exploring on your own',
      color: 'bg-gradient-ocean'
    },
    { 
      value: 'couple', 
      label: 'Couple', 
      icon: Heart, 
      description: 'Romantic getaway for two',
      color: 'bg-gradient-sunset'
    },
    { 
      value: 'family', 
      label: 'Family', 
      icon: Users, 
      description: 'Fun for the whole family',
      color: 'bg-gradient-adventure'
    },
    { 
      value: 'friends', 
      label: 'Friends', 
      icon: UsersRound, 
      description: 'Adventure with friends',
      color: 'bg-gradient-hero'
    },
  ];

  const addDestination = () => {
    if (currentDestination.trim() && !destinations.includes(currentDestination.trim())) {
      setDestinations([...destinations, currentDestination.trim()]);
      setCurrentDestination('');
    }
  };

  const removeDestination = (destination: string) => {
    setDestinations(destinations.filter(d => d !== destination));
  };

  const handleDestinationKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addDestination();
    }
  };

  const addMustDoActivity = () => {
    if (currentMustDo.trim() && !mustDoActivities.includes(currentMustDo.trim())) {
      setMustDoActivities([...mustDoActivities, currentMustDo.trim()]);
      setCurrentMustDo('');
    }
  };

  const removeMustDoActivity = (activity: string) => {
    setMustDoActivities(mustDoActivities.filter(a => a !== activity));
  };

  const handleMustDoKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addMustDoActivity();
    }
  };

  const resetForm = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setDestinations([]);
    setCurrentDestination('');
    setTravelStyle('');
    setVibe('');
    setActivityLevel('');
    setMustDoActivities([]);
    setCurrentMustDo('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create a trip.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const tripName = formData.get('name') as string;
      const description = formData.get('description') as string;
      
      // Validation for required fields
      if (!tripName.trim()) {
        toast({
          title: "Trip name required",
          description: "Please enter a name for your trip.",
          variant: "destructive"
        });
        return;
      }

      if (destinations.length === 0) {
        toast({
          title: "Destination required",
          description: "Please add at least one destination for your trip.",
          variant: "destructive"
        });
        return;
      }

      if (!travelStyle) {
        toast({
          title: "Travel style required",
          description: "Please select a travel style for your trip.",
          variant: "destructive"
        });
        return;
      }

      if (!activityLevel) {
        toast({
          title: "Activity level required",
          description: "Please select an activity level for your trip.",
          variant: "destructive"
        });
        return;
      }

      const tripData = {
        name: tripName.trim(),
        description: description?.trim() || null,
        destination_main: destinations.length > 0 ? destinations.join(', ') : null,
        travel_style: travelStyle,
        vibe: vibe || null,
        activity_level: activityLevel || null,
        must_do_activities: mustDoActivities.length > 0 ? mustDoActivities : null,
        visibility: 'private',
        start_date: startDate?.toISOString().split('T')[0] || null,
        end_date: endDate?.toISOString().split('T')[0] || null,
        created_by: user.id, // This matches auth.uid()
      };

      console.log('Creating trip with data:', tripData);

      const { data, error } = await supabase
        .from('trips')
        .insert(tripData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        toast({
          title: "Error creating trip",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      console.log('Trip created successfully:', data);

      toast({
        title: "Trip created!",
        description: "Your new trip has been created successfully."
      });
      
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      onOpenChange(false);
      resetForm();

    } catch (error: unknown) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error creating trip",
        description: (error as Error)?.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Trip</DialogTitle>
          <DialogDescription>
            Plan your next adventure by creating a new trip.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Trip Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Trip Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Summer Europe Adventure"
              required
            />
          </div>
          
          {/* Multiple Destinations */}
          <div className="space-y-3">
            <Label>Destinations <span className="text-red-500">*</span></Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="e.g., Paris, France"
                  className="pl-10"
                  value={currentDestination}
                  onChange={(e) => setCurrentDestination(e.target.value)}
                  onKeyPress={handleDestinationKeyPress}
                />
              </div>
              <Button 
                type="button" 
                onClick={addDestination}
                disabled={!currentDestination.trim()}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {destinations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {destinations.map((destination, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {destination}
                    <button
                      type="button"
                      onClick={() => removeDestination(destination)}
                      className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Add multiple destinations by typing and pressing Enter or clicking the + button
            </p>
          </div>

          {/* Travel Style Selection */}
          <div className="space-y-3">
            <Label>Travel Style <span className="text-red-500">*</span></Label>
            <div className="grid grid-cols-2 gap-3">
              {travelStyleOptions.map((style) => {
                const Icon = style.icon;
                const isSelected = travelStyle === style.value;
                
                return (
                  <Card 
                    key={style.value}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setTravelStyle(style.value)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg ${style.color} flex items-center justify-center`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{style.label}</p>
                          <p className="text-xs text-muted-foreground">{style.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Trip Vibe */}
          <div className="space-y-2">
            <Label htmlFor="vibe">Trip Vibe</Label>
            <Input
              id="vibe"
              placeholder="e.g., Romantic and cultural, Adventure-packed, Relaxed and fun"
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Describe the overall mood and atmosphere you want for this trip
            </p>
          </div>

          {/* Activity Level */}
          <div className="space-y-2">
            <Label htmlFor="activity-level">Activity Level <span className="text-red-500">*</span></Label>
            <Select value={activityLevel} onValueChange={setActivityLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select activity level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Relaxed pace, minimal physical activity</SelectItem>
                <SelectItem value="moderate">Moderate - Balanced mix of activities and rest</SelectItem>
                <SelectItem value="high">High - Action-packed, lots of physical activities</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Must-Do Activities */}
          <div className="space-y-3">
            <Label>Must-Do Activities</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Visit the Eiffel Tower, Try local cuisine"
                value={currentMustDo}
                onChange={(e) => setCurrentMustDo(e.target.value)}
                onKeyPress={handleMustDoKeyPress}
                className="flex-1"
              />
              <Button 
                type="button" 
                onClick={addMustDoActivity}
                disabled={!currentMustDo.trim()}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {mustDoActivities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {mustDoActivities.map((activity, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {activity}
                    <button
                      type="button"
                      onClick={() => removeMustDoActivity(activity)}
                      className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Add activities that are essential for your trip experience
            </p>
          </div>

          {/* Date Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Tell us about your trip..."
              rows={3}
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Trip"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};