/* MarginMap PWA — shell-only cache. Never cache API or authenticated app data. */
const SHELL_CACHE = "margin-map-shell-v2";
const SHELL_URLS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isSensitivePath(pathname) {
  if (pathname.startsWith("/api/")) return true;
  // App routes that render store/menu/cost data — network only, no cache put.
  const sensitive = [
    "/dashboard",
    "/contribution",
    "/simulation",
    "/ingredients",
    "/menus",
    "/alerts",
    "/login",
  ];

  return sensitive.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (isSensitivePath(url.pathname)) {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html")),
    );

    return;
  }

  // Static shell assets: cache-first
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/offline.html" ||
    url.pathname === "/sw.js"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }

          return response;
        });
      }),
    );

    return;
  }

  // Default navigations/assets: network-first, do NOT write responses into cache
  // (avoids storing cost/menu HTML accidentally).
  event.respondWith(
    fetch(request).catch(() =>
      caches
        .match(request)
        .then((cached) => cached || caches.match("/offline.html")),
    ),
  );
});

