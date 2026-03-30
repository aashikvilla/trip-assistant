import React from 'react';
import { format, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EnhancedItineraryItem, ActivityType, ACTIVITY_TYPE_COLORS } from '@/types/trip';
import { ActivityCard } from './ActivityCard';

interface WeekViewProps {
  startDate: Date;
  totalDays: number;
  activitiesByDay: Record<number, EnhancedItineraryItem[]>;
  onDaySelect?: (dayNumber: number) => void;
  onActivityClick?: (activity: EnhancedItineraryItem) => void;
}

export function WeekView({
  startDate,
  totalDays,
  activitiesByDay,
  onDaySelect,
  onActivityClick
}: WeekViewProps) {
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  const getDayDate = (dayNumber: number) => {
    return addDays(startDate, dayNumber - 1);
  };

  const getDayStats = (dayNumber: number) => {
    const activities = activitiesByDay[dayNumber] || [];
    const stats = {
      total: activities.length,
      byType: {} as Record<ActivityType, number>
    };

    activities.forEach(activity => {
      const type = activity.activity_type || ActivityType.SIGHTSEEING;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    return stats;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Trip Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {days.map(dayNumber => {
                const dayDate = getDayDate(dayNumber);
                const activities = activitiesByDay[dayNumber] || [];
                const stats = getDayStats(dayNumber);
                
                return (
                  <Card 
                    key={dayNumber}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onDaySelect?.(dayNumber)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          Day {dayNumber}
                        </CardTitle>
                        <Badge variant="secondary">
                          {stats.total} activities
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(dayDate, 'EEEE, MMM d')}
                      </p>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      {/* Activity type breakdown */}
                      {Object.keys(stats.byType).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(stats.byType).map(([type, count]) => (
                            <Badge
                              key={type}
                              variant="outline"
                              className="text-xs"
                              style={{ 
                                borderColor: ACTIVITY_TYPE_COLORS[type as ActivityType],
                                color: ACTIVITY_TYPE_COLORS[type as ActivityType]
                              }}
                            >
                              {count} {type.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Activity preview */}
                      {activities.length > 0 ? (
                        <div className="space-y-2">
                          {activities.slice(0, 3).map(activity => (
                            <div
                              key={activity.id}
                              className="text-xs p-2 bg-muted/50 rounded border-l-2"
                              style={{
                                borderLeftColor: ACTIVITY_TYPE_COLORS[activity.activity_type || ActivityType.SIGHTSEEING]
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onActivityClick?.(activity);
                              }}
                            >
                              <div className="font-medium truncate">
                                {activity.activity_name}
                              </div>
                              {activity.time_slot && (
                                <div className="text-muted-foreground">
                                  {activity.time_slot}
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {activities.length > 3 && (
                            <div className="text-xs text-muted-foreground text-center py-1">
                              +{activities.length - 3} more activities
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground text-center py-4">
                          No activities planned
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
