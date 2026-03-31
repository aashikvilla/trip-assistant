import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';

interface TravelPreferencesDialogProps {
  open: boolean;
  onComplete: () => void;
  userId: string;
}

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

export const TravelPreferencesDialog: React.FC<TravelPreferencesDialogProps> = ({
  open,
  onComplete,
  userId
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [allergies, setAllergies] = useState('');
  const [loyaltyPrograms, setLoyaltyPrograms] = useState({
    airlines: '',
    hotels: '',
    creditCards: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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

  const handleSkip = async () => {
    setIsLoading(true);
    
    try {
    const { error } = await supabase
      .from('profiles')
      .update({
        preferences_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
        console.error('Error skipping preferences:', error);
      toast({
        title: "Error",
        description: "Failed to skip preferences. Please try again.",
        variant: "destructive"
      });
    } else {
      onComplete();
    }
    } catch (error) {
      console.error('Unexpected error skipping:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);

    try {
    const loyaltyData = {
      airlines: loyaltyPrograms.airlines ? [loyaltyPrograms.airlines] : [],
      hotels: loyaltyPrograms.hotels ? [loyaltyPrograms.hotels] : [],
      creditCards: loyaltyPrograms.creditCards ? [loyaltyPrograms.creditCards] : []
    };

    const { error } = await supabase
      .from('profiles')
      .update({
        preferences: {
          interests: selectedInterests,
          dietary: selectedDietary,
          allergies: allergies,
          loyalty_programs: loyaltyData
        },
        preferences_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
        console.error('Error saving preferences:', error);
      toast({
        title: "Error saving preferences",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Preferences saved!",
        description: "Your travel preferences have been saved successfully."
      });
      onComplete();
    }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error saving preferences",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Tell us about your travel style</DialogTitle>
              <DialogDescription>
                Help us personalize your experience (Step {currentStep} of 3)
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSkip} disabled={isLoading}>
              <X className="h-4 w-4 mr-1" />
              Skip
            </Button>
          </div>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2 mb-6">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>

        {/* Step 1: Interests */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">What interests you?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select activities and experiences you enjoy while traveling
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                      <Icon className={`h-8 w-8 mx-auto mb-2 ${
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      <p className="text-sm font-medium">{interest.label}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={handleSkip} disabled={isLoading}>
                Skip this step
              </Button>
              <Button onClick={nextStep}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Dietary Needs */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Dietary preferences</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Let us know about any dietary restrictions or preferences
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium mb-3 block">Dietary restrictions</Label>
                <div className="grid grid-cols-2 gap-3">
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
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div className="space-x-2">
                <Button variant="ghost" onClick={handleSkip} disabled={isLoading}>
                  Skip this step
                </Button>
                <Button onClick={nextStep}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Loyalty Programs */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Loyalty programs</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your loyalty program numbers to get better recommendations
              </p>
            </div>

            <div className="space-y-4">
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
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div className="space-x-2">
                <Button variant="ghost" onClick={handleSkip} disabled={isLoading}>
                  {isLoading ? 'Skipping...' : 'Skip this step'}
                </Button>
                <Button onClick={handleComplete} disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Complete Setup'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};