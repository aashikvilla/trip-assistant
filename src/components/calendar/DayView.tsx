import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EnhancedItineraryItem } from '@/types/trip';
import { ActivityCard } from './ActivityCard';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface DayViewProps {
  dayNumber: number;
  date: Date;
  activities: EnhancedItineraryItem[];
  onActivityClick?: (activity: EnhancedItineraryItem) => void;
  onActivityMove?: (activityId: string, newDay: number, newTimeSlot: string) => void;
  onActivityUpdate?: (activityId: string, updates: Partial<EnhancedItineraryItem>) => void;
  onAddActivity?: (dayNumber: number, timeSlot: string) => void;
}

// Generate time slots from 6 AM to 11 PM
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 6; hour <= 23; hour++) {
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
    slots.push({
      id: `${hour}:00`,
      label: `${startTime} - ${endTime}`,
      hour,
      displayTime: format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')
    });
  }
  return slots;
};

export function DayView({
  dayNumber,
  date,
  activities,
  onActivityClick,
  onActivityMove,
  onActivityUpdate,
  onAddActivity
}: DayViewProps) {
  const [draggedActivity, setDraggedActivity] = useState<string | null>(null);
  
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  // Group activities by time slot
  const activitiesByTimeSlot = useMemo(() => {
    const grouped: Record<string, EnhancedItineraryItem[]> = {};
    
    activities.forEach(activity => {
      const timeSlot = activity.time_slot || 'unscheduled';
      if (!grouped[timeSlot]) {
        grouped[timeSlot] = [];
      }
      grouped[timeSlot].push(activity);
    });

    return grouped;
  }, [activities]);

  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    setDraggedActivity(null);
    
    if (!result.destination) return;

    const activityId = result.draggableId;
    const newTimeSlot = result.destination.droppableId;
    
    if (result.source.droppableId !== newTimeSlot) {
      onActivityMove?.(activityId, dayNumber, newTimeSlot);
    }
  };

  const handleDragStart = (start: any) => {
    setDraggedActivity(start.draggableId);
  };

  const handleAddActivity = (timeSlot: string) => {
    onAddActivity?.(dayNumber, timeSlot);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span>Day {dayNumber} - {format(date, 'EEEE, MMMM d')}</span>
          <div className="text-sm text-muted-foreground">
            {activities.length} activities planned
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
          <ScrollArea className="h-[600px]">
            <div className="space-y-1 p-4">
              {/* Unscheduled activities */}
              {activitiesByTimeSlot.unscheduled && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Unscheduled Activities
                  </h4>
                  <Droppable droppableId="unscheduled">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`
                          min-h-[60px] p-2 rounded-lg border-2 border-dashed
                          ${snapshot.isDraggingOver 
                            ? 'border-primary bg-primary/5' 
                            : 'border-muted-foreground/20'
                          }
                        `}
                      >
                        <div className="space-y-2">
                          {activitiesByTimeSlot.unscheduled.map((activity, index) => (
                            <Draggable
                              key={activity.id}
                              draggableId={activity.id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <ActivityCard
                                    activity={activity}
                                    onClick={() => onActivityClick?.(activity)}
                                    showDay={false}
                                    isDragging={snapshot.isDragging}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                        </div>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )}

              {/* Time slots */}
              {timeSlots.map((slot) => {
                const slotActivities = activitiesByTimeSlot[slot.label] || [];
                const isEarlyMorning = slot.hour < 8;
                const isLateNight = slot.hour > 21;
                
                return (
                  <div
                    key={slot.id}
                    className={`
                      grid grid-cols-[80px_1fr] gap-4 min-h-[80px] py-2
                      ${isEarlyMorning || isLateNight ? 'opacity-60' : ''}
                    `}
                  >
                    {/* Time label */}
                    <div className="flex flex-col items-end justify-start pt-2">
                      <div className="text-sm font-medium">
                        {format(new Date().setHours(slot.hour, 0, 0, 0), 'h:mm')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date().setHours(slot.hour, 0, 0, 0), 'a')}
                      </div>
                    </div>

                    {/* Activity slot */}
                    <Droppable droppableId={slot.label}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`
                            min-h-[60px] rounded-lg border-2 border-dashed transition-colors
                            ${snapshot.isDraggingOver 
                              ? 'border-primary bg-primary/5' 
                              : slotActivities.length > 0 
                                ? 'border-transparent' 
                                : 'border-muted-foreground/10 hover:border-muted-foreground/20'
                            }
                          `}
                        >
                          {slotActivities.length > 0 ? (
                            <div className="space-y-2 p-2">
                              {slotActivities.map((activity, index) => (
                                <Draggable
                                  key={activity.id}
                                  draggableId={activity.id}
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                    >
                                      <ActivityCard
                                        activity={activity}
                                        onClick={() => onActivityClick?.(activity)}
                                        showDay={false}
                                        isDragging={snapshot.isDragging}
                                      />
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center p-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => handleAddActivity(slot.label)}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Add Activity
                              </Button>
                            </div>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DragDropContext>
      </CardContent>
    </Card>
  );
}
