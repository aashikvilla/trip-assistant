"use client";

import { useQuery } from "@tanstack/react-query";
import type { TripRecommendation } from "@/services/ai/types";

export function useCoTravelerRecommendations(tripId: string) {
  return useQuery<TripRecommendation[]>({
    queryKey: ["co-traveler-recommendations", tripId],
    queryFn: async () => {
      const res = await fetch(`/api/recommendations?tripId=${encodeURIComponent(tripId)}`);
      if (!res.ok) return [];
      return res.json() as Promise<TripRecommendation[]>;
    },
    enabled: !!tripId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
