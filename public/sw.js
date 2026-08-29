const CACHE = "bhetau-public-shell-v2";
const PUBLIC_SHELL = ["/", "/_offline", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PUBLIC_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Never cache authenticated pages, API responses, or auth callback URLs.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => url.pathname === "/" ? caches.match("/") : caches.match("/_offline")));
    return;
  }
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  const isStaticAsset = url.pathname.startsWith("/_next/static/") || /\.(?:css|js|woff2|png|jpg|jpeg|webp|avif|svg|ico)$/.test(url.pathname);
  if (!isStaticAsset) return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});
