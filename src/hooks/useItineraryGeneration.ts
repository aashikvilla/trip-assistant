import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export const useItineraryGeneration = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const generateItinerary = useMutation({
    mutationFn: async (tripId: string) => {
      return new Promise<{ success: boolean }>((resolve, reject) => {
        const eventSource = new EventSource(
          `/api/ai/generate-itinerary/stream?tripId=${encodeURIComponent(tripId)}`
        );

        let isResolved = false;

        eventSource.onopen = () => {
          if (!isResolved) {
            isResolved = true;
            resolve({ success: true });
          }
        };

        eventSource.onerror = (error) => {
          eventSource.close();
          if (!isResolved) {
            isResolved = true;
            reject(new Error("Failed to start itinerary generation"));
          }
        };

        // Keep listening but don't block the mutation
        eventSource.onmessage = () => {
          // Stream events continue in the background
          // Job status polling will handle updates
        };

        // Auto-close after 10 seconds to avoid keeping connection open indefinitely
        setTimeout(() => {
          eventSource.close();
        }, 10000);
      });
    },
    onSuccess: (_, tripId) => {
      queryClient.invalidateQueries({ queryKey: ["itinerary-status", tripId] });
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });

      toast({
        title: "Itinerary Generation Started!",
        description: "Your AI itinerary is being generated. This may take 30-60 seconds.",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    generateItinerary: generateItinerary.mutate,
    isGenerating: generateItinerary.isPending,
    error: generateItinerary.error,
  };
};
