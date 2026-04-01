"use client";

import { useConnectivity } from "@/hooks/useConnectivity";
import { WifiOff, AlertTriangle } from "lucide-react";

export function OfflineBanner() {
  const { isOffline, isDegraded } = useConnectivity();

  if (!isOffline && !isDegraded) return null;

  return (
    <div
      className="fixed bottom-16 left-0 right-0 z-50 mx-4 mb-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg flex items-center gap-2"
      style={{ backgroundColor: isOffline ? "#ef4444" : "#f59e0b" }}
      role="status"
      aria-live="polite"
    >
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>You&apos;re offline. Changes will sync when reconnected.</span>
        </>
      ) : (
        <>
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Connection unstable. Some features may be limited.</span>
        </>
      )}
    </div>
  );
}
