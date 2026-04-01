"use client";

import { useEffect, useState } from "react";
import { Trash2, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getOfflineTrip, deleteOfflineTrip, type OfflineTripData } from "@/lib/offline-store";

interface OfflineStorageInfoProps {
  tripId: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ts));
}

export function OfflineStorageInfo({ tripId }: OfflineStorageInfoProps) {
  const [data, setData] = useState<OfflineTripData | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOfflineTrip(tripId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [tripId]);

  const handleRemove = async () => {
    await deleteOfflineTrip(tripId);
    setData(undefined);
  };

  if (loading) return null;
  if (!data) return null;

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4 text-sm">
      <div className="flex items-center gap-2 mb-3 text-gray-300 font-medium">
        <HardDrive className="h-4 w-4" />
        <span>Offline data saved</span>
      </div>
      <div className="space-y-1 text-gray-400 text-xs mb-3">
        <div className="flex justify-between">
          <span>Size</span>
          <span>{formatBytes(data.storageBytes)}</span>
        </div>
        <div className="flex justify-between">
          <span>Downloaded</span>
          <span>{formatDate(data.downloadedAt)}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRemove}
        className="w-full text-red-400 hover:text-red-300 hover:bg-red-400/10"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Remove offline data
      </Button>
    </div>
  );
}
