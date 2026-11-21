const CACHE_NAME = "ecotrace-india-v2";
const STATIC_ASSETS = ["/", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.url.includes("/api/")) return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isAuthOrDashboardDocument =
    request.destination === "document" &&
    (url.pathname.startsWith("/dashboard") || url.pathname === "/login" || url.pathname === "/statement");

  // Auth state changes must never be served from a cached HTML shell.
  if (!isSameOrigin || isAuthOrDashboardDocument) return;

  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && request.url.startsWith(self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});
