// Simpson & Wood Engineer Apps — app-shell service worker.
//
// This only caches the app's OWN files (HTML/manifest/icons/logos), so the
// apps can at least open with zero signal. It deliberately does not touch
// Firestore, Firebase Auth, or any CDN traffic (Google Fonts, jsPDF, Tabler
// icons) - those already have their own correct network/caching behaviour,
// and Firestore's own persistent local cache (already used by every app)
// handles data offline separately from this. This service worker is purely
// about the page being able to open at all with no connection - not a
// backend or a sync mechanism.
//
// *** BUMP THIS EVERY TIME ANY FILE IN APP_SHELL BELOW CHANGES ***
// Forgetting this means engineers get silently served a stale cached copy
// of the app after an update ships - see engineer-apps-standards.md,
// Versioning section. This is a single shared cache version covering every
// app in the family, separate from each individual app's own version
// number shown in its header.
const CACHE_NAME = 'sw-engineer-apps-shell-v2';

const APP_SHELL = [
  './',
  'index.html',
  'management.html',
  'isolator-interlock-test.html',
  'isolator-interlock-report.html',
  'sw-timesheet.html',
  'manifest.json',
  'sw-logo.png',
  'sw-logo-white.png',
  'icon-192.png',
  'icon-512.png',
  'icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.error('Service worker: failed to precache app shell', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only ever handle same-origin GET requests for the app shell itself.
  // Anything cross-origin (Firestore, Auth, Google Fonts, jsPDF, Tabler
  // icons CDN) passes straight through untouched.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      // Stale-while-revalidate: serve the cached copy immediately if we
      // have one (this is what makes offline opening instant), while also
      // fetching a fresh copy in the background to keep the cache current
      // for next time. The real freshness guarantee for a genuine update
      // is bumping CACHE_NAME above, not this background fetch - that's
      // what forces every client to fully re-fetch everything rather than
      // trickle-update piecemeal.
      const networkFetch = fetch(req).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return response;
      }).catch(() => cached);

      return cached || networkFetch;
    })
  );
});
