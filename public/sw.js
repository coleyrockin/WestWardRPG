// WestWardRPG service worker — cache-first for assets, network-first for navigation.
// Version bumps clear old caches and trigger an update toast in the game.

const CACHE = "westward-v1";
const PRECACHE = ["/", "/index.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Only intercept same-origin requests
  if (url.origin !== self.location.origin) return;

  // Navigation: network-first, fall back to cached index.html
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Assets: cache-first, update cache in background
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      });
      return cached || network;
    })
  );
});

// Notify clients when a new SW version is waiting
self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
});
