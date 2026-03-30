import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generateComprehensiveItinerary } from "@/services/n8nComprehensiveService";
import { useToast } from "@/hooks/use-toast";

export const useItineraryGeneration = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const generateItinerary = useMutation({
    mutationFn: async (tripId: string) => {
      await generateComprehensiveItinerary(tripId);
    },
    onSuccess: (_, tripId) => {
      // Invalidate status queries to start polling
      queryClient.invalidateQueries({ queryKey: ["itinerary-status", tripId] });
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      
      toast({
        title: "Itinerary Generation Started!",
        description: "Your AI itinerary is being generated in the background. This may take 45-60 seconds.",
      });
    },
    onError: (error, tripId) => {
      console.error("Failed to start itinerary generation:", error);
      // Ensure UI reflects latest status after backend marked it failed
      if (tripId) {
        queryClient.invalidateQueries({ queryKey: ["itinerary-status", tripId] });
        queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      }
      toast({
        title: "Generation Failed to Start",
        description: "Failed to start itinerary generation. Please try again.",
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
