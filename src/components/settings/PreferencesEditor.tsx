import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Mountain, 
  Camera, 
  Utensils, 
  Music, 
  Waves, 
  TreePine, 
  Building, 
  ShoppingBag,
  Gamepad2,
  Palette,
  Heart,
  Coffee,
  Save,
  Loader2
} from 'lucide-react';

const interestOptions = [
  { id: 'hiking', label: 'Hiking & Nature', icon: Mountain },
  { id: 'photography', label: 'Photography', icon: Camera },
  { id: 'food', label: 'Food & Dining', icon: Utensils },
  { id: 'music', label: 'Music & Concerts', icon: Music },
  { id: 'beaches', label: 'Beaches & Water', icon: Waves },
  { id: 'adventure', label: 'Adventure Sports', icon: TreePine },
  { id: 'museums', label: 'Museums & Culture', icon: Building },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { id: 'nightlife', label: 'Nightlife & Entertainment', icon: Gamepad2 },
  { id: 'art', label: 'Art & Galleries', icon: Palette },
  { id: 'wellness', label: 'Wellness & Spa', icon: Heart },
  { id: 'coffee', label: 'Coffee & Cafes', icon: Coffee },
];

const dietaryOptions = [
  'Vegetarian',
  'Vegan', 
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
  'Kosher',
  'Halal',
  'Low-Carb',
  'Keto',
  'Pescatarian'
];

export const PreferencesEditor = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [allergies, setAllergies] = useState('');
  const [loyaltyPrograms, setLoyaltyPrograms] = useState({
    airlines: '',
    hotels: '',
    creditCards: ''
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Try to get from profiles table first
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileData && !profileError) {
        return profileData;
      }
      
      // Fallback to users table if profiles doesn't exist
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (userError) {
        console.error('Error fetching user data:', userError);
        throw userError;
      }
      
      return userData;
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    if (profile) {
      const preferences = profile.preferences as {
        interests?: string[];
        dietary?: string[];
        allergies?: string;
        loyalty_programs?: {
          airlines?: string[];
          hotels?: string[];
          creditCards?: string[];
        };
      } || {};
      
      setSelectedInterests(preferences.interests || []);
      setSelectedDietary(preferences.dietary || []);
      setAllergies(preferences.allergies || '');
      
      const loyaltyData = preferences.loyalty_programs;
      if (loyaltyData) {
        setLoyaltyPrograms({
          airlines: loyaltyData.airlines?.[0] || '',
          hotels: loyaltyData.hotels?.[0] || '',
          creditCards: loyaltyData.creditCards?.[0] || ''
        });
      }
    }
  }, [profile]);

  const handleInterestToggle = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId) 
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleDietaryToggle = (dietary: string) => {
    setSelectedDietary(prev => 
      prev.includes(dietary) 
        ? prev.filter(d => d !== dietary)
        : [...prev, dietary]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsLoading(true);

    try {
      const loyaltyData = {
        airlines: loyaltyPrograms.airlines ? [loyaltyPrograms.airlines] : [],
        hotels: loyaltyPrograms.hotels ? [loyaltyPrograms.hotels] : [],
        creditCards: loyaltyPrograms.creditCards ? [loyaltyPrograms.creditCards] : []
      };

      const preferencesData = {
        interests: selectedInterests,
        dietary: selectedDietary,
        allergies: allergies,
        loyalty_programs: loyaltyData
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          preferences: preferencesData,
          preferences_completed: true,
        })
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }

      toast({
        title: "Preferences updated",
        description: "Your travel preferences have been saved successfully."
      });

      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    } catch (error: unknown) {
      toast({
        title: "Error updating preferences",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Interests */}
      <Card>
        <CardHeader>
          <CardTitle>Travel Interests</CardTitle>
          <CardDescription>
            Select activities and experiences you enjoy while traveling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {interestOptions.map((interest) => {
              const Icon = interest.icon;
              const isSelected = selectedInterests.includes(interest.id);
              
              return (
                <Card 
                  key={interest.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                  }`}
                  onClick={() => handleInterestToggle(interest.id)}
                >
                  <CardContent className="p-4 text-center">
                    <Icon className={`h-6 w-6 mx-auto mb-2 ${
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <p className="text-xs font-medium">{interest.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {selectedInterests.length > 0 && (
            <div className="mt-4">
              <Label className="text-sm font-medium mb-2 block">Selected interests:</Label>
              <div className="flex flex-wrap gap-2">
                {selectedInterests.map((interestId) => {
                  const interest = interestOptions.find(opt => opt.id === interestId);
                  return (
                    <Badge key={interestId} variant="secondary">
                      {interest?.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dietary Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Dietary Preferences</CardTitle>
          <CardDescription>
            Let us know about any dietary restrictions or preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base font-medium mb-3 block">Dietary restrictions</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {dietaryOptions.map((dietary) => (
                <div key={dietary} className="flex items-center space-x-2">
                  <Checkbox
                    id={dietary}
                    checked={selectedDietary.includes(dietary)}
                    onCheckedChange={() => handleDietaryToggle(dietary)}
                  />
                  <Label htmlFor={dietary} className="text-sm font-normal cursor-pointer">
                    {dietary}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="allergies" className="text-base font-medium">
              Allergies or special notes
            </Label>
            <Input
              id="allergies"
              placeholder="e.g., Shellfish allergy, lactose intolerant..."
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Loyalty Programs */}
      <Card>
        <CardHeader>
          <CardTitle>Loyalty Programs</CardTitle>
          <CardDescription>
            Add your loyalty program numbers to get better recommendations and deals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="airlines">Airline loyalty programs</Label>
            <Input
              id="airlines"
              placeholder="e.g., Delta SkyMiles: 123456789"
              value={loyaltyPrograms.airlines}
              onChange={(e) => setLoyaltyPrograms(prev => ({ ...prev, airlines: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hotels">Hotel loyalty programs</Label>
            <Input
              id="hotels"
              placeholder="e.g., Marriott Bonvoy: 987654321"
              value={loyaltyPrograms.hotels}
              onChange={(e) => setLoyaltyPrograms(prev => ({ ...prev, hotels: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="creditCards">Credit card rewards</Label>
            <Input
              id="creditCards"
              placeholder="e.g., Chase Sapphire: *1234"
              value={loyaltyPrograms.creditCards}
              onChange={(e) => setLoyaltyPrograms(prev => ({ ...prev, creditCards: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading} size="lg">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving Changes...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save All Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
};