// A versioned cache name helps manage updates.
const CACHE_NAME = 'gestion-academica-cache-v1';

// A minimal list of assets to cache on installation for the initial offline experience.
const URLS_TO_CACHE_ON_INSTALL = [
  '/', // The root index.html
  '/manifest.json' // The web app manifest
];

// Install event: Caches the essential app shell.
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(URLS_TO_CACHE_ON_INSTALL);
      })
      .then(() => self.skipWaiting()) // Activate the new service worker immediately.
  );
});

// Activate event: Cleans up old caches to save space and avoid conflicts.
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of any open clients (pages).
  );
});


// Fetch event: Intercepts network requests and applies caching strategies.
self.addEventListener('fetch', (event) => {
  // We only cache GET requests. Other requests (POST, etc.) should go to the network.
  if (event.request.method !== 'GET') {
    return;
  }

  // Strategy for navigation requests (e.g., loading the main HTML page):
  // Network first, falling back to cache. This ensures users get the latest
  // version of the page if online, but the app still loads if offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/');
      })
    );
    return;
  }

  // Strategy for all other assets (CSS, JS, images, fonts):
  // Stale-While-Revalidate. This is a powerful strategy that provides the best of both worlds.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        // Create a promise to fetch the latest version from the network.
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // If the network request is successful, update the cache.
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });

        // Return the cached response immediately if it exists (for speed and offline access),
        // otherwise, wait for the network response. The cache will be updated in the background.
        return cachedResponse || fetchPromise;
      });
    })
  );
});