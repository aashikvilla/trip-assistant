import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useItineraryStatus } from "@/hooks/useItineraryStatus";

interface ItineraryStatusNotificationProps {
  tripId: string;
}

export const ItineraryStatusNotification = ({ tripId }: ItineraryStatusNotificationProps) => {
  const { toast } = useToast();
  const { data: status } = useItineraryStatus(tripId);
  const previousStatusRef = useRef<string | null>(null);
  const previousJobStatusRef = useRef<string | null>(null);

  useEffect(() => {
    const currentStatus = status?.itinerary_status;
    const currentJobStatus = status?.job_status;
    const previousStatus = previousStatusRef.current;
    const previousJobStatus = previousJobStatusRef.current;

    // Show notification when job starts processing
    if (previousJobStatus === 'pending' && currentJobStatus === 'processing') {
      toast({
        title: "🔄 Processing Started",
        description: "Your itinerary request is now being processed by AI.",
        duration: 3000,
      });
    }

    // Show notification if status changed from generating to completed
    if (previousStatus === 'generating' && currentStatus === 'completed') {
      toast({
        title: "🎉 Itinerary Ready!",
        description: "Your AI-powered itinerary has been generated successfully.",
        duration: 5000,
      });
    }

    // Show notification if generation failed with detailed error
    if ((previousStatus === 'generating' && currentStatus === 'failed') || 
        (previousJobStatus === 'processing' && currentJobStatus === 'failed')) {
      const errorMessage = status?.job_error 
        ? `Error: ${status.job_error}` 
        : "Failed to generate itinerary. Please try again.";
      
      toast({
        title: "❌ Generation Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 8000,
      });
    }

    // Update the refs with current status
    previousStatusRef.current = currentStatus || null;
    previousJobStatusRef.current = currentJobStatus || null;
  }, [status?.itinerary_status, status?.job_status, status?.job_error, toast]);

  return null; // This component only handles notifications
};
