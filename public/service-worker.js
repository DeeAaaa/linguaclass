/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'linguaclass-v3';
const RUNTIME_CACHE = 'linguaclass-runtime-v3';

// Core assets to pre-cache on install
const PRE_CACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// ============ INSTALL ============
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching core assets');
      return cache.addAll(PRE_CACHE_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to pre-cache:', err);
      });
    }).then(() => {
      console.log('[SW] Install complete, skipping waiting');
      return self.skipWaiting();
    })
  );
});

// ============ ACTIVATE ============
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// ============ FETCH (Network-First with Cache Fallback) ============
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and browser-specific URLs
  const url = new URL(event.request.url);
  if (
    url.protocol === 'chrome-extension:' ||
    url.protocol === 'moz-extension:' ||
    url.pathname.includes('/api/') ||  // Don't cache API calls
    url.pathname.includes('/socket.io/') // Don't cache WebSocket
  ) {
    return;
  }

  // Network-first strategy for navigation requests (HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, '/index.html'));
    return;
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/) ||
    url.pathname.startsWith('/static/')
  ) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Network-first for everything else
  event.respondWith(networkFirst(event.request));
});

// Network-first: try network, fallback to cache
async function networkFirst(request, fallbackUrl) {
  try {
    const networkResponse = await fetch(request);
    // Cache a clone of the response for later use
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    // Fallback to index.html for navigation requests (SPA)
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }

    // Return a friendly offline page if nothing cached
    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0f4ff;color:#334155;text-align:center;padding:2rem}body>div>h1{font-size:3rem;margin:0}body>div>p{margin:1rem 0 0;color:#64748b}</style></head><body><div><h1>📡</h1><p>You're offline. Please check your connection.</p></div></body></html>`,
      { status: 503, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// Cache-first: try cache, fallback to network
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Offline resource unavailable', { status: 503 });
  }
}
