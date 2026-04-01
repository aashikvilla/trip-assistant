import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentRecord {
  id: string;
  trip_id: string;
  amount: number;
  description?: string;
  date: string;
  from_user_id: string;
  to_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentRecordData {
  trip_id: string;
  amount: number;
  description?: string;
  date: string;
  from_user_id: string;
  to_user_id: string;
}

export interface UpdatePaymentRecordData extends Partial<CreatePaymentRecordData> {
  id: string;
}

export const usePaymentRecords = (tripId: string) => {
  return useQuery({
    queryKey: ['payment-records', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_records')
        .select('*')
        .eq('trip_id', tripId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tripId,
  });
};

export const useCreatePaymentRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePaymentRecordData) => {
      const { data: result, error } = await supabase
        .from('payment_records')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-records', variables.trip_id] });
      queryClient.invalidateQueries({ queryKey: ['balances', variables.trip_id] });
    },
  });
};

export const useUpdatePaymentRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdatePaymentRecordData) => {
      const { id, ...updateData } = data;
      const { data: result, error } = await supabase
        .from('payment_records')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      if (variables.trip_id) {
        queryClient.invalidateQueries({ queryKey: ['payment-records', variables.trip_id] });
        queryClient.invalidateQueries({ queryKey: ['balances', variables.trip_id] });
      }
    },
  });
};

export const useDeletePaymentRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tripId }: { id: string; tripId: string }) => {
      const { error } = await supabase
        .from('payment_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-records', variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ['balances', variables.tripId] });
    },
  });
};
