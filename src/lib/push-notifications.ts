const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  return subscription;
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
  }
}

export interface MutePreferences {
  mutedTrips?: string[];
  mutedChatTrips?: string[];
  mutedPollTrips?: string[];
}

export function shouldNotify(tripId: string, prefs: MutePreferences, type: "general" | "chat" | "poll"): boolean {
  if (type === "chat" && prefs.mutedChatTrips?.includes(tripId)) return false;
  if (type === "poll" && prefs.mutedPollTrips?.includes(tripId)) return false;
  if (prefs.mutedTrips?.includes(tripId)) return false;
  return true;
}

export async function updateMutePreferences(
  endpoint: string,
  prefs: MutePreferences
): Promise<void> {
  await fetch("/api/push/subscribe", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, ...prefs }),
  });
}
