import { openDB, type IDBPDatabase } from "idb";

export interface OfflineTripData {
  tripId: string;
  downloadedAt: number;
  storageBytes: number;
  itinerary: unknown[];
  bookings: unknown[];
  members: unknown[];
  expenses: unknown;
  documents: DocumentMeta[];
}

export interface DocumentMeta {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface BackgroundSyncAction {
  id?: number;
  tripId: string;
  type: "send_message" | "add_expense" | "vote_poll";
  payload: unknown;
  createdAt: number;
  retryCount: number;
}

const DB_NAME = "vibe-trip-offline";
const DB_VERSION = 1;

let db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (!db) {
    db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains("trips")) {
          const tripsStore = database.createObjectStore("trips", {
            keyPath: "tripId",
          });
          tripsStore.createIndex("downloadedAt", "downloadedAt");
        }
        if (!database.objectStoreNames.contains("sync-queue")) {
          const syncStore = database.createObjectStore("sync-queue", {
            keyPath: "id",
            autoIncrement: true,
          });
          syncStore.createIndex("tripId", "tripId");
          syncStore.createIndex("type", "type");
        }
        if (!database.objectStoreNames.contains("install-prompt")) {
          database.createObjectStore("install-prompt");
        }
      },
    });
  }
  return db;
}

export function calculateStorageSize(data: OfflineTripData): number {
  return new Blob([JSON.stringify(data)]).size;
}

export async function saveOfflineTrip(data: OfflineTripData): Promise<void> {
  const database = await getDB();
  const storageBytes = calculateStorageSize(data);
  await database.put("trips", { ...data, storageBytes });
}

export async function getOfflineTrip(
  tripId: string
): Promise<OfflineTripData | undefined> {
  const database = await getDB();
  return database.get("trips", tripId);
}

export async function deleteOfflineTrip(tripId: string): Promise<void> {
  const database = await getDB();
  await database.delete("trips", tripId);
}

export async function getAllOfflineTrips(): Promise<OfflineTripData[]> {
  const database = await getDB();
  return database.getAll("trips");
}

export async function getInstallPromptState(): Promise<
  { dismissedAt: number } | undefined
> {
  const database = await getDB();
  return database.get("install-prompt", "state");
}

export async function setInstallPromptDismissed(): Promise<void> {
  const database = await getDB();
  await database.put("install-prompt", { dismissedAt: Date.now() }, "state");
}
