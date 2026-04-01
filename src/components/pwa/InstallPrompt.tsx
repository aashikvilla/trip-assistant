"use client";

import { useEffect, useState } from "react";
import { getInstallPromptState, setInstallPromptDismissed } from "@/lib/offline-store";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

const SUPPRESS_DAYS = 30;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = async (e: Event) => {
      e.preventDefault();
      const state = await getInstallPromptState().catch(() => undefined);
      if (state) {
        const daysSince = (Date.now() - state.dismissedAt) / (1000 * 60 * 60 * 24);
        if (daysSince < SUPPRESS_DAYS) return;
      }
      setPromptEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") setVisible(false);
  };

  const handleDismiss = async () => {
    setVisible(false);
    await setInstallPromptDismissed().catch(() => undefined);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl bg-gray-900 border border-gray-700 p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600">
          <Download className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm">Add Vibe Trip to Home Screen</p>
          <p className="text-gray-400 text-xs mt-0.5">Access your trips instantly, even offline.</p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={handleInstall} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
          Install
        </Button>
        <Button size="sm" variant="ghost" onClick={handleDismiss} className="text-gray-400">
          Not now
        </Button>
      </div>
    </div>
  );
}
