import React from 'react';
import { Clock, MapPin, ExternalLink, Utensils, Info, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { EnhancedItineraryItem, ActivityType, ACTIVITY_TYPE_COLORS } from '@/types/trip';

interface ActivityCardProps {
  activity: EnhancedItineraryItem;
  onClick?: () => void;
  showDay?: boolean;
  isDragging?: boolean;
  className?: string;
}

export function ActivityCard({
  activity,
  onClick,
  showDay = true,
  isDragging = false,
  className = ''
}: ActivityCardProps) {
  const activityTypeColor = ACTIVITY_TYPE_COLORS[activity.activity_type || ActivityType.SIGHTSEEING];

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick?.();
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activity.external_link) {
      window.open(activity.external_link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card 
      className={`
        cursor-pointer transition-all duration-200 hover:shadow-md
        ${isDragging ? 'opacity-50 rotate-2 scale-105' : ''}
        ${className}
      `}
      onClick={handleCardClick}
      style={{
        borderLeft: `4px solid ${activityTypeColor}`
      }}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with title and badges */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm leading-tight truncate">
                {activity.activity_name}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                {showDay && (
                  <Badge variant="outline" className="text-xs">
                    Day {activity.day_number}
                  </Badge>
                )}
                <Badge 
                  variant="secondary" 
                  className="text-xs"
                  style={{ 
                    backgroundColor: `${activityTypeColor}15`,
                    color: activityTypeColor,
                    borderColor: `${activityTypeColor}30`
                  }}
                >
                  {activity.activity_type?.replace('_', ' ')}
                </Badge>
                {activity.is_ai_generated && (
                  <Badge variant="outline" className="text-xs">
                    AI
                  </Badge>
                )}
              </div>
            </div>
            
            {activity.external_link && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 flex-shrink-0"
                onClick={handleLinkClick}
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* Time and duration */}
          {activity.time_slot && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{activity.time_slot}</span>
              {activity.duration_minutes && (
                <span className="ml-1">
                  ({Math.floor(activity.duration_minutes / 60)}h {activity.duration_minutes % 60}m)
                </span>
              )}
            </div>
          )}

          {/* Location */}
          {activity.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{activity.location}</span>
            </div>
          )}

          {/* Description */}
          {activity.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {activity.description}
            </p>
          )}

          {/* Additional info row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Cost estimate */}
              {activity.cost_estimate && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <DollarSign className="w-3 h-3" />
                  <span>{activity.cost_estimate}</span>
                </div>
              )}

              {/* Food suggestion indicator */}
              {activity.food_suggestion && (
                <div className="flex items-center gap-1 text-xs text-amber-600">
                  <Utensils className="w-3 h-3" />
                </div>
              )}

              {/* Trivia indicator */}
              {activity.trivia && (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <Info className="w-3 h-3" />
                </div>
              )}
            </div>

            {/* Status indicators */}
            <div className="flex items-center gap-1">
              {activity.booking_required && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  Booking
                </Badge>
              )}
              {activity.weather_dependent && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  Weather
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
