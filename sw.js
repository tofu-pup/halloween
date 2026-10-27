// Bump this version whenever a shipped app file or case.config.js changes.
const CACHE = "sak013-v3";
const PREFIX = "sak013-";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./case.config.js",
  "./manifest.webmanifest",
  "./assets/type.css",
  "./assets/icon.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-maskable.png",
  "./assets/bridge.svg",
  "./assets/grain.svg",
  "./assets/police-logo.png",
];
const assetURLs = ASSETS.map((path) => new URL(path, self.registration.scope).href);

self.addEventListener("install", (event) => {
  // Atomic install: a missing file rejects the new worker; the old archive remains usable.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(assetURLs)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Every in-scope navigation opens the archive, including home-screen launches.
    if (event.request.mode === "navigate") return await cache.match(new URL("./index.html", self.registration.scope).href) || fetch(event.request);
    return await cache.match(event.request, { ignoreSearch: true }) || fetch(event.request);
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CHECK_OFFLINE" || !event.ports[0]) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const entries = await Promise.all(assetURLs.map((url) => cache.match(url)));
    event.ports[0].postMessage({ ready: entries.every(Boolean), version: CACHE });
  })());
});
