/// <reference lib="webworker" />

/**
 * Service Worker for EchoMail
 * 
 * Provides offline support, caching strategies, and background sync
 * for improved performance and reliability.
 */

const CACHE_NAME = 'echomail-v1';
const STATIC_CACHE_NAME = 'echomail-static-v1';
const DYNAMIC_CACHE_NAME = 'echomail-dynamic-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
];

// API routes to cache with network-first strategy
const API_CACHE_ROUTES = [
  '/api/appwrite/templates',
  '/api/appwrite/contacts',
];

// Maximum age for cached responses (in ms)
const CACHE_MAX_AGE = {
  static: 7 * 24 * 60 * 60 * 1000, // 7 days
  dynamic: 60 * 60 * 1000, // 1 hour
  api: 5 * 60 * 1000, // 5 minutes
};

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return (
              name.startsWith('echomail-') &&
              name !== STATIC_CACHE_NAME &&
              name !== DYNAMIC_CACHE_NAME
            );
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control immediately
  self.clients.claim();
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // API routes - network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    if (API_CACHE_ROUTES.some((route) => url.pathname.startsWith(route))) {
      event.respondWith(networkFirst(request, DYNAMIC_CACHE_NAME));
    }
    return;
  }

  // Static assets - cache first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
    return;
  }

  // Pages - stale while revalidate
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE_NAME));
});

/**
 * Cache-first strategy
 * Returns cached response if available, otherwise fetches from network
 */
async function cacheFirst(
  request: Request,
  cacheName: string
): Promise<Response> {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch {
    return createOfflineResponse();
  }
}

/**
 * Network-first strategy
 * Tries network first, falls back to cache if offline
 */
async function networkFirst(
  request: Request,
  cacheName: string
): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return createOfflineResponse();
  }
}

/**
 * Stale-while-revalidate strategy
 * Returns cached response immediately, updates cache in background
 */
async function staleWhileRevalidate(
  request: Request,
  cacheName: string
): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
      // Network failed, but we might have cache
      return null;
    });

  // Return cached response immediately if available
  if (cachedResponse) {
    // Update in background
    fetchPromise;
    return cachedResponse;
  }

  // Wait for network if no cache
  const networkResponse = await fetchPromise;
  return networkResponse || createOfflineResponse();
}

/**
 * Check if URL is a static asset
 */
function isStaticAsset(pathname: string): boolean {
  const staticExtensions = [
    '.js',
    '.css',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
  ];
  
  return staticExtensions.some((ext) => pathname.endsWith(ext));
}

/**
 * Create offline fallback response
 */
function createOfflineResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'You are currently offline. Please check your connection.',
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Background sync for failed email sends
 */
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'send-email') {
    event.waitUntil(retrySendEmails());
  }
});

/**
 * Retry sending queued emails
 */
async function retrySendEmails(): Promise<void> {
  // This would integrate with IndexedDB to get queued emails
  console.log('[SW] Retrying queued email sends');
}

/**
 * Push notification handler
 */
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'EchoMail', {
      body: data.body || 'You have a new notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: data.data,
    })
  );
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Type declarations for sync events
interface SyncEvent extends ExtendableEvent {
  tag: string;
}

export {};
