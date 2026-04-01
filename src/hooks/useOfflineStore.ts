"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getAllOfflineTrips,
  getOfflineTrip,
  saveOfflineTrip,
  deleteOfflineTrip,
  type OfflineTripData,
} from "@/lib/offline-store";

interface OfflineStoreState {
  offlineTrips: OfflineTripData[];
  isLoading: boolean;
  save: (data: OfflineTripData) => Promise<void>;
  remove: (tripId: string) => Promise<void>;
  get: (tripId: string) => Promise<OfflineTripData | undefined>;
  refresh: () => Promise<void>;
}

export function useOfflineStore(): OfflineStoreState {
  const [offlineTrips, setOfflineTrips] = useState<OfflineTripData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const trips = await getAllOfflineTrips();
      setOfflineTrips(trips);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (data: OfflineTripData) => {
      await saveOfflineTrip(data);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (tripId: string) => {
      await deleteOfflineTrip(tripId);
      await refresh();
    },
    [refresh]
  );

  const get = useCallback(async (tripId: string) => {
    return getOfflineTrip(tripId);
  }, []);

  return { offlineTrips, isLoading, save, remove, get, refresh };
}
