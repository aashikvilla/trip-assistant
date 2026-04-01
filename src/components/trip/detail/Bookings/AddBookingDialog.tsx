import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { 
  useCreateBooking, 
  useUpdateBooking, 
  type Booking, 
  type BookingType, 
  type Json, 
  type UpdateBookingInput 
} from '@/hooks/useBookings';
import { useItineraryItems, type ItineraryItem } from '@/hooks/useItineraryItems';
import { ItineraryItemSelector } from './ItineraryItemSelector';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, FileText, ExternalLink, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';

interface AddBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  booking?: Booking | null;
  // Optional prop to pre-select an itinerary item when creating a booking from the itinerary
  initialItineraryItemId?: string | null;
  // Optional initial values for the form
  initialValues?: Partial<{
    type: BookingType;
    provider: string;
    confirmation_code: string;
    start_time: string;
    end_time: string;
    details?: BookingDetails;
  }>;
}

type BookingDetails = {
  url?: string;
  notes?: string;
  location?: string;
  external_link?: string;
  files?: string[];
  [key: string]: unknown;
};

const TYPES: { value: BookingType; label: string }[] = [
  { value: 'flight', label: 'Flight' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'car', label: 'Car' },
  { value: 'activity', label: 'Activity/Reservation' },
  { value: 'other', label: 'Other' },
];

export const AddBookingDialog: React.FC<AddBookingDialogProps> = (props) => {
  const { 
    open, 
    onOpenChange, 
    tripId, 
    booking,
    initialValues = {},
    initialItineraryItemId = '' 
  } = props;
  const { user } = useAuth();
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();

  const isEditing = !!booking;
  const isLoading = createBooking.isPending || updateBooking.isPending;
  const { data: itineraryItems = [] } = useItineraryItems(tripId);

  // Helpers to convert between ISO strings and input[type=datetime-local] values
  const toLocalInputValue = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const toISO = (local?: string) => {
    if (!local) return null;
    const d = new Date(local);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  // Initialize form state with default values or initialValues
  const [form, setForm] = useState<{
    type: BookingType;
    provider: string;
    confirmation_code: string;
    start_time: string;
    end_time: string;
    url: string;
    notes: string;
    itinerary_item_id: string;
  }>(() => {
    const details = initialValues?.details as BookingDetails | undefined;
    return {
      type: initialValues?.type || 'flight',
      provider: initialValues?.provider || '',
      confirmation_code: initialValues?.confirmation_code || '',
      start_time: initialValues?.start_time || '',
      end_time: initialValues?.end_time || '',
      url: details?.url || '',
      notes: details?.notes || '',
      itinerary_item_id: initialItineraryItemId || '',
    };
  });
  const [files, setFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);

  // Reset form when opening the dialog or when booking changes
  useEffect(() => {
    if (!open) {
      // Reset form when closing the dialog
      setForm({
        type: 'flight',
        provider: '',
        confirmation_code: '',
        start_time: '',
        end_time: '',
        url: '',
        notes: '',
        itinerary_item_id: initialItineraryItemId || '',
      });
      setFiles([]);
      setExistingFiles([]);
      return;
    }
    
    // When opening the dialog with a booking to edit
    if (booking) {
      const d = (booking.details as BookingDetails | null | undefined) || {};
      // Try to infer linked itinerary by matching itinerary_items.booking_id
      const linked = itineraryItems.find(it => it.booking_id === booking.id);
      setForm({
        type: (booking.type as BookingType) || 'flight',
        provider: booking.provider || '',
        confirmation_code: booking.confirmation_code || '',
        start_time: toLocalInputValue(booking.start_time),
        end_time: toLocalInputValue(booking.end_time),
        url: d.url || '',
        notes: d.notes || '',
        // bookings table does not have itinerary link; show the linked one if exists
        itinerary_item_id: linked?.id || initialItineraryItemId || '',
      });
      setFiles([]);
      setExistingFiles(d.files || []);
    } else if (initialValues) {
      // When opening with initial values (e.g., from itinerary)
      const details = initialValues.details as BookingDetails | undefined;
      setForm({
        type: (initialValues.type as BookingType) || 'flight',
        provider: initialValues.provider || '',
        confirmation_code: initialValues.confirmation_code || '',
        start_time: toLocalInputValue(initialValues.start_time),
        end_time: toLocalInputValue(initialValues.end_time),
        url: details?.url || '',
        notes: details?.notes || '',
        itinerary_item_id: initialItineraryItemId || '',
      });
      setFiles([]);
      setExistingFiles(details?.files || []);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, booking, initialItineraryItemId, itineraryItems]);

  const details = useMemo(() => {
    const d: Record<string, unknown> = {};
    if (form.url) d.url = form.url;
    if (form.notes) d.notes = form.notes;
    if (existingFiles.length > 0) d.files = [...existingFiles];
    return d;
  }, [form.url, form.notes, existingFiles]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItineraryItemSelect = (itemId: string) => {
    setForm(prev => ({
      ...prev,
      itinerary_item_id: itemId
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (!form.type) {
        toast.error('Select a booking type');
        return;
      }
      
      // Prepare booking data with proper types
      const bookingData = {
        trip_id: tripId,
        created_by: user.id,
        type: form.type,
        provider: form.provider,
        confirmation_code: form.confirmation_code,
        start_time: toISO(form.start_time),
        end_time: toISO(form.end_time),
        details: details as unknown as Json, // Cast to Json type
      };

      let saved: Booking;
      if (isEditing && booking) {
        // For updates, only include the fields that can be updated
        const updateData: UpdateBookingInput = {
          id: booking.id,
          type: form.type,
          provider: form.provider || null,
          confirmation_code: form.confirmation_code || null,
          start_time: toISO(form.start_time),
          end_time: toISO(form.end_time),
          details: details as unknown as Json,
        };
        saved = await updateBooking.mutateAsync(updateData);
      } else {
        // For new bookings, include all required fields
        saved = await createBooking.mutateAsync(bookingData);
      }

      // Link to itinerary item (the link is stored on itinerary_items.booking_id)
      if (form.itinerary_item_id) {
        const { error: linkErr } = await supabase
          .from('itinerary_items')
          .update({ booking_id: saved.id })
          .eq('id', form.itinerary_item_id);
        if (linkErr) {
          console.error('Failed to link itinerary item:', linkErr);
          toast.error('Saved booking, but failed to link to itinerary item');
        }
      }

      // Upload files if any (requires bucket 'bookings' with appropriate RLS)
      if (files.length > 0) {
        console.log(`Starting upload of ${files.length} files to bucket 'bookings'`);
        console.log(`Upload path will be: ${tripId}/${saved.id}/...`);
        const uploadedUrls: string[] = [];
        for (const file of files) {
          const path = `${tripId}/${saved.id}/${Date.now()}_${file.name}`;
          console.log(`Uploading file: ${file.name} to path: ${path}`);
          const { data, error } = await supabase.storage.from('bookings').upload(path, file, {
            upsert: false,
          });
          if (error) {
            console.error('Upload error for file:', file.name, error);
            toast.error(`Upload failed: ${error.message || 'RLS or bucket permissions'}`);
            continue;
          }
          console.log('Upload successful, data:', data);
          // Try public URL, or fall back to a short-lived signed URL
          const { data: pub } = supabase.storage.from('bookings').getPublicUrl(data.path);
          console.log('Public URL result:', pub);
          if (pub?.publicUrl) {
            console.log('Using public URL:', pub.publicUrl);
            uploadedUrls.push(pub.publicUrl);
          } else {
            console.log('Public URL not available, trying signed URL');
            const { data: signed, error: signedErr } = await supabase.storage.from('bookings').createSignedUrl(data.path, 60 * 60);
            if (signedErr) {
              console.error('createSignedUrl error:', signedErr);
              toast.error(`Could not create access URL: ${signedErr.message}`);
            } else if (signed?.signedUrl) {
              console.log('Using signed URL:', signed.signedUrl);
              uploadedUrls.push(signed.signedUrl);
            }
          }
        }
        console.log(`Upload complete. ${uploadedUrls.length} URLs collected:`, uploadedUrls);
        // Update booking with file URLs if any were uploaded
        if (uploadedUrls.length > 0) {
          const allFiles = [...existingFiles, ...uploadedUrls];
          const currentDetails = saved.details as Record<string, unknown> || {};
          const newDetails = { ...currentDetails, files: allFiles };
          await updateBooking.mutateAsync({ 
            id: saved.id, 
            details: newDetails as unknown as Json 
          });
        }
      }

      toast.success(isEditing ? 'Booking updated' : 'Booking added');
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to save booking');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Booking' : 'Add Booking'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={form.type} 
                onValueChange={(value) => handleSelectChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Input 
                name="provider"
                value={form.provider} 
                onChange={handleInputChange} 
                placeholder="Airline / Hotel / Vendor" 
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmation Code</Label>
              <Input 
                name="confirmation_code"
                value={form.confirmation_code} 
                onChange={handleInputChange} 
                placeholder="ABC123" 
              />
            </div>
            <div className="space-y-2">
              <Label>Booking Link</Label>
              <Input 
                type="url" 
                name="url"
                value={form.url} 
                onChange={handleInputChange} 
                placeholder="https://your-booking-link" 
              />
            </div>
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="datetime-local"
                name="start_time"
                value={form.start_time}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="datetime-local"
                name="end_time"
                value={form.end_time}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Itinerary Item Selector */}
          <div className="col-span-full">
            <ItineraryItemSelector 
              tripId={tripId}
              value={form.itinerary_item_id}
              onChange={handleItineraryItemSelect}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea 
              name="notes"
              value={form.notes} 
              onChange={handleInputChange} 
              placeholder="Any important details..." 
            />
          </div>

          <div className="space-y-2">
            <Label>Attachments</Label>
            
            {/* Existing files */}
            {existingFiles.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Current files:</div>
                <div className="space-y-1">
                  {existingFiles.map((fileUrl, idx) => {
                    let fileName = `file-${idx + 1}`;
                    try { 
                      const u = new URL(fileUrl); 
                      fileName = decodeURIComponent(u.pathname.split('/').pop() || fileName); 
                    } catch {
                      // Ignore URL parsing errors, use default fileName
                    }
                    
                    return (
                      <div key={idx} className="flex items-center justify-between p-2 rounded border bg-muted/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm truncate">{fileName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(fileUrl, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setExistingFiles(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upload new files */}
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer hover:bg-muted">
                <Upload className="h-4 w-4" />
                <span>Upload new files</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
              </label>
              {files.length > 0 && <span className="text-sm text-muted-foreground">{files.length} new file(s) selected</span>}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Booking' : 'Add Booking'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
