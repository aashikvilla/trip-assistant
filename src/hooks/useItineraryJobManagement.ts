import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateComprehensiveItinerary } from "@/services/n8nComprehensiveService";

export const useItineraryJobManagement = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Retry failed job
  const retryJob = useMutation({
    mutationFn: async (tripId: string) => {
      // Mark previous job as cancelled if it exists
      await supabase
        .from('itinerary_generation_jobs')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('trip_id', tripId)
        .in('status', ['failed', 'pending', 'processing']);

      // Start new generation
      await generateComprehensiveItinerary(tripId);
    },
    onSuccess: (_, tripId) => {
      queryClient.invalidateQueries({ queryKey: ["itinerary-status", tripId] });
      toast({
        title: "🔄 Retry Started",
        description: "Starting a new itinerary generation attempt.",
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Retry Failed",
        description: "Failed to retry itinerary generation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Cancel active job
  const cancelJob = useMutation({
    mutationFn: async ({ tripId, jobId }: { tripId: string; jobId: string }) => {
      // Mark job as cancelled
      const { error: jobError } = await supabase
        .from('itinerary_generation_jobs')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (jobError) throw jobError;

      // Reset trip status
      const { error: tripError } = await supabase
        .from('trips')
        .update({ 
          itinerary_status: null,
          itinerary_generated_at: null
        })
        .eq('id', tripId);

      if (tripError) throw tripError;
    },
    onSuccess: (_, { tripId }) => {
      queryClient.invalidateQueries({ queryKey: ["itinerary-status", tripId] });
      toast({
        title: "🛑 Generation Cancelled",
        description: "Itinerary generation has been cancelled.",
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Cancel Failed",
        description: "Failed to cancel generation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Clear failed job (cleanup)
  const clearFailedJob = useMutation({
    mutationFn: async ({ tripId, jobId }: { tripId: string; jobId: string }) => {
      // Mark job as cleared (keep for audit trail)
      await supabase
        .from('itinerary_generation_jobs')
        .update({ 
          status: 'cleared',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      // Reset trip status
      await supabase
        .from('trips')
        .update({ 
          itinerary_status: null,
          itinerary_generated_at: null
        })
        .eq('id', tripId);
    },
    onSuccess: (_, { tripId }) => {
      queryClient.invalidateQueries({ queryKey: ["itinerary-status", tripId] });
      toast({
        title: "🧹 Error Cleared",
        description: "Failed generation cleared. You can try again.",
      });
    },
  });

  return {
    retryJob: retryJob.mutate,
    cancelJob: cancelJob.mutate,
    clearFailedJob: clearFailedJob.mutate,
    isRetrying: retryJob.isPending,
    isCancelling: cancelJob.isPending,
    isClearing: clearFailedJob.isPending,
  };
};
