/* ────────────────────────────────────────────────────────────────
   BUSINESS OS — PRODUCTION SERVICE WORKER
   Provides offline detection, asset caching, background sync,
   and mobile push notifications with entity deep-linking.
──────────────────────────────────────────────────────────────── */

const CACHE_NAME = "businessos-v1.0.0";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  "/favicon.ico",
  "/manifest.webmanifest",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => undefined);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first with offline cache fallback
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Exclude API routes and real-time SSE streams from caching
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/realtime")) {
    return;
  }

  // Static assets (CSS, JS, fonts) -> Stale-while-revalidate
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((networkRes) => {
          if (networkRes.ok) {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
          }
          return networkRes;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // HTML navigation requests
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        const offline = await caches.match(OFFLINE_URL);
        return offline || new Response("You are currently offline. Please check your network connection.", {
          headers: { "Content-Type": "text/plain" },
        });
      })
    );
  }
});

// Push Notifications with Deep Linking
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || "Business OS Alert";
    const options = {
      body: payload.body || "New update available in Business OS.",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: {
        url: payload.url || "/dashboard",
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("[SW] Push event error:", err);
  }
});

// Notification click -> Open deep-linked entity
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
