import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Define JSON type that matches Supabase's Json type
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Define a more specific type for booking details
export type BookingDetails = {
  url?: string;
  notes?: string;
  files?: string[];
  [key: string]: unknown;
};

// Type for the booking row in the database
type BookingRow = {
  id: string;
  trip_id: string;
  created_by: string;
  type: BookingType;
  provider: string | null;
  confirmation_code: string | null;
  start_time: string | null;
  end_time: string | null;
  itinerary_item_id: string | null;
  details: Json | null;
  created_at: string;
  updated_at: string;
  price?: number | null;
  currency?: string | null;
};

export type BookingType = 'flight' | 'hotel' | 'car' | 'activity' | 'other';

export type Booking = BookingRow;

export interface CreateBookingInput {
  trip_id: string;
  created_by: string;
  type: BookingType;
  provider?: string;
  confirmation_code?: string;
  start_time?: string; // ISO
  end_time?: string;   // ISO
  details?: unknown; // JSON
}

export interface UpdateBookingInput {
  id: string;
  type?: BookingType;
  provider?: string | null;
  confirmation_code?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  price?: number | null;
  currency?: string | null;
  itinerary_item_id?: string | null;
  details?: Json;
}

export const useBookings = (tripId: string) => {
  return useQuery<Booking[]>({
    queryKey: ['bookings', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('trip_id', tripId)
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data || []) as Booking[];
    },
    enabled: !!tripId,
  });
};

export const useCreateBooking = () => {
  const qc = useQueryClient();
  return useMutation<Booking, Error, CreateBookingInput>({
    mutationFn: async (input) => {
      // Convert details to Json type
      const details = input.details ? JSON.parse(JSON.stringify(input.details)) : null;
      
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          ...input,
          details,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Booking;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['bookings', data.trip_id] });
    },
  });
};

export const useUpdateBooking = () => {
  const qc = useQueryClient();
  return useMutation<Booking, Error, UpdateBookingInput>({
    mutationFn: async (input) => {
      const { id, ...rest } = input;
      const updateData = { ...rest };
      
      // Convert details to Json type if it exists
      if (updateData.details) {
        updateData.details = JSON.parse(JSON.stringify(updateData.details));
      }
      
      // Ensure we don't send undefined values that would override existing data
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      
      const { data, error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();
        
      if (error) throw error;
      return data as Booking;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['bookings', data.trip_id] });
    },
  });
};

export const useDeleteBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tripId }: { id: string; tripId: string }) => {
      const { error } = await supabase.from('bookings').delete().eq('id', id);
      if (error) throw error;
      return { id, tripId };
    },
    onSuccess: ({ tripId }) => {
      qc.invalidateQueries({ queryKey: ['bookings', tripId] });
    },
  });
};
