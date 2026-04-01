"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function UpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const checkForWaiting = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setVisible(true);
      }
    };

    navigator.serviceWorker.ready.then((registration) => {
      checkForWaiting(registration);

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setVisible(true);
          }
        });
      });
    });
  }, []);

  const handleUpdate = () => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    setVisible(false);
    window.location.reload();
  };

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 rounded-2xl bg-gray-900 border border-indigo-500 p-4 shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600">
          <RefreshCw className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm">Update available</p>
          <p className="text-gray-400 text-xs mt-0.5">Reload to get the latest version.</p>
        </div>
        <Button size="sm" onClick={handleUpdate} className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white">
          Reload
        </Button>
      </div>
    </div>
  );
}
