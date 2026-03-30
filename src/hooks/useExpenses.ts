import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Expense {
  id: string;
  trip_id: string;
  amount: number;
  description: string;
  category: 'food' | 'travel' | 'accommodation' | 'activities' | 'others';
  date: string;
  paid_by: string;
  split_between: string[];
  created_at: string;
  updated_at: string;
  currency: string;
  incurred_on: string;
}

export interface CreateExpenseData {
  trip_id: string;
  amount: number;
  description: string;
  category: 'food' | 'travel' | 'accommodation' | 'activities' | 'others';
  date: string;
  paid_by: string;
  split_between: string[];
}

export interface UpdateExpenseData extends Partial<CreateExpenseData> {
  id: string;
}

export const useExpenses = (tripId: string) => {
  return useQuery({
    queryKey: ['expenses', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', tripId)
        .order('incurred_on', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      return (data || []).map((expense): Expense => ({
        id: expense.id,
        trip_id: expense.trip_id,
        amount: expense.amount,
        description: expense.description || '',
        category: expense.category || 'others',
        date: expense.incurred_on,
        paid_by: expense.paid_by,
        split_between: expense.split_between || [],
        created_at: expense.created_at,
        updated_at: expense.updated_at,
        currency: expense.currency,
        incurred_on: expense.incurred_on,
      }));
    },
    enabled: !!tripId,
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExpenseData) => {
      const { data: result, error } = await supabase
        .from('expenses')
        .insert({
          trip_id: data.trip_id,
          amount: data.amount,
          description: data.description,
          category: data.category,
          incurred_on: data.date,
          paid_by: data.paid_by,
          split_between: data.split_between,
          currency: 'USD', // Default currency
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.trip_id] });
      queryClient.invalidateQueries({ queryKey: ['balances', variables.trip_id] });
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateExpenseData) => {
      const { id, ...updateData } = data;
      const { data: result, error } = await supabase
        .from('expenses')
        .update({
          amount: updateData.amount,
          description: updateData.description,
          category: updateData.category,
          incurred_on: updateData.date,
          paid_by: updateData.paid_by,
          split_between: updateData.split_between,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      if (variables.trip_id) {
        queryClient.invalidateQueries({ queryKey: ['expenses', variables.trip_id] });
        queryClient.invalidateQueries({ queryKey: ['balances', variables.trip_id] });
      }
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tripId }: { id: string; tripId: string }) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ['balances', variables.tripId] });
    },
  });
};
