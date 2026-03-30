import React, { useState, useRef, useEffect } from 'react';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, List, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EnhancedItineraryItem, ActivityType, ACTIVITY_TYPE_COLORS } from '@/types/trip';
import { ActivityCard } from './ActivityCard';

interface MobileCalendarViewProps {
  tripId: string;
  startDate: string;
  endDate: string;
  activities: EnhancedItineraryItem[];
  onActivityClick?: (activity: EnhancedItineraryItem) => void;
  onActivityMove?: (activityId: string, newDay: number, newTimeSlot: string) => void;
  onAddActivity?: (dayNumber: number) => void;
  className?: string;
}

export function MobileCalendarView({
  tripId,
  startDate,
  endDate,
  activities,
  onActivityClick,
  onActivityMove,
  onAddActivity,
  className = ''
}: MobileCalendarViewProps) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const tripStart = parseISO(startDate);
  const tripEnd = parseISO(endDate);
  const totalDays = differenceInDays(tripEnd, tripStart) + 1;

  // Group activities by day
  const activitiesByDay = React.useMemo(() => {
    const grouped: Record<number, EnhancedItineraryItem[]> = {};
    
    activities.forEach(activity => {
      const day = activity.day_number;
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(activity);
    });

    // Sort activities within each day by time slot
    Object.keys(grouped).forEach(day => {
      grouped[parseInt(day)].sort((a, b) => {
        const timeA = a.time_slot?.split(' - ')[0] || '00:00';
        const timeB = b.time_slot?.split(' - ')[0] || '00:00';
        return timeA.localeCompare(timeB);
      });
    });

    return grouped;
  }, [activities]);

  const getCurrentDate = (dayNumber: number) => {
    return addDays(tripStart, dayNumber - 1);
  };

  // Touch gesture handling for swipe navigation
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && selectedDay < totalDays) {
      setSelectedDay(prev => prev + 1);
    }
    if (isRightSwipe && selectedDay > 1) {
      setSelectedDay(prev => prev - 1);
    }
  };

  // Auto-scroll to current time
  useEffect(() => {
    const currentHour = new Date().getHours();
    if (scrollRef.current && currentHour >= 6 && currentHour <= 23) {
      const timeSlotHeight = 80; // Approximate height of each time slot
      const scrollPosition = (currentHour - 6) * timeSlotHeight;
      scrollRef.current.scrollTop = scrollPosition;
    }
  }, [selectedDay]);

  const dayActivities = activitiesByDay[selectedDay] || [];

  return (
    <div className={`h-screen flex flex-col ${className}`}>
      {/* Fixed header */}
      <div className="bg-background border-b p-4 space-y-3">
        {/* Trip info */}
        <div className="text-center">
          <h2 className="font-semibold text-lg">Trip Itinerary</h2>
          <p className="text-sm text-muted-foreground">
            {format(tripStart, 'MMM d')} - {format(tripEnd, 'MMM d, yyyy')} • {totalDays} days
          </p>
        </div>

        {/* Day navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDay(prev => Math.max(1, prev - 1))}
            disabled={selectedDay === 1}
            className="h-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="text-center flex-1 mx-4">
            <div className="font-medium">Day {selectedDay}</div>
            <div className="text-xs text-muted-foreground">
              {format(getCurrentDate(selectedDay), 'EEE, MMM d')}
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDay(prev => Math.min(totalDays, prev + 1))}
            disabled={selectedDay === totalDays}
            className="h-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Day indicators */}
        <div className="flex gap-1 overflow-x-auto pb-2">
          {Array.from({ length: totalDays }, (_, i) => i + 1).map(dayNum => {
            const dayActivitiesCount = activitiesByDay[dayNum]?.length || 0;
            return (
              <button
                key={dayNum}
                onClick={() => setSelectedDay(dayNum)}
                className={`
                  flex-shrink-0 w-12 h-12 rounded-lg border-2 flex flex-col items-center justify-center text-xs
                  ${selectedDay === dayNum 
                    ? 'border-primary bg-primary text-primary-foreground' 
                    : 'border-muted bg-background'
                  }
                `}
              >
                <span className="font-medium">{dayNum}</span>
                {dayActivitiesCount > 0 && (
                  <span className="text-xs opacity-70">{dayActivitiesCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Activity count and add button */}
        <div className="flex items-center justify-between">
          <Badge variant="secondary">
            {dayActivities.length} activities
          </Badge>
          <Button
            size="sm"
            onClick={() => onAddActivity?.(selectedDay)}
            className="h-8"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Scrollable content */}
      <div 
        className="flex-1 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="p-4 space-y-4">
            {dayActivities.length > 0 ? (
              dayActivities.map(activity => (
                <div key={activity.id} className="relative">
                  <ActivityCard
                    activity={activity}
                    onClick={() => onActivityClick?.(activity)}
                    showDay={false}
                    className="touch-manipulation"
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No activities planned</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add some activities to get started
                </p>
                <Button onClick={() => onAddActivity?.(selectedDay)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Activity
                </Button>
              </div>
            )}

            {/* Time-based grouping for better mobile UX */}
            {dayActivities.length > 0 && (
              <div className="mt-8 space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Timeline</h4>
                {getTimelineGroups(dayActivities).map((group, index) => (
                  <div key={index} className="border-l-2 border-muted pl-4 ml-2">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      {group.timeRange}
                    </div>
                    <div className="space-y-2">
                      {group.activities.map(activity => (
                        <div
                          key={activity.id}
                          className="text-sm p-2 bg-muted/30 rounded border-l-2"
                          style={{
                            borderLeftColor: ACTIVITY_TYPE_COLORS[activity.activity_type || ActivityType.SIGHTSEEING]
                          }}
                          onClick={() => onActivityClick?.(activity)}
                        >
                          <div className="font-medium">{activity.activity_name}</div>
                          {activity.location && (
                            <div className="text-xs text-muted-foreground">{activity.location}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// Helper function to group activities by time periods
function getTimelineGroups(activities: EnhancedItineraryItem[]) {
  const groups: { timeRange: string; activities: EnhancedItineraryItem[] }[] = [];
  
  const timeRanges = [
    { label: 'Morning (6-12)', start: 6, end: 12 },
    { label: 'Afternoon (12-17)', start: 12, end: 17 },
    { label: 'Evening (17-22)', start: 17, end: 22 },
    { label: 'Night (22-6)', start: 22, end: 24 },
  ];

  timeRanges.forEach(range => {
    const rangeActivities = activities.filter(activity => {
      if (!activity.time_slot) return false;
      const startTime = activity.time_slot.split(' - ')[0];
      const hour = parseInt(startTime.split(':')[0]);
      return hour >= range.start && hour < range.end;
    });

    if (rangeActivities.length > 0) {
      groups.push({
        timeRange: range.label,
        activities: rangeActivities
      });
    }
  });

  return groups;
}
