/**
 * Background Sync Service Worker
 * Handles background synchronization, push notifications, and periodic conflict detection
 */

const CACHE_NAME = 'offline-first-v1';
const SYNC_TAG = 'background-sync';
const CONFLICT_CHECK_TAG = 'conflict-check';
const NOTIFICATION_TAG = 'sync-notification';

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Sync configuration
const SYNC_CONFIG = {
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  batchSize: 10,
  conflictCheckInterval: 300000, // 5 minutes
  syncTimeout: 30000 // 30 seconds
};

// Global state
let isOnline = true;
let syncInProgress = false;
let lastSyncTimestamp = 0;
let pendingOperations = [];

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
  console.log('Background Sync Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/offline',
        '/manifest.json'
      ]);
    })
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
  console.log('Background Sync Service Worker activated');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients
      self.clients.claim(),
      // Initialize sync state
      initializeSyncState()
    ])
  );
});

/**
 * Initialize sync state from IndexedDB
 */
async function initializeSyncState() {
  try {
    // Load pending operations from IndexedDB
    const db = await openDatabase();
    const transaction = db.transaction(['pendingOperations'], 'readonly');
    const store = transaction.objectStore('pendingOperations');
    const request = store.getAll();
    
    request.onsuccess = () => {
      pendingOperations = request.result || [];
      console.log(`Loaded ${pendingOperations.length} pending operations`);
    };
    
    // Load last sync timestamp
    const metaTransaction = db.transaction(['metadata'], 'readonly');
    const metaStore = metaTransaction.objectStore('metadata');
    const metaRequest = metaStore.get('lastSyncTimestamp');
    
    metaRequest.onsuccess = () => {
      lastSyncTimestamp = metaRequest.result?.value || 0;
      console.log(`Last sync timestamp: ${new Date(lastSyncTimestamp)}`);
    };
  } catch (error) {
    console.error('Failed to initialize sync state:', error);
  }
}

/**
 * Open IndexedDB database
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OfflineFirstDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores
      if (!db.objectStoreNames.contains('pendingOperations')) {
        const operationsStore = db.createObjectStore('pendingOperations', { keyPath: 'id' });
        operationsStore.createIndex('timestamp', 'timestamp');
        operationsStore.createIndex('status', 'status');
      }
      
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
      
      if (!db.objectStoreNames.contains('conflicts')) {
        const conflictsStore = db.createObjectStore('conflicts', { keyPath: 'id' });
        conflictsStore.createIndex('timestamp', 'timestamp');
        conflictsStore.createIndex('resolved', 'resolved');
      }
    };
  });
}

/**
 * Handle fetch events with caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and external URLs
  if (request.method !== 'GET' || !url.origin.includes(self.location.origin)) {
    return;
  }
  
  // Determine cache strategy based on URL
  let strategy = CACHE_STRATEGIES.NETWORK_FIRST;
  
  if (url.pathname.includes('/api/')) {
    strategy = CACHE_STRATEGIES.NETWORK_FIRST;
  } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    strategy = CACHE_STRATEGIES.CACHE_FIRST;
  } else {
    strategy = CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }
  
  event.respondWith(handleFetchWithStrategy(request, strategy));
});

/**
 * Handle fetch with specific caching strategy
 */
async function handleFetchWithStrategy(request, strategy) {
  const cache = await caches.open(CACHE_NAME);
  
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return handleCacheFirst(request, cache);
    
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return handleNetworkFirst(request, cache);
    
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return handleStaleWhileRevalidate(request, cache);
    
    default:
      return fetch(request);
  }
}

/**
 * Cache First strategy
 */
async function handleCacheFirst(request, cache) {
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Network request failed:', error);
    return new Response('Network error', { status: 503 });
  }
}

/**
 * Network First strategy
 */
async function handleNetworkFirst(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Network request failed, trying cache:', error);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Stale While Revalidate strategy
 */
async function handleStaleWhileRevalidate(request, cache) {
  const cachedResponse = await cache.match(request);
  
  // Start network request in background
  const networkPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((error) => {
    console.error('Background network request failed:', error);
  });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Wait for network response if no cache
  return networkPromise;
}

/**
 * Handle background sync events
 */
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === SYNC_TAG) {
    event.waitUntil(performBackgroundSync());
  } else if (event.tag === CONFLICT_CHECK_TAG) {
    event.waitUntil(performConflictCheck());
  }
});

/**
 * Perform background synchronization
 */
async function performBackgroundSync() {
  if (syncInProgress) {
    console.log('Sync already in progress, skipping');
    return;
  }
  
  syncInProgress = true;
  
  try {
    console.log('Starting background sync...');
    
    // Load pending operations from IndexedDB
    await loadPendingOperations();
    
    if (pendingOperations.length === 0) {
      console.log('No pending operations to sync');
      return;
    }
    
    // Process operations in batches
    const batches = createBatches(pendingOperations, SYNC_CONFIG.batchSize);
    let syncedCount = 0;
    let failedCount = 0;
    
    for (const batch of batches) {
      try {
        const result = await processBatch(batch);
        syncedCount += result.syncedCount;
        failedCount += result.failedCount;
      } catch (error) {
        console.error('Batch processing failed:', error);
        failedCount += batch.length;
      }
    }
    
    // Update sync timestamp
    lastSyncTimestamp = Date.now();
    await saveMetadata('lastSyncTimestamp', lastSyncTimestamp);
    
    // Send notification to clients
    await notifyClients({
      type: 'sync_completed',
      syncedCount,
      failedCount,
      timestamp: lastSyncTimestamp
    });
    
    // Show push notification if sync completed successfully
    if (syncedCount > 0) {
      await showSyncNotification(syncedCount, failedCount);
    }
    
    console.log(`Background sync completed: ${syncedCount} synced, ${failedCount} failed`);
    
  } catch (error) {
    console.error('Background sync failed:', error);
    
    await notifyClients({
      type: 'sync_failed',
      error: error.message,
      timestamp: Date.now()
    });
  } finally {
    syncInProgress = false;
  }
}

/**
 * Load pending operations from IndexedDB
 */
async function loadPendingOperations() {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(['pendingOperations'], 'readonly');
    const store = transaction.objectStore('pendingOperations');
    const index = store.index('status');
    const request = index.getAll('pending');
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        pendingOperations = request.result || [];
        resolve(pendingOperations);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to load pending operations:', error);
    pendingOperations = [];
  }
}

/**
 * Create batches from operations
 */
function createBatches(operations, batchSize) {
  const batches = [];
  for (let i = 0; i < operations.length; i += batchSize) {
    batches.push(operations.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Process a batch of operations
 */
async function processBatch(batch) {
  let syncedCount = 0;
  let failedCount = 0;
  
  const promises = batch.map(async (operation) => {
    try {
      await processOperation(operation);
      syncedCount++;
      
      // Mark operation as completed
      await updateOperationStatus(operation.id, 'completed');
    } catch (error) {
      console.error(`Operation ${operation.id} failed:`, error);
      failedCount++;
      
      // Update retry count and status
      operation.retryCount = (operation.retryCount || 0) + 1;
      
      if (operation.retryCount >= SYNC_CONFIG.maxRetries) {
        await updateOperationStatus(operation.id, 'failed');
      } else {
        await updateOperationStatus(operation.id, 'pending');
      }
    }
  });
  
  await Promise.allSettled(promises);
  
  return { syncedCount, failedCount };
}

/**
 * Process a single operation
 */
async function processOperation(operation) {
  // Simulate API call (in real implementation, this would make actual API calls)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SYNC_CONFIG.syncTimeout);
  
  try {
    // Mock API endpoint based on operation type
    const apiUrl = getApiUrl(operation);
    const requestOptions = {
      method: getHttpMethod(operation.type),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: operation.type !== 'delete' ? JSON.stringify(operation.data) : undefined,
      signal: controller.signal
    };
    
    const response = await fetch(apiUrl, requestOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`Operation ${operation.id} completed successfully`);
    
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Get API URL for operation
 */
function getApiUrl(operation) {
  const baseUrl = self.location.origin;
  const entityPath = operation.entityType === 'expenses' ? 'expenses' : 
                    operation.entityType === 'income' ? 'income' :
                    operation.entityType === 'cards' ? 'cards' : 'categories';
  
  if (operation.type === 'create') {
    return `${baseUrl}/api/${entityPath}`;
  } else {
    return `${baseUrl}/api/${entityPath}/${operation.entityId}`;
  }
}

/**
 * Get HTTP method for operation type
 */
function getHttpMethod(operationType) {
  switch (operationType) {
    case 'create': return 'POST';
    case 'update': return 'PUT';
    case 'delete': return 'DELETE';
    default: return 'GET';
  }
}

/**
 * Get authentication token
 */
async function getAuthToken() {
  try {
    // Try to get token from clients
    const clients = await self.clients.matchAll();
    
    for (const client of clients) {
      const response = await sendMessageToClient(client, { type: 'get_auth_token' });
      if (response && response.token) {
        return response.token;
      }
    }
    
    // Fallback: try to get from IndexedDB or localStorage
    // This would need to be implemented based on your auth system
    return null;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

/**
 * Update operation status in IndexedDB
 */
async function updateOperationStatus(operationId, status) {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(['pendingOperations'], 'readwrite');
    const store = transaction.objectStore('pendingOperations');
    
    const getRequest = store.get(operationId);
    
    return new Promise((resolve, reject) => {
      getRequest.onsuccess = () => {
        const operation = getRequest.result;
        if (operation) {
          operation.status = status;
          operation.lastUpdated = Date.now();
          
          const putRequest = store.put(operation);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(); // Operation not found, might have been deleted
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('Failed to update operation status:', error);
  }
}

/**
 * Perform periodic conflict detection
 */
async function performConflictCheck() {
  try {
    console.log('Performing conflict check...');
    
    // Get current data hash from server
    const authToken = await getAuthToken();
    if (!authToken) {
      console.log('No auth token available for conflict check');
      return;
    }
    
    const response = await fetch(`${self.location.origin}/api/sync/hash`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get server hash: ${response.status}`);
    }
    
    const { hash: serverHash, timestamp: serverTimestamp } = await response.json();
    
    // Compare with local hash
    const localHash = await getLocalDataHash();
    
    if (serverHash !== localHash) {
      console.log('Conflict detected, notifying clients');
      
      // Store conflict information
      await storeConflict({
        id: `conflict_${Date.now()}`,
        serverHash,
        localHash,
        serverTimestamp,
        localTimestamp: Date.now(),
        resolved: false,
        timestamp: Date.now()
      });
      
      // Notify clients about conflict
      await notifyClients({
        type: 'conflict_detected',
        serverHash,
        localHash,
        timestamp: Date.now()
      });
      
      // Show conflict notification
      await showConflictNotification();
    } else {
      console.log('No conflicts detected');
    }
    
  } catch (error) {
    console.error('Conflict check failed:', error);
  }
}

/**
 * Get local data hash
 */
async function getLocalDataHash() {
  try {
    // This would calculate a hash of all local data
    // For now, return a placeholder
    return `local_hash_${lastSyncTimestamp}`;
  } catch (error) {
    console.error('Failed to get local data hash:', error);
    return 'unknown';
  }
}

/**
 * Store conflict information
 */
async function storeConflict(conflict) {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(['conflicts'], 'readwrite');
    const store = transaction.objectStore('conflicts');
    
    return new Promise((resolve, reject) => {
      const request = store.add(conflict);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to store conflict:', error);
  }
}

/**
 * Save metadata to IndexedDB
 */
async function saveMetadata(key, value) {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(['metadata'], 'readwrite');
    const store = transaction.objectStore('metadata');
    
    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to save metadata:', error);
  }
}

/**
 * Handle push notifications
 */
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  if (!event.data) {
    return;
  }
  
  try {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Sync Update', {
        body: data.body || 'Your data has been synchronized',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: NOTIFICATION_TAG,
        data: data,
        actions: [
          {
            action: 'view',
            title: 'View App'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      })
    );
  } catch (error) {
    console.error('Failed to handle push notification:', error);
  }
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        // Check if app is already open
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if app is not open
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
    );
  }
});

/**
 * Show sync completion notification
 */
async function showSyncNotification(syncedCount, failedCount) {
  try {
    const title = 'Sync Completed';
    let body = `${syncedCount} items synchronized`;
    
    if (failedCount > 0) {
      body += `, ${failedCount} failed`;
    }
    
    await self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'sync-complete',
      silent: true, // Don't make sound for sync notifications
      data: {
        type: 'sync_complete',
        syncedCount,
        failedCount
      }
    });
  } catch (error) {
    console.error('Failed to show sync notification:', error);
  }
}

/**
 * Show conflict notification
 */
async function showConflictNotification() {
  try {
    await self.registration.showNotification('Data Conflict Detected', {
      body: 'Your data has conflicts that need to be resolved',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'conflict-detected',
      requireInteraction: true, // Keep notification until user interacts
      data: {
        type: 'conflict_detected'
      },
      actions: [
        {
          action: 'resolve',
          title: 'Resolve Conflicts'
        },
        {
          action: 'later',
          title: 'Resolve Later'
        }
      ]
    });
  } catch (error) {
    console.error('Failed to show conflict notification:', error);
  }
}

/**
 * Send message to all clients
 */
async function notifyClients(message) {
  try {
    const clients = await self.clients.matchAll();
    
    const promises = clients.map(client => 
      sendMessageToClient(client, message)
    );
    
    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Failed to notify clients:', error);
  }
}

/**
 * Send message to specific client
 */
function sendMessageToClient(client, message) {
  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };
    
    client.postMessage(message, [messageChannel.port2]);
    
    // Timeout after 5 seconds
    setTimeout(() => resolve(null), 5000);
  });
}

/**
 * Handle messages from clients
 */
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'register_sync':
      // Register background sync
      self.registration.sync.register(SYNC_TAG).catch((error) => {
        console.error('Failed to register background sync:', error);
      });
      break;
      
    case 'register_conflict_check':
      // Register periodic conflict check
      self.registration.sync.register(CONFLICT_CHECK_TAG).catch((error) => {
        console.error('Failed to register conflict check:', error);
      });
      break;
      
    case 'force_sync':
      // Force immediate sync
      performBackgroundSync().catch((error) => {
        console.error('Force sync failed:', error);
      });
      break;
      
    case 'get_sync_status':
      // Return sync status
      event.ports[0].postMessage({
        isOnline,
        syncInProgress,
        lastSyncTimestamp,
        pendingOperationsCount: pendingOperations.length
      });
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

/**
 * Handle online/offline events
 */
self.addEventListener('online', () => {
  console.log('Service Worker detected online');
  isOnline = true;
  
  // Trigger sync when coming back online
  self.registration.sync.register(SYNC_TAG).catch((error) => {
    console.error('Failed to register sync on online:', error);
  });
});

self.addEventListener('offline', () => {
  console.log('Service Worker detected offline');
  isOnline = false;
});

console.log('Background Sync Service Worker loaded');