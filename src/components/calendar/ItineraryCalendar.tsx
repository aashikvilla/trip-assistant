import React, { useState, useMemo } from 'react';
import { format, addDays, differenceInDays, parseISO, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, List } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { EnhancedItineraryItem, ActivityType, ACTIVITY_TYPE_COLORS } from '@/types/trip';
import { DayView } from './DayView';
import { WeekView } from './WeekView';
import { ActivityCard } from './ActivityCard';

interface ItineraryCalendarProps {
  tripId: string;
  startDate: string;
  endDate: string;
  activities: EnhancedItineraryItem[];
  onActivityClick?: (activity: EnhancedItineraryItem) => void;
  onActivityMove?: (activityId: string, newDay: number, newTimeSlot: string) => void;
  onActivityUpdate?: (activityId: string, updates: Partial<EnhancedItineraryItem>) => void;
  className?: string;
}

type ViewType = 'day' | 'week' | 'list';

export function ItineraryCalendar({
  tripId,
  startDate,
  endDate,
  activities,
  onActivityClick,
  onActivityMove,
  onActivityUpdate,
  className = ''
}: ItineraryCalendarProps) {
  const [currentView, setCurrentView] = useState<ViewType>('day');
  const [selectedDay, setSelectedDay] = useState(1);

  // Calculate trip details
  const tripStart = useMemo(() => parseISO(startDate), [startDate]);
  const tripEnd = useMemo(() => parseISO(endDate), [endDate]);
  const totalDays = useMemo(() => differenceInDays(tripEnd, tripStart) + 1, [tripStart, tripEnd]);

  // Group activities by day
  const activitiesByDay = useMemo(() => {
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

  // Get current day date
  const getCurrentDate = (dayNumber: number) => {
    return addDays(tripStart, dayNumber - 1);
  };

  // Navigation handlers
  const goToPreviousDay = () => {
    setSelectedDay(prev => Math.max(1, prev - 1));
  };

  const goToNextDay = () => {
    setSelectedDay(prev => Math.min(totalDays, prev + 1));
  };

  // Activity statistics
  const dayStats = useMemo(() => {
    const stats: Record<number, { total: number; byType: Record<ActivityType, number> }> = {};
    
    Object.entries(activitiesByDay).forEach(([day, dayActivities]) => {
      const dayNum = parseInt(day);
      stats[dayNum] = {
        total: dayActivities.length,
        byType: {} as Record<ActivityType, number>
      };
      
      dayActivities.forEach(activity => {
        const type = activity.activity_type || ActivityType.SIGHTSEEING;
        stats[dayNum].byType[type] = (stats[dayNum].byType[type] || 0) + 1;
      });
    });
    
    return stats;
  }, [activitiesByDay]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with view controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Trip Itinerary
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={currentView === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('day')}
              >
                <Calendar className="w-4 h-4 mr-1" />
                Day
              </Button>
              <Button
                variant={currentView === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('week')}
              >
                <Calendar className="w-4 h-4 mr-1" />
                Week
              </Button>
              <Button
                variant={currentView === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('list')}
              >
                <List className="w-4 h-4 mr-1" />
                List
              </Button>
            </div>
          </div>
          
          {/* Trip overview */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{format(tripStart, 'MMM d')} - {format(tripEnd, 'MMM d, yyyy')}</span>
            <span>•</span>
            <span>{totalDays} days</span>
            <span>•</span>
            <span>{activities.length} activities</span>
          </div>
        </CardHeader>
      </Card>

      {/* Day navigation for day view */}
      {currentView === 'day' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousDay}
                disabled={selectedDay === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              
              <div className="text-center">
                <h3 className="font-semibold">
                  Day {selectedDay} - {format(getCurrentDate(selectedDay), 'EEEE, MMM d')}
                </h3>
                <div className="flex items-center justify-center gap-2 mt-1">
                  {dayStats[selectedDay] && (
                    <>
                      <Badge variant="secondary">
                        {dayStats[selectedDay].total} activities
                      </Badge>
                      {Object.entries(dayStats[selectedDay].byType).map(([type, count]) => (
                        <Badge
                          key={type}
                          variant="outline"
                          style={{ 
                            borderColor: ACTIVITY_TYPE_COLORS[type as ActivityType],
                            color: ACTIVITY_TYPE_COLORS[type as ActivityType]
                          }}
                        >
                          {count} {type}
                        </Badge>
                      ))}
                    </>
                  )}
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextDay}
                disabled={selectedDay === totalDays}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar content based on view */}
      <div className="min-h-[600px]">
        {currentView === 'day' && (
          <DayView
            dayNumber={selectedDay}
            date={getCurrentDate(selectedDay)}
            activities={activitiesByDay[selectedDay] || []}
            onActivityClick={onActivityClick}
            onActivityMove={onActivityMove}
            onActivityUpdate={onActivityUpdate}
          />
        )}
        
        {currentView === 'week' && (
          <WeekView
            startDate={tripStart}
            totalDays={totalDays}
            activitiesByDay={activitiesByDay}
            onDaySelect={setSelectedDay}
            onActivityClick={onActivityClick}
          />
        )}
        
        {currentView === 'list' && (
          <div className="space-y-4">
            {Array.from({ length: totalDays }, (_, i) => i + 1).map(dayNumber => (
              <Card key={dayNumber}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Day {dayNumber} - {format(getCurrentDate(dayNumber), 'EEEE, MMM d')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activitiesByDay[dayNumber]?.length > 0 ? (
                    <div className="space-y-2">
                      {activitiesByDay[dayNumber].map(activity => (
                        <ActivityCard
                          key={activity.id}
                          activity={activity}
                          onClick={() => onActivityClick?.(activity)}
                          showDay={false}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No activities planned</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
