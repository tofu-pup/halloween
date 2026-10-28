const CACHE = "blodlopet-venterom-cache-v1";
const PREFIX = "blodlopet-venterom-cache-";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./state.js",
  "../assets/icon.svg",
  "../assets/police-logo.png",
  "../assets/bridge.png",
];
const assetURLs = ASSETS.map((path) => new URL(path, self.registration.scope).href);

self.addEventListener("install", (event) => {
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
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (!url.href.startsWith(self.registration.scope) && !assetURLs.includes(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (event.request.mode === "navigate" && url.href.startsWith(self.registration.scope)) {
      return await cache.match(new URL("./index.html", self.registration.scope).href) || fetch(event.request);
    }
    return await cache.match(event.request, { ignoreSearch: true }) || fetch(event.request);
  })());
});
self.addEventListener("message", (event) => {
  if (event.data?.type !== "CHECK_WAITING_ROOM_OFFLINE" || !event.ports[0]) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const entries = await Promise.all(assetURLs.map((url) => cache.match(url)));
    event.ports[0].postMessage({ ready: entries.every(Boolean), version: CACHE });
  })());
});
