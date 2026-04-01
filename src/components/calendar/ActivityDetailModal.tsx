import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  Clock, MapPin, ExternalLink, Utensils, Info, DollarSign, 
  Edit2, Save, X, Calendar, Tag, AlertCircle, CheckCircle 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnhancedItineraryItem, ActivityType, ACTIVITY_TYPE_COLORS } from '@/types/trip';

interface ActivityDetailModalProps {
  activity: EnhancedItineraryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (activityId: string, updates: Partial<EnhancedItineraryItem>) => void;
  onDelete?: (activityId: string) => void;
  readOnly?: boolean;
}

export function ActivityDetailModal({
  activity,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  readOnly = false
}: ActivityDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedActivity, setEditedActivity] = useState<Partial<EnhancedItineraryItem>>({});
  const [isDeleting, setIsDeleting] = useState(false);

  if (!activity) return null;

  const activityTypeColor = ACTIVITY_TYPE_COLORS[activity.activity_type || ActivityType.SIGHTSEEING];

  const handleEdit = () => {
    setEditedActivity({
      activity_name: activity.activity_name,
      description: activity.description,
      location: activity.location,
      time_slot: activity.time_slot,
      duration_minutes: activity.duration_minutes,
      cost_estimate: activity.cost_estimate,
      trivia: activity.trivia,
      food_suggestion: activity.food_suggestion,
      external_link: activity.external_link,
      activity_type: activity.activity_type,
      booking_required: activity.booking_required,
      weather_dependent: activity.weather_dependent,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onUpdate && activity.id) {
      onUpdate(activity.id, editedActivity);
    }
    setIsEditing(false);
    setEditedActivity({});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedActivity({});
  };

  const handleDelete = () => {
    if (onDelete && activity.id) {
      onDelete(activity.id);
      onClose();
    }
  };

  const handleExternalLink = () => {
    if (activity.external_link) {
      window.open(activity.external_link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: activityTypeColor }}
            />
            {isEditing ? (
              <Input
                value={editedActivity.activity_name || ''}
                onChange={(e) => setEditedActivity(prev => ({ ...prev, activity_name: e.target.value }))}
                className="text-lg font-semibold"
              />
            ) : (
              activity.activity_name
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Day {activity.day_number}</Badge>
            <Badge 
              variant="secondary"
              style={{ 
                backgroundColor: `${activityTypeColor}15`,
                color: activityTypeColor,
                borderColor: `${activityTypeColor}30`
              }}
            >
              {activity.activity_type?.replace('_', ' ')}
            </Badge>
            {activity.is_ai_generated && (
              <Badge variant="outline">AI Generated</Badge>
            )}
            {activity.booking_required && (
              <Badge variant="destructive">Booking Required</Badge>
            )}
            {activity.weather_dependent && (
              <Badge variant="secondary">Weather Dependent</Badge>
            )}
          </div>

          {/* Time and duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time Slot
              </Label>
              {isEditing ? (
                <Input
                  value={editedActivity.time_slot || ''}
                  onChange={(e) => setEditedActivity(prev => ({ ...prev, time_slot: e.target.value }))}
                  placeholder="e.g., 09:00 - 11:00"
                />
              ) : (
                <p className="text-sm">{activity.time_slot || 'Not scheduled'}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Duration
              </Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editedActivity.duration_minutes || ''}
                  onChange={(e) => setEditedActivity(prev => ({ 
                    ...prev, 
                    duration_minutes: parseInt(e.target.value) || undefined 
                  }))}
                  placeholder="Minutes"
                />
              ) : (
                <p className="text-sm">
                  {activity.duration_minutes 
                    ? `${Math.floor(activity.duration_minutes / 60)}h ${activity.duration_minutes % 60}m`
                    : 'Not specified'
                  }
                </p>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </Label>
            {isEditing ? (
              <Input
                value={editedActivity.location || ''}
                onChange={(e) => setEditedActivity(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Enter location"
              />
            ) : (
              <p className="text-sm">{activity.location || 'Location not specified'}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            {isEditing ? (
              <Textarea
                value={editedActivity.description || ''}
                onChange={(e) => setEditedActivity(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Activity description"
                rows={3}
              />
            ) : (
              <p className="text-sm">{activity.description}</p>
            )}
          </div>

          {/* Activity type and settings */}
          {isEditing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Activity Type</Label>
                <Select
                  value={editedActivity.activity_type || activity.activity_type}
                  onValueChange={(value) => setEditedActivity(prev => ({ 
                    ...prev, 
                    activity_type: value as ActivityType 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ActivityType).map(type => (
                      <SelectItem key={type} value={type}>
                        {type.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="booking-required"
                    checked={editedActivity.booking_required ?? activity.booking_required}
                    onCheckedChange={(checked) => setEditedActivity(prev => ({ 
                      ...prev, 
                      booking_required: checked 
                    }))}
                  />
                  <Label htmlFor="booking-required">Booking Required</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="weather-dependent"
                    checked={editedActivity.weather_dependent ?? activity.weather_dependent}
                    onCheckedChange={(checked) => setEditedActivity(prev => ({ 
                      ...prev, 
                      weather_dependent: checked 
                    }))}
                  />
                  <Label htmlFor="weather-dependent">Weather Dependent</Label>
                </div>
              </div>
            </div>
          )}

          {/* Cost estimate */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Cost Estimate
            </Label>
            {isEditing ? (
              <Input
                value={editedActivity.cost_estimate || ''}
                onChange={(e) => setEditedActivity(prev => ({ ...prev, cost_estimate: e.target.value }))}
                placeholder="e.g., $25-50"
              />
            ) : (
              <p className="text-sm">{activity.cost_estimate || 'Not specified'}</p>
            )}
          </div>

          {/* External link */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              External Link
            </Label>
            {isEditing ? (
              <Input
                value={editedActivity.external_link || ''}
                onChange={(e) => setEditedActivity(prev => ({ ...prev, external_link: e.target.value }))}
                placeholder="https://..."
              />
            ) : activity.external_link ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExternalLink}
                className="w-fit"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Link
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">No link provided</p>
            )}
          </div>

          {/* Trivia */}
          {(activity.trivia || isEditing) && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                Trivia
              </Label>
              {isEditing ? (
                <Textarea
                  value={editedActivity.trivia || ''}
                  onChange={(e) => setEditedActivity(prev => ({ ...prev, trivia: e.target.value }))}
                  placeholder="Interesting facts about this activity"
                  rows={2}
                />
              ) : (
                <p className="text-sm bg-blue-50 p-3 rounded-lg border-l-4 border-blue-200">
                  {activity.trivia}
                </p>
              )}
            </div>
          )}

          {/* Food suggestion */}
          {(activity.food_suggestion || isEditing) && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                Food Suggestion
              </Label>
              {isEditing ? (
                <Textarea
                  value={editedActivity.food_suggestion || ''}
                  onChange={(e) => setEditedActivity(prev => ({ ...prev, food_suggestion: e.target.value }))}
                  placeholder="Recommended food or dining options"
                  rows={2}
                />
              ) : (
                <p className="text-sm bg-amber-50 p-3 rounded-lg border-l-4 border-amber-200">
                  {activity.food_suggestion}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {!readOnly && !isEditing && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleting(true)}
              >
                Delete Activity
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                {!readOnly && (
                  <Button onClick={handleEdit}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Activity
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogFooter>

        {/* Delete confirmation */}
        {isDeleting && (
          <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  Delete Activity
                </DialogTitle>
              </DialogHeader>
              <p>Are you sure you want to delete "{activity.activity_name}"? This action cannot be undone.</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleting(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
