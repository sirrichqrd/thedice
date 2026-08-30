const CACHE_VERSION = "thedice-v3"; // <-- bump this every deploy
const CACHE_NAME = CACHE_VERSION;

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
    caches.open(CACHE_NAME).then(async cache => {
      // cache each individually so 1 failure doesn't kill all
      for (const file of FILES_TO_CACHE) {
        try { await cache.add(file); } catch(e){ console.warn("[SW] cache add failed", file, e); }
      }
    })
  );
  // don't skipWaiting here — wait for user
});

// ===================== ACTIVATE =====================
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ===================== FETCH =====================
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const req = event.request;

  // HTML → NETWORK FIRST
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
        return res;
      }).catch(() => 
        caches.match(req).then(cached => 
          cached || caches.match("/app/diceApp.html")
        )
      )
    );
    return;
  }

  // STATIC → CACHE FIRST (only same-origin)
  if (req.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return res;
        });
      })
    );
  }
});

// ===================== UPDATE COMMAND =====================
self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});