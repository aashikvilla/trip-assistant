"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { StreamEvent, ParsedItinerary, ParsedItineraryDay } from "@/services/ai/types";

export type StreamStatus = "idle" | "streaming" | "complete" | "error";

export interface UseItineraryStreamReturn {
  events: StreamEvent[];
  status: StreamStatus;
  itinerary: ParsedItinerary | null;
  error: string | null;
  jobId: string | null;
  startStream: (tripId: string) => void;
  cancel: () => void;
}

export function useItineraryStream(): UseItineraryStreamReturn {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [itinerary, setItinerary] = useState<ParsedItinerary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const currentTripIdRef = useRef<string | null>(null);
  const statusRef = useRef<StreamStatus>("idle");
  const jobIdRef = useRef<string | null>(null);

  // Keep refs in sync
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { jobIdRef.current = jobId; }, [jobId]);

  const cancel = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setStatus("idle");

    // Patch job status to cancelled if we have a jobId
    const currentJobId = jobIdRef.current;
    if (currentJobId) {
      supabase
        .from("itinerary_generation_jobs")
        .update({ status: "cancelled", completed_at: new Date().toISOString() })
        .eq("id", currentJobId)
        .then(() => {});

      // Reset trip status
      if (currentTripIdRef.current) {
        supabase
          .from("trips")
          .update({ itinerary_status: null })
          .eq("id", currentTripIdRef.current)
          .then(() => {});
      }
    }
  }, []);

  const startStream = useCallback((tripId: string) => {
    // Close any existing stream
    eventSourceRef.current?.close();

    setEvents([]);
    setStatus("streaming");
    setItinerary(null);
    setError(null);
    setJobId(null);
    currentTripIdRef.current = tripId;

    const accumulatedDays: ParsedItineraryDay[] = [];

    const es = new EventSource(
      `/api/ai/generate-itinerary/stream?tripId=${encodeURIComponent(tripId)}`,
    );
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as StreamEvent;

        setEvents((prev) => [...prev, event]);

        if (event.type === "job_created") {
          setJobId(event.jobId);
        } else if (event.type === "partial_itinerary") {
          accumulatedDays.push(event.day);
          setItinerary({ days: [...accumulatedDays] });
        } else if (event.type === "itinerary_complete") {
          setItinerary(event.itinerary);
          setStatus("complete");
          es.close();
          eventSourceRef.current = null;
        } else if (event.type === "error") {
          setError(event.message);
          if (!event.recoverable) {
            setStatus("error");
            es.close();
            eventSourceRef.current = null;
          }
        }
      } catch {
        // Skip malformed events
      }
    };

    es.onerror = () => {
      // When server closes the stream, EventSource tries to reconnect
      // (readyState = CONNECTING). We must close it to prevent infinite reconnects.
      const currentStatus = statusRef.current;
      if (currentStatus === "complete" || currentStatus === "error") {
        // Already handled via onmessage — just clean up
        es.close();
        eventSourceRef.current = null;
        return;
      }
      // Server dropped connection unexpectedly
      es.close();
      eventSourceRef.current = null;
      setStatus("error");
      setError("Connection lost");
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  return { events, status, itinerary, error, jobId, startStream, cancel };
}
