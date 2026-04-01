import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export const useItineraryGeneration = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const generateItinerary = useMutation({
    mutationFn: async (tripId: string) => {
      const res = await fetch("/api/ai/generate-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error.error || `Generation failed (${res.status})`);
      }

      return res.json() as Promise<{ jobId: string; status: string }>;
    },
    onSuccess: (_, tripId) => {
      queryClient.invalidateQueries({ queryKey: ["itinerary-status", tripId] });
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });

      toast({
        title: "Itinerary Generation Started!",
        description: "Your AI itinerary is being generated. This may take 30-60 seconds.",
      });
    },
    onError: (error, tripId) => {
      if (tripId) {
        queryClient.invalidateQueries({ queryKey: ["itinerary-status", tripId] });
        queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      }
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
