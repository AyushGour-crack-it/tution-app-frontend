// Custom Service Worker for Offline Support
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

const CACHE_NAME = 'our-tuition-v1';
const API_CACHE = 'api-cache-v1';
const STATIC_CACHE = 'static-cache-v1';

// Install event - cache static assets and critical data
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.webmanifest',
        '/favicon.svg',
        // Add other critical static assets
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE && cacheName !== STATIC_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Background sync for pending requests
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(syncPendingRequests());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New notification from Our Tuition',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: data.data || {},
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Our Tuition', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  if (action === 'dismiss') {
    return;
  }

  // Default action or 'view' action
  const urlToOpen = data.clickAction || '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window/tab open with the target URL
      for (let client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }

      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Fetch event - handle API requests and static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'image' ||
      request.destination === 'font') {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Default - try network first, fallback to cache
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request).then((response) => {
        return response || caches.match('/index.html');
      });
    })
  );
});

// Handle API requests with offline support
async function handleApiRequest(request) {
  const url = new URL(request.url);

  // For GET requests, try network first, then cache
  if (request.method === 'GET') {
    try {
      const networkResponse = await fetch(request);
      // Cache successful responses
      if (networkResponse.ok) {
        const cache = await caches.open(API_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      // Network failed, try cache
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        // Add offline header to indicate cached response
        const headers = new Headers(cachedResponse.headers);
        headers.set('x-offline-cache', 'true');

        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers
        });
      }

      // No cache available
      return new Response(JSON.stringify({
        error: 'Offline',
        message: 'You are currently offline and this data is not cached.'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // For non-GET requests, try network, queue if offline
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Queue the request for later sync
    await queueRequestForSync(request);

    return new Response(JSON.stringify({
      success: true,
      queued: true,
      message: 'Request queued for when you\'re back online'
    }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return offline fallback for images
    if (request.destination === 'image') {
      return new Response('', { status: 404 });
    }
    return new Response('Offline', { status: 503 });
  }
}

// Queue requests for background sync
async function queueRequestForSync(request) {
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: null,
    timestamp: Date.now()
  };

  // Read request body if it exists
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      requestData.body = await request.clone().text();
    } catch (e) {
      // Ignore body read errors
    }
  }

  // Store in IndexedDB (this would be handled by the main app)
  // For now, we'll use a simple approach
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'QUEUE_REQUEST',
      payload: requestData
    });
  });
}

// Sync pending requests
async function syncPendingRequests() {
  // This will be handled by the main app's offline manager
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_PENDING_REQUESTS'
    });
  });
}

// Periodic cleanup
setInterval(async () => {
  const cache = await caches.open(API_CACHE);
  const keys = await cache.keys();

  // Remove old entries (older than 24 hours)
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const date = response.headers.get('date');
      if (date && new Date(date).getTime() < oneDayAgo) {
        await cache.delete(request);
      }
    }
  }
}, 60 * 60 * 1000); // Run every hour