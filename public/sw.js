const CACHE_VERSION = 'expense-tracker-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const OFFLINE_PAGE = '/offline';

// Essential resources that must be cached for offline functionality
const ESSENTIAL_CACHE = [
  '/',
  '/login',
  '/register', 
  '/expenses',
  '/dashboard',
  '/settings',
  '/offline',
  '/income',
  '/cards',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico'
];

// Runtime caching patterns
const CACHE_STRATEGIES = {
  NETWORK_FIRST: 'network-first',
  CACHE_FIRST: 'cache-first', 
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Background sync for pending operations (if supported)
if ('sync' in self.registration) {
  self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
      console.log('Service Worker: Background sync triggered');
      event.waitUntil(
        // The actual sync logic will be handled by the OfflineContext
        // This just ensures the sync event is captured
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'BACKGROUND_SYNC' });
          });
        })
      );
    }
  });
}

// Handle push notifications (future enhancement)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    console.log('Service Worker: Push notification received', data);
    
    // Handle push notifications for sync status, etc.
  }
});

console.log('Service Worker: Script loaded', CACHE_VERSION);

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        console.log('Service Worker: Caching essential resources');
        
        // Cache essential pages one by one to handle failures gracefully
        const cachePromises = ESSENTIAL_CACHE.map(async (url) => {
          try {
            await cache.add(url);
            console.log(`Service Worker: Cached ${url}`);
          } catch (error) {
            console.warn(`Service Worker: Failed to cache ${url}:`, error);
          }
        });
        
        await Promise.allSettled(cachePromises);
        console.log('Service Worker: Essential resources cached');
      } catch (error) {
        console.error('Service Worker: Install failed:', error);
      }
    })()
  );
  
  // Force activation of new service worker
  self.skipWaiting();
});

// Fetch event - intelligent caching and offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle navigation requests (page loads)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle API requests (Convex and other APIs)
  if (request.url.includes('/api/') || request.url.includes('convex.cloud')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (request.destination === 'script' || request.destination === 'style' || 
      request.destination === 'image' || request.url.includes('/_next/')) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Default handling for other requests
  event.respondWith(handleGenericRequest(request));
});

// Navigation request handler with smart offline fallback
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful navigation responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
      return response;
    }
  } catch (error) {
    console.log('Network request failed, serving offline content');
  }

  // Network failed, serve appropriate offline content
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Serve cached version if available
  let cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Serve appropriate offline page based on route
  if (pathname.includes('/dashboard')) {
    cachedResponse = await caches.match('/dashboard');
    if (cachedResponse) return cachedResponse;
  }
  
  if (pathname.includes('/expenses')) {
    cachedResponse = await caches.match('/expenses');
    if (cachedResponse) return cachedResponse;
  }
  
  if (pathname.includes('/income')) {
    cachedResponse = await caches.match('/income');
    if (cachedResponse) return cachedResponse;
  }
  
  if (pathname.includes('/settings')) {
    cachedResponse = await caches.match('/settings');
    if (cachedResponse) return cachedResponse;
  }

  // Fallback to offline page or root
  return (await caches.match(OFFLINE_PAGE)) || 
         (await caches.match('/')) || 
         new Response('Offline - Please check your connection', { 
           status: 503,
           headers: { 'Content-Type': 'text/html' }
         });
}

// API request handler with cache-first strategy for offline support
async function handleApiRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  try {
    // Try network first for real-time data
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful API responses
      cache.put(request, response.clone());
      return response;
    }
  } catch (error) {
    console.log('API request failed, checking cache');
  }

  // Network failed, serve from cache if available
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    console.log('Serving API response from cache');
    return cachedResponse;
  }

  // No cache available, return error response
  return new Response(
    JSON.stringify({ error: 'Offline - Data not available' }),
    { 
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Static asset handler with cache-first strategy
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.warn('Failed to fetch static asset:', request.url);
    return new Response('Asset not available offline', { status: 503 });
  }
}

// Generic request handler
async function handleGenericRequest(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Content not available offline', { status: 503 });
  }
}

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE];
      
      const deletePromises = cacheNames
        .filter(cacheName => !currentCaches.includes(cacheName))
        .map(cacheName => {
          console.log('Service Worker: Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        });
      
      await Promise.all(deletePromises);
      console.log('Service Worker: Cache cleanup completed');
    })()
  );
  
  // Take control of all pages immediately
  self.clients.claim();
  console.log('Service Worker: Now controlling all pages');
});

// Message event for communication with the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});
