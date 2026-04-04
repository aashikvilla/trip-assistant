import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Clock, Calendar, MapPin } from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type ItineraryItem = Tables<'itinerary_items'>;

interface SimpleItineraryDisplayProps {
  activities: ItineraryItem[];
  startDate?: string;
  endDate?: string;
  onSelect?: (item: ItineraryItem) => void;
}

// Simplified view: we no longer surface type colors in the high-level list

const formatTime = (timeString?: string) => {
  if (!timeString) return null;
  try {
    return format(parseISO(timeString), 'h:mm a');
  } catch {
    return timeString;
  }
};

export function SimpleItineraryDisplay({ 
  activities, 
  startDate, 
  endDate,
  onSelect
}: SimpleItineraryDisplayProps) {
  // Group activities by day
  const activitiesByDay = activities.reduce((acc, activity) => {
    const day = activity.day_number || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(activity);
    return acc;
  }, {} as Record<number, ItineraryItem[]>);

  const sortedDays = Object.keys(activitiesByDay)
    .map(Number)
    .sort((a, b) => a - b);

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="font-medium mb-2">No activities yet</h4>
          <p className="text-sm text-muted-foreground">
            Your generated itinerary will appear here once it's ready.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {sortedDays.map((dayNumber) => {
        const dayActivities = activitiesByDay[dayNumber];
        
        return (
          <Card key={dayNumber} className="overflow-hidden bg-muted/30">
            <CardHeader className="bg-muted/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>Day {dayNumber}</span>
                {startDate && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {format(addDays(parseISO(startDate), dayNumber - 1), 'EEE, MMM d')}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-0">
                {dayActivities.map((activity, index) => (
                  <div 
                    key={activity.id}
                    role="button"
                    onClick={() => onSelect?.(activity)}
                    className={`p-4 border-l-4 border-l-transparent hover:border-l-primary hover:bg-muted/30 transition-colors cursor-pointer ${
                      index < dayActivities.length - 1 ? 'border-b' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex-none text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap pr-2 pt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>
                          {(() => {
                            const start = formatTime(activity.start_time);
                            const end = formatTime(activity.end_time);
                            if (start && end && start !== end) return `${start} - ${end}`;
                            return start || end || activity.time_slot || '—';
                          })()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{activity.title}</h4>
                        {activity.location_name && (
                          (activity as Tables<'itinerary_items'> & { maps_link?: string | null }).maps_link ? (
                            <a
                              href={(activity as Tables<'itinerary_items'> & { maps_link?: string | null }).maps_link!}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-xs text-primary hover:underline mt-0.5 w-fit"
                            >
                              <MapPin className="h-3 w-3" />
                              {activity.location_name}
                            </a>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {activity.location_name}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
