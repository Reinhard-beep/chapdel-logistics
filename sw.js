// Chapdel Logistics Service Worker
// Version 1.0 - Enables offline use

const CACHE_NAME = 'chapdel-v4'; // Updated - clears old cache
const OFFLINE_URL = 'offline.html';

const ASSETS_TO_CACHE = [
  '/chapdel-/',
  '/chapdel-/index.html',
  '/chapdel-/offline.html',
  '/chapdel-/manifest.json',
  '/chapdel-/icon-192.png',
  '/chapdel-/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;900&family=Inter:wght@300;400;500&display=swap'
];

// Install event - cache all assets
self.addEventListener('install', event => {
  console.log('[Chapdel SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Chapdel SW] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE.map(url => {
        return new Request(url, { mode: 'no-cors' });
      })).catch(err => {
        console.log('[Chapdel SW] Cache error (non-fatal):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', event => {
  console.log('[Chapdel SW] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[Chapdel SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Serve from cache
        return cachedResponse;
      }

      // Try network
      return fetch(event.request).then(networkResponse => {
        // Cache new responses
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback
        if (event.request.destination === 'document') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});

// Push notifications (for future use)
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Chapdel Logistics';
  const options = {
    body: data.body || 'Una order mpya!',
    icon: '/chapdel-/icon-192.png',
    badge: '/chapdel-/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/chapdel-/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/chapdel-/')
  );
});
