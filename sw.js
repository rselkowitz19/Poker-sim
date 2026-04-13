// ─────────────────────────────────────────────────────────────────
// POKER SIM — Service Worker
//
// IMPORTANT: Every time you update index.html and re-upload to
// GitHub, bump the version number below to match the VERSION
// constant in index.html. This forces all devices to discard
// the old cache and download the fresh files.
//
// Current version: v3
// ─────────────────────────────────────────────────────────────────

const CACHE_VERSION = 'v3'; // ← BUMP THIS on every update
const CACHE_NAME = `poker-sim-${CACHE_VERSION}`;

// Files to pre-cache on install
const PRECACHE_URLS = [
  './',
  './index.html',
];

// ── Install: cache core files ──────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // activate immediately
  );
});

// ── Activate: delete old caches ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim()) // take control immediately
  );
});

// ── Fetch: serve from cache, fall back to network ─────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // For our own origin files: cache-first
  if (url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          // Cache valid responses for future offline use
          if (response && response.status === 200 && response.type !== 'opaque') {
            const toCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
          }
          return response;
        }).catch(() => cached || new Response('Offline', { status: 503 }));
      })
    );
    return;
  }

  // For Google Fonts: cache-first with network fallback
  // Caches both the CSS file and the actual font files (woff2)
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request, { mode: 'cors' }).then(response => {
          if (response && response.status === 200) {
            const toCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
          }
          return response;
        }).catch(() => {
          // Fonts unavailable offline — app still works with system fonts
          return new Response('', { status: 408 });
        });
      })
    );
    return;
  }

  // All other requests: network only (no caching)
  // Nothing else is needed for this app
});
