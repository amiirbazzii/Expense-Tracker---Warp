# PWA Support

<cite>
**Referenced Files in This Document**   
- [manifest.json](file://public/manifest.json)
- [sw.js](file://public/sw.js)
- [next.config.mjs](file://next.config.mjs)
- [NetworkStatusIndicator.tsx](file://src/components/NetworkStatusIndicator.tsx)
- [OfflineBanner.tsx](file://src/components/OfflineBanner.tsx)
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx)
</cite>

## Table of Contents
1. [PWA Configuration Overview](#pwa-configuration-overview)
2. [Manifest.json: App Metadata and Installation Settings](#manifestjson-app-metadata-and-installation-settings)
3. [Service Worker Implementation for Offline Support](#service-worker-implementation-for-offline-support)
4. [Next.js PWA Integration via next.config.mjs](#nextjs-pwa-integration-via-nextconfigmjs)
5. [Network Status and Offline Experience](#network-status-and-offline-experience)
6. [Installation Prompt and User Experience](#installation-prompt-and-user-experience)
7. [Testing PWA Features in Development](#testing-pwa-features-in-development)
8. [Browser Compatibility and Limitations](#browser-compatibility-and-limitations)
9. [Best Practices for PWA Maintenance](#best-practices-for-pwa-maintenance)

## PWA Configuration Overview

The Expense Tracker application is configured as a Progressive Web App (PWA), enabling users to install it on both mobile and desktop devices for an app-like experience. The PWA functionality is implemented through three core components: the `manifest.json` file for app metadata and installation behavior, the `sw.js` service worker for offline caching, and the `next.config.mjs` configuration that integrates PWA capabilities into the Next.js framework. Together, these components ensure the app is reliable, installable, and capable of functioning offline.

**Section sources**
- [manifest.json](file://public/manifest.json)
- [sw.js](file://public/sw.js)
- [next.config.mjs](file://next.config.mjs)

## Manifest.json: App Metadata and Installation Settings

The `manifest.json` file defines essential metadata that enables the browser to treat the web application as a native app. This includes the app name, icons, display mode, and theme colors.

```json
{
  "name": "Expense Tracker",
  "short_name": "ExpenseTracker",
  "description": "Track your daily expenses with ease",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### Key Manifest Properties:
- **name**: Full name of the app displayed during installation.
- **short_name**: Abbreviated name used on home screens.
- **start_url**: Entry point when the app is launched.
- **display**: Set to `standalone`, which removes browser UI elements for a native app feel.
- **icons**: Provides multiple PNG icons for different device resolutions, with `maskable` indicating they can be shaped by the OS.
- **theme_color**: Controls the color of the browser's address bar (on mobile) and app frame.

This configuration ensures the app appears professional and functions seamlessly when installed.

**Section sources**
- [manifest.json](file://public/manifest.json)

## Service Worker Implementation for Offline Support

The `sw.js` file implements a custom service worker that caches critical static assets and serves them when the user is offline. This enables the app to remain functional without an internet connection.

```javascript
const CACHE_NAME = 'expense-tracker-v1';
const urlsToCache = [
  '/',
  '/login',
  '/register',
  '/expenses',
  '/dashboard',
  '/settings',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
```

### Service Worker Lifecycle:
1. **Install**: Opens a cache and pre-loads all URLs listed in `urlsToCache`.
2. **Fetch**: Intercepts network requests and returns cached responses when available; otherwise, falls back to the network.
3. **Activate**: Removes outdated caches to ensure only the current version is stored.

This strategy ensures fast loading and offline access to core app pages and assets.

**Section sources**
- [sw.js](file://public/sw.js)

## Next.js PWA Integration via next.config.mjs

The PWA functionality is integrated into the Next.js application using the `next-pwa` plugin, configured in `next.config.mjs`. This setup enhances the service worker with advanced caching strategies and runtime behavior.

```javascript
import withPWA from 'next-pwa';

const isProduction = process.env.NODE_ENV === 'production';

const nextConfig = {
  // Next.js config
};

const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: !isProduction,
  runtimeCaching: [
    {
      urlPattern: /\/dashboard/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'dashboard-cache',
        expiration: {
          maxEntries: 1,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
    {
      urlPattern: /\/expenses/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'expenses-cache',
        expiration: {
          maxEntries: 1,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
    {
      urlPattern: ({ url }) => url.protocol.startsWith('https') && url.hostname.endsWith('.convex.cloud'),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'convex-api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
        },
        backgroundSync: {
          name: 'convex-mutations-queue',
          options: {
            maxRetentionTime: 24 * 60, // Retry for up to 24 hours
          },
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico|woff|woff2)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
  ],
};

export default withPWA(pwaConfig)(nextConfig);
```

### Key Configuration Options:
- **dest**: Specifies the `public` directory as the output location for the generated service worker.
- **register**: Automatically registers the service worker in the browser.
- **skipWaiting**: Allows the new service worker to activate immediately, bypassing the waiting phase.
- **disable**: Disables PWA in non-production environments to facilitate development.
- **runtimeCaching**: Defines caching strategies for different types of requests:
  - `StaleWhileRevalidate`: Serves stale content while revalidating in the background (ideal for dashboard data).
  - `NetworkFirst`: Prioritizes fresh data but falls back to cache if offline (used for expense pages).
  - `CacheFirst`: Caches static assets like images and fonts for up to 30 days.
  - `backgroundSync`: Ensures failed Convex API mutations are retried when connectivity resumes.

This configuration ensures optimal performance and reliability across network conditions.

**Section sources**
- [next.config.mjs](file://next.config.mjs)

## Network Status and Offline Experience

The application provides real-time feedback about network connectivity through two components: `NetworkStatusIndicator` and `OfflineBanner`.

### NetworkStatusIndicator

This component displays a small animated dot in the top-right corner indicating the current connection status.

```tsx
export function NetworkStatusIndicator() {
  const { isOnline } = useOffline();

  return (
    <AnimatePresence>
      <motion.div
        key={isOnline ? "online" : "offline"}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="fixed top-4 right-4 z-50 w-4 h-4 rounded-full border-2 border-white shadow-lg"
        style={{ backgroundColor: isOnline ? '#22c55e' : '#ef4444' }}
        title={isOnline ? "Online" : "Offline"}
      />
    </AnimatePresence>
  );
}
```

It uses `framer-motion` for smooth transitions between online (green) and offline (red) states.

### OfflineBanner

When offline, a banner appears at the top of the screen showing how many expenses are pending sync.

```tsx
export const OfflineBanner: React.FC = () => {
  const { isOnline, pendingExpenses } = useOffline();

  if (isOnline) return null;

  return (
    <div className="w-full bg-orange-100 text-orange-800 px-4 py-2 text-sm flex items-center gap-2">
      <AlertTriangle size={16} className="shrink-0" />
      <span>
        You are offline. {pendingExpenses.length} pending expense
        {pendingExpenses.length === 1 ? "" : "s"} will sync when you're back online.
      </span>
    </div>
  );
};
```

### Offline Context Management

The `OfflineContext` manages network state and pending operations using `navigator.onLine` and IndexedDB via `localforage`. It:
- Tracks online/offline status using browser events.
- Stores unsynced expenses in IndexedDB.
- Automatically retries syncing when connectivity is restored.
- Provides a queue mechanism for failed API calls.

This ensures data integrity and a seamless user experience during intermittent connectivity.

**Section sources**
- [NetworkStatusIndicator.tsx](file://src/components/NetworkStatusIndicator.tsx)
- [OfflineBanner.tsx](file://src/components/OfflineBanner.tsx)
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx)

## Installation Prompt and User Experience

Although the `beforeinstallprompt` event is not explicitly handled in the codebase, the presence of a valid `manifest.json` and service worker enables modern browsers to automatically prompt users to install the app when certain criteria are met (e.g., user engagement, secure context).

The app meets all technical requirements for installability:
- Served over HTTPS (required in production).
- Has a web app manifest with required fields.
- Registers a service worker with a fetch handler.
- Meets minimum engagement metrics (simulated through usage).

Users can manually install the app via browser UI (e.g., Chrome's "Install" option in the address bar). Once installed, the app launches in standalone mode, hiding browser controls and providing a native-like interface.

**Section sources**
- [manifest.json](file://public/manifest.json)
- [sw.js](file://public/sw.js)

## Testing PWA Features in Development

While PWA features are disabled in development (`disable: !isProduction`), they can be tested using the following methods:

### Lighthouse Audits
1. Open Chrome DevTools.
2. Navigate to the Lighthouse tab.
3. Run an audit with "Progressive Web App" selected.
4. Verify the app scores highly on installability, offline support, and performance.

### Application Tab Inspection
1. Open Chrome DevTools > Application tab.
2. Check the **Manifest** section for correct metadata.
3. Verify **Service Workers** are registered and active.
4. Use **Cache Storage** to inspect cached assets.
5. Simulate offline mode to test fallback behavior.

### Manual Testing
- Disable network in DevTools and reload the app.
- Confirm core pages load from cache.
- Add an expense while offline and verify it syncs when back online.

These steps ensure PWA functionality works as expected before deployment.

**Section sources**
- [sw.js](file://public/sw.js)
- [manifest.json](file://public/manifest.json)
- [next.config.mjs](file://next.config.mjs)

## Browser Compatibility and Limitations

### Supported Browsers
- **Chrome/Edge**: Full PWA support including installation, offline mode, and background sync.
- **Firefox**: Supports service workers and offline caching but limited installability.
- **Safari (iOS/macOS)**: Partial support; service workers are available but with limitations (e.g., no background sync, shorter cache retention).

### Known Limitations
- **Safari**: Does not support `backgroundSync`, which may affect offline mutation reliability on iOS.
- **Installation Prompt**: Not customizable without handling `beforeinstallprompt`, which is not implemented.
- **Storage Limits**: IndexedDB and cache storage are subject to browser quotas, which may affect large datasets.

Developers should test across browsers to ensure consistent behavior.

**Section sources**
- [next.config.mjs](file://next.config.mjs)
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx)

## Best Practices for PWA Maintenance

To maintain PWA compliance and performance:
1. **Version Service Workers**: Increment `CACHE_NAME` when updating cached assets to force cache refresh.
2. **Update Manifest Icons**: Ensure high-resolution icons are provided for all device types.
3. **Monitor Caching Strategies**: Adjust `runtimeCaching` rules based on usage patterns.
4. **Test Offline Flows**: Regularly verify offline data entry and sync functionality.
5. **Audit with Lighthouse**: Run audits after major updates to catch regressions.
6. **Handle API Changes**: Update `urlPattern` regex in `next.config.mjs` when API endpoints change.
7. **Graceful Degradation**: Ensure the app remains usable even if service workers fail.

Following these practices ensures the PWA remains reliable, performant, and user-friendly across updates.

**Section sources**
- [sw.js](file://public/sw.js)
- [next.config.mjs](file://next.config.mjs)
- [manifest.json](file://public/manifest.json)