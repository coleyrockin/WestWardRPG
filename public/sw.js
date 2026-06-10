// Kill-switch service worker. The retired Canvas game registered a cache-first SW
// on this scope; this replacement takes over immediately, wipes every cache, and
// unregisters itself so returning visitors get the live 3D game from the network.
// The 3D game does not register a service worker. Keep this file deployed so
// installed clients can pick up the update; it self-destructs on activation.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) client.navigate(client.url);
    })()
  );
});
