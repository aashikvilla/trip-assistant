"use client";

import { useState } from "react";
import { Download, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { saveOfflineTrip } from "@/lib/offline-store";
import { supabase } from "@/integrations/supabase/client";

interface DownloadTripButtonProps {
  tripId: string;
}

export function DownloadTripButton({ tripId }: DownloadTripButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    setState("loading");
    setProgress(0);

    try {
      setProgress(20);
      const [itineraryRes, membersRes, expensesRes] = await Promise.all([
        supabase.from("itinerary_items").select("*").eq("trip_id", tripId),
        supabase.from("trip_members").select("*").eq("trip_id", tripId),
        supabase.from("expenses").select("*").eq("trip_id", tripId),
      ]);
      setProgress(80);

      await saveOfflineTrip({
        tripId,
        downloadedAt: Date.now(),
        storageBytes: 0,
        itinerary: itineraryRes.data ?? [],
        bookings: [],
        members: membersRes.data ?? [],
        expenses: expensesRes.data ?? [],
        documents: [],
      });

      setProgress(100);
      setState("done");
      setTimeout(() => setState("idle"), 3000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={state === "loading"}
      className="relative overflow-hidden"
    >
      {state === "loading" && (
        <span
          className="absolute inset-0 bg-indigo-600/20 transition-all"
          style={{ width: `${progress}%` }}
        />
      )}
      <span className="relative flex items-center gap-2">
        {state === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
        {state === "done" && <Check className="h-4 w-4 text-green-500" />}
        {(state === "idle" || state === "error") && <Download className="h-4 w-4" />}
        {state === "loading" ? "Downloading…" : state === "done" ? "Saved offline" : state === "error" ? "Failed" : "Save offline"}
      </span>
    </Button>
  );
}
