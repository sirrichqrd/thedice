const CACHE_NAME = "thedice";

const FILES_TO_CACHE = [
  "/app/diceApp.html",
  "/app/manifest.json",
  "/app/favicon.svg",
  "/app/icons/icon-192.png",
  "/app/icons/icon-512.png"
];

// ===================== INSTALL =====================
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
  );

  // Do NOT automatically take control here.
  // The website's "Update" button will trigger skipWaiting().
});

// ===================== ACTIVATE =====================
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

// ===================== FETCH =====================
self.addEventListener("fetch", event => {

  // Only handle GET requests
  if (event.request.method !== "GET") {
    return;
  }

  const request = event.request;

  // HTML pages → NETWORK FIRST
  // Always try to get the newest version from the server.
  if (
    request.mode === "navigate" ||
    request.destination === "document"
  ) {
    event.respondWith(
      fetch(request)
        .then(response => {

          // Save the newest HTML in cache
          const responseClone = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });

          return response;
        })
        .catch(() => {
          // If offline, use cached page
          return caches.match(request)
            .then(cachedResponse => {
              return cachedResponse || caches.match("/diceApp.html");
            });
        })
    );

    return;
  }

  // STATIC ASSETS → CACHE FIRST
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {

        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then(response => {

          // Cache successful responses
          if (response && response.status === 200) {
            const responseClone = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }

          return response;
        });

      })
  );
});

// ===================== UPDATE COMMAND =====================
self.addEventListener("message", event => {

  if (
    event.data &&
    event.data.type === "SKIP_WAITING"
  ) {
    self.skipWaiting();
  }

});