import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate, Enums } from "@/integrations/supabase/types";
import { useQueryClient } from "@tanstack/react-query";

export type ItineraryItemType = Enums<'itinerary_item_type'>;

interface ItineraryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  item?: Tables<"itinerary_items"> | null;
}

export const ItineraryItemDialog: React.FC<ItineraryItemDialogProps> = ({ open, onOpenChange, tripId, item }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!item;

  const [title, setTitle] = useState("");
  const [type, setType] = useState<ItineraryItemType>('activity');
  const [dayNumber, setDayNumber] = useState<number | undefined>(undefined);
  const [timeSlot, setTimeSlot] = useState<string | undefined>(undefined);
  const [startTime, setStartTime] = useState<string | undefined>(undefined);
  const [endTime, setEndTime] = useState<string | undefined>(undefined);
  const [locationName, setLocationName] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState<string | undefined>(undefined);
  const [activityDescription, setActivityDescription] = useState<string | undefined>(undefined);
  const [foodSuggestion, setFoodSuggestion] = useState<string | undefined>(undefined);
  const [externalLink, setExternalLink] = useState<string | undefined>(undefined);
  const [allDay, setAllDay] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (item) {
        setTitle(item.title || "");
        setType((item.type as ItineraryItemType) || "activity");
        setDayNumber(item.day_number ?? undefined);
        setTimeSlot(item.time_slot ?? undefined);
        setStartTime(item.start_time ?? undefined);
        setEndTime(item.end_time ?? undefined);
        setLocationName(item.location_name ?? undefined);
        setNotes(item.notes ?? undefined);
        setActivityDescription(item.activity_description ?? undefined);
        setFoodSuggestion(item.food_suggestion ?? undefined);
        setExternalLink(item.external_link ?? undefined);
        setAllDay(!!item.all_day);
      } else {
        // reset for create
        setTitle("");
        setType('activity');
        setDayNumber(undefined);
        setTimeSlot(undefined);
        setStartTime(undefined);
        setEndTime(undefined);
        setLocationName(undefined);
        setNotes(undefined);
        setActivityDescription(undefined);
        setFoodSuggestion(undefined);
        setExternalLink(undefined);
        setAllDay(false);
      }
    }
  }, [open, item]);

  const typeOptions: { value: ItineraryItemType; label: string }[] = useMemo(
    () => [
      { value: "activity", label: "Activity" },
      { value: "food", label: "Food" },
      { value: "transport", label: "Transport" },
      { value: "flight", label: "Flight" },
      { value: "lodging", label: "Lodging" },
      { value: "note", label: "Note" },
      { value: "other", label: "Other" },
    ], []
  );

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Title required", description: "Please enter a title.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (!isEdit) {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;
        if (!userId) throw new Error("You must be logged in to create activities");

        const payload: TablesInsert<'itinerary_items'> = {
          trip_id: tripId,
          created_by: userId,
          title: title.trim(),
          type,
          day_number: dayNumber ?? null,
          time_slot: timeSlot ?? null,
          start_time: startTime ?? null,
          end_time: endTime ?? null,
          location_name: locationName ?? null,
          notes: notes ?? null,
          activity_description: activityDescription ?? null,
          food_suggestion: foodSuggestion ?? null,
          external_link: externalLink ?? null,
          is_ai_generated: false,
          all_day: allDay,
          order_index: null,
        };

        const { error } = await supabase.from('itinerary_items').insert(payload);
        if (error) throw error;
        toast({ title: "Activity added" });
      } else if (item) {
        const payload: TablesUpdate<'itinerary_items'> = {
          title: title.trim(),
          type,
          day_number: dayNumber ?? null,
          time_slot: timeSlot ?? null,
          start_time: startTime ?? null,
          end_time: endTime ?? null,
          location_name: locationName ?? null,
          notes: notes ?? null,
          activity_description: activityDescription ?? null,
          food_suggestion: foodSuggestion ?? null,
          external_link: externalLink ?? null,
          all_day: allDay,
        };
        const { error } = await supabase.from('itinerary_items').update(payload).eq('id', item.id);
        if (error) throw error;
        toast({ title: "Activity updated" });
      }

      // Refresh data: trip summary and itinerary items list
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['itinerary-items', tripId] });
      onOpenChange(false);
    } catch (e: unknown) {
      toast({ title: isEdit ? "Failed to update" : "Failed to create", description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('itinerary_items').delete().eq('id', item.id);
      if (error) throw error;
      toast({ title: "Activity deleted" });
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['itinerary-items', tripId] });
      onOpenChange(false);
    } catch (e: unknown) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update details for this activity.' : 'Create a new activity for your trip.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Visit Charminar" />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v: string) => setType(v as ItineraryItemType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="day">Day #</Label>
            <Input id="day" type="number" min={1} value={dayNumber ?? ''} onChange={(e) => setDayNumber(e.target.value ? Number(e.target.value) : undefined)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeSlot">Time Slot</Label>
            <Input id="timeSlot" value={timeSlot ?? ''} onChange={(e) => setTimeSlot(e.target.value || undefined)} placeholder="Morning / Afternoon / Evening" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="start">Start Time (ISO)</Label>
            <Input id="start" value={startTime ?? ''} onChange={(e) => setStartTime(e.target.value || undefined)} placeholder="2025-09-01T09:00:00Z" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end">End Time (ISO)</Label>
            <Input id="end" value={endTime ?? ''} onChange={(e) => setEndTime(e.target.value || undefined)} placeholder="2025-09-01T11:00:00Z" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={locationName ?? ''} onChange={(e) => setLocationName(e.target.value || undefined)} placeholder="Location name" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={activityDescription ?? ''} onChange={(e) => setActivityDescription(e.target.value || undefined)} placeholder="What is this activity about?" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes ?? ''} onChange={(e) => setNotes(e.target.value || undefined)} placeholder="Additional notes" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="food">Food Suggestion</Label>
            <Input id="food" value={foodSuggestion ?? ''} onChange={(e) => setFoodSuggestion(e.target.value || undefined)} placeholder="Try the local biryani nearby" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="link">External Link</Label>
            <Input id="link" value={externalLink ?? ''} onChange={(e) => setExternalLink(e.target.value || undefined)} placeholder="https://..." />
          </div>

          <div className="flex items-center gap-2 md:col-span-2">
            <Checkbox id="allday" checked={allDay} onCheckedChange={(v) => setAllDay(!!v)} />
            <Label htmlFor="allday">All Day</Label>
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t">
          {isEdit ? (
            <Button variant="outline" onClick={handleDelete} disabled={loading}>
              Delete
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>{isEdit ? 'Save Changes' : 'Create Activity'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
