import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Utensils, Hotel, Coffee } from "lucide-react";
import { ParsedItinerary, ParsedItineraryDay } from "@/services/itineraryService";

interface AIItineraryDisplayProps {
  itinerary: ParsedItinerary;
}

interface DayCardProps {
  day: ParsedItineraryDay;
}

const ActivitySection: React.FC<{
  title: string;
  icon: React.ReactNode;
  activities?: string[];
  meal?: string;
}> = ({ title, icon, activities, meal }) => {
  if (!activities && !meal) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="font-medium text-sm">{title}</h4>
      </div>
      <div className="ml-6 space-y-2">
        {activities && activities.map((activity, index) => (
          <div key={index} className="text-sm text-muted-foreground flex items-start gap-2">
            <MapPin className="h-3 w-3 mt-1 flex-shrink-0" />
            <span>{activity}</span>
          </div>
        ))}
        {meal && (
          <div className="text-sm text-muted-foreground flex items-start gap-2">
            <Utensils className="h-3 w-3 mt-1 flex-shrink-0" />
            <span>{meal}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const DayCard: React.FC<DayCardProps> = ({ day }) => {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Day {day.day}</CardTitle>
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Full Day
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground font-medium">{day.title}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ActivitySection
          title="Morning"
          icon={<Coffee className="h-4 w-4 text-amber-600" />}
          activities={day.morning?.activities}
          meal={day.morning?.breakfast}
        />
        
        <ActivitySection
          title="Afternoon"
          icon={<MapPin className="h-4 w-4 text-blue-600" />}
          activities={day.afternoon?.activities}
          meal={day.afternoon?.lunch}
        />
        
        <ActivitySection
          title="Evening"
          icon={<Utensils className="h-4 w-4 text-purple-600" />}
          activities={day.evening?.activities}
          meal={day.evening?.dinner}
        />

        {day.evening?.local_travel && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-green-600" />
              <span className="font-medium text-sm">Transportation</span>
            </div>
            <p className="text-sm text-muted-foreground ml-6">{day.evening.local_travel}</p>
          </div>
        )}

        {day.hotel_recommendations && day.hotel_recommendations.length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Hotel className="h-4 w-4 text-indigo-600" />
              <span className="font-medium text-sm">Hotel Recommendations</span>
            </div>
            <div className="ml-6 space-y-1">
              {day.hotel_recommendations.map((hotel, index) => (
                <p key={index} className="text-sm text-muted-foreground">{hotel}</p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const AIItineraryDisplay: React.FC<AIItineraryDisplayProps> = ({ itinerary }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">AI Generated Itinerary</h3>
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          {itinerary.days.length} Days Planned
        </Badge>
      </div>

      <div className="space-y-4">
        {itinerary.days.map((day) => (
          <DayCard key={day.day} day={day} />
        ))}
      </div>

      {itinerary.closing_note && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-medium mb-2">Travel Tips</h4>
                <p className="text-sm text-muted-foreground">{itinerary.closing_note}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
