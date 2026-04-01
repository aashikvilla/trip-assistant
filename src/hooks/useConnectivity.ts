"use client";

import { useEffect, useState } from "react";
import { getConnectivity, type ConnectivityStatus } from "@/lib/connectivity";

interface ConnectivityState {
  status: ConnectivityStatus;
  isOnline: boolean;
  isOffline: boolean;
  isDegraded: boolean;
}

export function useConnectivity(): ConnectivityState {
  const [status, setStatus] = useState<ConnectivityStatus>(() => {
    if (typeof window === "undefined") return "online";
    return getConnectivity().getStatus();
  });

  useEffect(() => {
    const unsub = getConnectivity().subscribe(setStatus);
    return unsub;
  }, []);

  return {
    status,
    isOnline: status === "online",
    isOffline: status === "offline",
    isDegraded: status === "degraded",
  };
}
