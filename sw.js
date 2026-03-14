const CACHE_NAME = 'mahad-v1';

// Files to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
];

// Install — cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fall back to cache
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go to network for API calls — never cache student data
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For everything else: try network first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache a fresh copy
        if (response && response.status === 200 && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
