import React from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/Card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarIcon, MapPin, X, Plus, UserCheck, Heart, Users, UsersRound } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TripForEdit {
  id: string;
  name: string;
  description?: string | null;
  destination_main?: string | null;
  travel_style?: string | null;
  vibe?: string | null;
  activity_level?: string | null;
  must_do_activities?: string[] | null; // keeping name consistent with current app usage
  start_date?: string | null;
  end_date?: string | null;
}

interface TripEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: TripForEdit;
}

export const TripEditDialog: React.FC<TripEditDialogProps> = ({ open, onOpenChange, trip }) => {
  const [startDate, setStartDate] = React.useState<Date | undefined>(trip?.start_date ? new Date(trip.start_date) : undefined);
  const [endDate, setEndDate] = React.useState<Date | undefined>(trip?.end_date ? new Date(trip.end_date) : undefined);
  const [destinations, setDestinations] = React.useState<string[]>(() => (trip?.destination_main ? String(trip.destination_main).split(',').map((d: string) => d.trim()).filter(Boolean) : []));
  const [currentDestination, setCurrentDestination] = React.useState('');
  const [travelStyle, setTravelStyle] = React.useState<string>(trip?.travel_style || '');
  const [vibe, setVibe] = React.useState<string>(trip?.vibe || '');
  // DB stores 'light'/'moderate'/'active'; dropdown uses 'low'/'moderate'/'high'
  const dbToUiActivity = (v?: string | null) => v === 'light' ? 'low' : v === 'active' ? 'high' : v || '';
  const [activityLevel, setActivityLevel] = React.useState<string>(dbToUiActivity(trip?.activity_level));
  const [mustDoActivities, setMustDoActivities] = React.useState<string[]>(Array.isArray(trip?.must_do_activities) ? trip.must_do_activities : []);
  const [mustDoInput, setMustDoInput] = React.useState<string>('');
  const [name, setName] = React.useState<string>(trip?.name || '');
  const [description, setDescription] = React.useState<string>(trip?.description || '');
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  React.useEffect(() => {
    if (open && trip) {
      setStartDate(trip.start_date ? new Date(trip.start_date) : undefined);
      setEndDate(trip.end_date ? new Date(trip.end_date) : undefined);
      setDestinations(trip.destination_main ? String(trip.destination_main).split(',').map((d: string) => d.trim()).filter(Boolean) : []);
      setTravelStyle(trip.travel_style || '');
      setVibe(trip.vibe || '');
      setActivityLevel(dbToUiActivity(trip.activity_level));
      setMustDoActivities(Array.isArray(trip.must_do_activities) ? trip.must_do_activities : []);
      setMustDoInput('');
      setName(trip.name || '');
      setDescription(trip.description || '');
    }
  }, [open, trip]);

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
    if (mustDoInput.trim() && !mustDoActivities.includes(mustDoInput.trim())) {
      setMustDoActivities([...mustDoActivities, mustDoInput.trim()]);
      setMustDoInput('');
    }
  };

  const removeMustDoActivity = (activity: string) => {
    setMustDoActivities(mustDoActivities.filter(a => a !== activity));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: 'Trip name required', description: 'Please enter a name for your trip.', variant: 'destructive' });
      return;
    }

    if (destinations.length === 0) {
      toast({ title: 'Destination required', description: 'Please add at least one destination for your trip.', variant: 'destructive' });
      return;
    }

    if (activityLevel && startDate && endDate && endDate < startDate) {
      toast({ title: 'Invalid dates', description: 'End date cannot be earlier than start date.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // Map UI activity level values to DB CHECK constraint values
      const activityLevelMap: Record<string, string> = { low: 'light', moderate: 'moderate', high: 'active' };
      const mappedActivityLevel = activityLevel ? (activityLevelMap[activityLevel] ?? activityLevel) : null;

      const updateData: Record<string, unknown> = {
        name: name.trim(),
        description: description?.trim() || null,
        destination_main: destinations.length > 0 ? destinations.join(', ') : null,
        travel_style: travelStyle || null,
        vibe: vibe || null,
        activity_level: mappedActivityLevel,
        // must_do_activities is NOT NULL — send [] instead of null
        must_do_activities: mustDoActivities.length > 0 ? mustDoActivities : [],
        start_date: startDate ? startDate.toISOString().split('T')[0] : null,
        end_date: endDate ? endDate.toISOString().split('T')[0] : null,
      };

      const { data, error } = await supabase
        .from('trips')
        .update(updateData)
        .eq('id', trip.id)
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Trip updated!', description: 'Your changes have been saved.' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['trips'] }),
        queryClient.invalidateQueries({ queryKey: ['trip', String(trip.id)] }),
      ]);
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error';
      toast({ title: 'Error updating trip', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Trip</DialogTitle>
          <DialogDescription>Update your trip details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Trip Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Trip Name</Label>
            <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
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
              <Button type="button" onClick={addDestination} disabled={!currentDestination.trim()} size="sm">
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
            <p className="text-xs text-muted-foreground">Add multiple destinations by typing and pressing Enter or clicking the + button</p>
          </div>

          {/* Travel Style Selection - mirrors CreateTripDialog */}
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
            <Select value={vibe} onValueChange={setVibe}>
              <SelectTrigger>
                <SelectValue placeholder="Select a vibe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adventure">Adventure</SelectItem>
                <SelectItem value="adventurous">Adventurous</SelectItem>
                <SelectItem value="relaxed">Relaxed</SelectItem>
                <SelectItem value="cultural">Cultural</SelectItem>
                <SelectItem value="romantic">Romantic</SelectItem>
                <SelectItem value="foodie">Foodie</SelectItem>
                <SelectItem value="nature">Nature</SelectItem>
                <SelectItem value="nightlife">Nightlife</SelectItem>
                <SelectItem value="family_friendly">Family Friendly</SelectItem>
                <SelectItem value="luxury">Luxury</SelectItem>
                <SelectItem value="budget">Budget</SelectItem>
                <SelectItem value="party">Party</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Activity Level */}
          <div className="space-y-2">
            <Label htmlFor="activity-level">Activity Level <span className="text-red-500">*</span></Label>
            <Select value={activityLevel} onValueChange={(v) => setActivityLevel(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select activity level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low — Relaxed pace, minimal physical activity</SelectItem>
                <SelectItem value="moderate">Moderate — Balanced mix of activities and rest</SelectItem>
                <SelectItem value="high">High — Action-packed, lots of physical activities</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Must-Do Activities */}
          <div className="space-y-3">
            <Label>Must-Do Activities</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Visit the Eiffel Tower, Try local cuisine"
                value={mustDoInput}
                onChange={(e) => setMustDoInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addMustDoActivity();
                  }
                }}
                className="flex-1"
              />
              <Button type="button" onClick={addMustDoActivity} disabled={!mustDoInput.trim()} size="sm">
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
            <p className="text-xs text-muted-foreground">Add activities that are essential for your trip experience</p>
          </div>

          {/* Date Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !startDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !endDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" name="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
