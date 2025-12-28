const CACHE_NAME = "gymlogg-v1";

const ASSETS_TO_CACHE = [
  "/gymlogg/",
  "/gymlogg/index.html",
  "/gymlogg/styles.css",
  "/gymlogg/app.js",
  "/gymlogg/manifest.webmanifest",
  "/gymlogg/icons/icon-192.png",
  "/gymlogg/icons/icon-512.png"
];

// Install: cache alla filer
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: rensa gamla cache-versioner
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch: använd cache först, annars nätet
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
