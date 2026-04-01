import { openDB } from "idb";
import type { BackgroundSyncAction } from "./offline-store";

const DB_NAME = "vibe-trip-offline";
const DB_VERSION = 1;

async function getSyncDB() {
  return openDB(DB_NAME, DB_VERSION);
}

export async function enqueueAction(
  action: Omit<BackgroundSyncAction, "id" | "createdAt" | "retryCount">
): Promise<void> {
  const db = await getSyncDB();
  await db.add("sync-queue", {
    ...action,
    createdAt: Date.now(),
    retryCount: 0,
  });
}

export async function dequeueAction(id: number): Promise<void> {
  const db = await getSyncDB();
  await db.delete("sync-queue", id);
}

export async function getPendingActions(): Promise<BackgroundSyncAction[]> {
  const db = await getSyncDB();
  return db.getAll("sync-queue");
}

export async function markFailed(id: number): Promise<void> {
  const db = await getSyncDB();
  const tx = db.transaction("sync-queue", "readwrite");
  const store = tx.objectStore("sync-queue");
  const action = await store.get(id);
  if (action) {
    await store.put({ ...action, retryCount: (action.retryCount ?? 0) + 1 });
  }
  await tx.done;
}
