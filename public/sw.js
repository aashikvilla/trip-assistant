// Vibe Trip Service Worker
// Provides app-shell caching, offline fallback, and background sync

const CACHE_VERSION = "v1";
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const DOCUMENTS_CACHE = `trip-documents-${CACHE_VERSION}`;
const API_CACHE = `api-runtime-${CACHE_VERSION}`;

const APP_SHELL_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Install: cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key !== APP_SHELL_CACHE &&
                key !== DOCUMENTS_CACHE &&
                key !== API_CACHE
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin non-API requests
  if (request.method !== "GET") return;

  // Supabase API calls — network-first
  if (url.hostname.includes("supabase.co")) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Document files — cache-first
  if (url.pathname.startsWith("/trip-documents/")) {
    event.respondWith(cacheFirst(request, DOCUMENTS_CACHE));
    return;
  }

  // Static assets — cache-first
  if (
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|css)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, APP_SHELL_CACHE));
    return;
  }

  // Navigation requests — network-first, fallback to app shell
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/", { cacheName: APP_SHELL_CACHE })
      )
    );
    return;
  }
});

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response("Offline", { status: 503 });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

// Background sync
self.addEventListener("sync", (event) => {
  if (event.tag === "vibe-trip-sync") {
    event.waitUntil(processSyncQueue());
  }
});

async function processSyncQueue() {
  // Notify clients to process their queued actions
  const clients = await self.clients.matchAll();
  clients.forEach((client) => client.postMessage({ type: "PROCESS_SYNC_QUEUE" }));
}

// Push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const { title, body, tripId, type, url } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: `${type}-${tripId}`,
      data: { url: url || `/trips/${tripId}` },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(targetUrl));
        if (existing) return existing.focus();
        return self.clients.openWindow(targetUrl);
      })
  );
});
