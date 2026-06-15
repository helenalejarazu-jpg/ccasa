// Service worker: cachea la app para que funcione sin conexión.
// Sube CACHE_VERSION cada vez que cambien los archivos para forzar actualización.
const CACHE_VERSION = "entrenador-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./db.js",
  "./excel.js",
  "./app.js",
  "./vendor/exceljs.min.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((resp) => {
          // cachea también lo que se vaya pidiendo (mismo origen)
          if (resp && resp.status === 200 && e.request.url.startsWith(self.location.origin)) {
            const copy = resp.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy));
          }
          return resp;
        })
        .catch(() => cached);
    })
  );
});
