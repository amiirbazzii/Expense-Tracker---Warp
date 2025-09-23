# PWA Features

<cite>
**Referenced Files in This Document**   
- [manifest.json](file://public/manifest.json) - *Updated in recent commit*
- [sw.js](file://public/sw.js) - *Updated in recent commit*
- [next.config.js](file://next.config.js) - *PWA configuration with runtime caching*
- [NetworkStatusIndicator.tsx](file://src/components/NetworkStatusIndicator.tsx) - *Connectivity UI component*
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx) - *Offline state and queue management*
- [ServiceWorkerRegistration.tsx](file://src/components/ServiceWorkerRegistration.tsx) - *Manual service worker registration*
</cite>

## Update Summary
**Changes Made**   
- Updated web app manifest details to reflect new application name "Spendly" and updated icon paths
- Revised service worker implementation to reflect custom `sw.js` instead of `next-pwa` automated generation
- Updated installability criteria to align with current manual service worker registration
- Enhanced offline data management section with detailed cache strategies and fallback logic
- Added background sync implementation details from service worker code
- Removed references to `next.config.mjs` as configuration is now handled in `next.config.js`
- Updated section sources to reflect actual implementation files

## Table of Contents
1. [PWA Features](#pwa-features)
2. [Web App Manifest Configuration](#web-app-manifest-configuration)
3. [Service Worker Implementation](#service-worker-implementation)
4. [Installability Criteria](#installability-criteria)
5. [Network Status Indicator](#network-status-indicator)
6. [Offline Data Management](#offline-data-management)
7. [Background Sync and Runtime Caching](#background-sync-and-runtime-caching)
8. [Testing and Lighthouse Auditing](#testing-and-lighthouse-auditing)

## Web App Manifest Configuration

The web app manifest, defined in `manifest.json`, configures core Progressive Web App (PWA) properties that enable installability and native-like behavior. This JSON file provides metadata used by browsers when the user adds the app to their home screen.

Key configuration properties include:
- **name**: Full name of the application ("Spendly")
- **short_name**: Abbreviated name used on home screens ("Spendly")
- **description**: Brief description of app functionality
- **start_url**: Entry point when launched from home screen ("/")
- **display**: Presentation mode set to "standalone" to hide browser UI
- **background_color**: Splash screen background color (#000000)
- **theme_color**: Browser theme color (#000000)
- **orientation**: Enforced portrait orientation
- **scope**: The navigation scope of the application ("/")
- **categories**: App category tags for app stores ("finance", "productivity")
- **icons**: Array of image resources for app icons at various sizes

The manifest also includes high-resolution PNG icons (192x192 and 512x512 pixels) located in the `/icons` directory, marked with "any maskable" purpose to allow safe cropping on different device platforms.

```json
{
  "name": "Spendly",
  "short_name": "Spendly",
  "description": "Track your daily expenses with ease",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "orientation": "portrait-primary",
  "scope": "/",
  "categories": ["finance", "productivity"],
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

**Section sources**
- [manifest.json](file://public/manifest.json#L1-L27)

## Service Worker Implementation

The service worker implementation in `sw.js` provides comprehensive offline functionality through custom caching strategies and resource management. Unlike automated PWA solutions, this implementation offers fine-grained control over caching behavior and offline fallbacks.

The service worker uses a versioned cache strategy with two primary caches:
- **STATIC_CACHE**: Stores essential application resources with versioning ("expense-tracker-v3-static")
- **DYNAMIC_CACHE**: Stores runtime-generated content and API responses

The implementation includes:
- **CACHE_VERSION**: Version identifier for cache invalidation
- **ESSENTIAL_CACHE**: Array of critical application routes and assets to precache
- **CACHE_STRATEGIES**: Configuration object defining caching approaches
- **Background sync**: Event listener for background synchronization
- **Push notifications**: Handler for future push notification support

The service worker lifecycle includes:
1. **Install event**: Precaches essential resources during installation
2. **Activate event**: Cleans up old caches and takes control of clients
3. **Fetch event**: Intercepts network requests with intelligent routing
4. **Message event**: Enables communication with the main thread

```javascript
const CACHE_VERSION = 'expense-tracker-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const OFFLINE_PAGE = '/offline';

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
```

**Section sources**
- [sw.js](file://public/sw.js#L1-L50)

## Installability Criteria

For a web application to be installable as a PWA, it must meet specific criteria defined by browser vendors. The Spendly application satisfies these requirements through proper configuration and implementation.

### Key Installability Requirements:
- **Valid Web App Manifest**: Contains required fields (name, short_name, start_url, display, icons) with correct paths
- **Service Worker Registration**: Registered and controls the scope of the application
- **HTTPS Connection**: Required in production environments
- **Progressive Enhancement**: Core functionality available without service worker
- **Mobile-Friendly Design**: Responsive layout using Tailwind CSS
- **Secure Context**: Served over HTTPS in production

The application's installability is achieved through manual service worker registration via the `ServiceWorkerRegistration` component, which registers `sw.js` in production environments. This approach provides more control over the registration process compared to automated PWA plugins.

```tsx
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }
  }, []);

  return null;
}
```

```mermaid
flowchart TD
A["User visits site"] --> B{"Meets PWA criteria?"}
B --> |Yes| C["Browser shows install prompt"]
B --> |No| D["No install prompt shown"]
C --> E["User clicks install"]
E --> F["App added to home screen"]
F --> G["Launches in standalone mode"]
```

**Diagram sources**
- [manifest.json](file://public/manifest.json#L1-L27)
- [sw.js](file://public/sw.js#L1-L289)
- [ServiceWorkerRegistration.tsx](file://src/components/ServiceWorkerRegistration.tsx#L4-L19)

**Section sources**
- [manifest.json](file://public/manifest.json#L1-L27)
- [sw.js](file://public/sw.js#L1-L289)
- [ServiceWorkerRegistration.tsx](file://src/components/ServiceWorkerRegistration.tsx#L4-L19)

## Network Status Indicator

The `NetworkStatusIndicator` component provides real-time visual feedback about the application's connectivity status. It displays a small colored dot in the top-right corner of the screen that changes color based on online/offline state.

The component uses the `useOffline` hook to access network status from the `OfflineContext`. When online, the indicator appears green (#22c55e); when offline, it turns red (#ef4444). The indicator uses Framer Motion for smooth entrance and exit animations when the state changes.

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

The component is rendered in the main layout, ensuring it's available across all pages. It serves as both a visual indicator and accessibility feature, helping users understand when their actions might be queued for later synchronization.

**Section sources**
- [NetworkStatusIndicator.tsx](file://src/components/NetworkStatusIndicator.tsx#L1-L22)

## Offline Data Management

The application implements robust offline data management through the `OfflineContext`, which handles connectivity state and manages a queue of pending operations.

### Offline Context Architecture:
- **State Management**: Tracks `isOnline` status and `pendingExpenses` queue
- **IndexedDB Storage**: Uses localForage to persist pending expenses in browser storage
- **Event Listeners**: Monitors `online` and `offline` events on the window object
- **Mutation Queue**: Stores expense creation requests when offline

When the application detects an offline state, new expenses are added to a local queue instead of being sent to the server. These pending expenses are stored in IndexedDB using localForage, ensuring they persist across page reloads.

```mermaid
sequenceDiagram
participant UI as "User Interface"
participant Context as "OfflineContext"
participant DB as "IndexedDB"
participant API as "Convex API"
UI->>Context : addPendingExpense(expense)
Context->>DB : Save to pending-expenses store
Context->>UI : Update pendingExpenses state
Note over Context : Device goes offline
UI->>Context : createExpense(expense)
Context->>Context : Add to pending queue
Context->>DB : Persist updated queue
Note over Context : Device comes back online
Context->>Context : syncPendingExpenses()
Context->>API : Send each expense
API-->>Context : Success response
Context->>DB : Remove synced expenses
```

**Diagram sources**
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx#L1-L428)

**Section sources**
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx#L1-L428)

## Background Sync and Runtime Caching

The PWA implements advanced caching strategies through the custom service worker in `sw.js`, which provides comprehensive control over caching behavior and offline functionality.

### Runtime Caching Configuration:
- **Navigation Requests**: Handled with network-first strategy and intelligent offline fallbacks
- **API Requests**: Handled with network-first strategy and dynamic caching
- **Static Assets**: Handled with cache-first strategy for optimal performance
- **Generic Requests**: Handled with network-first strategy and dynamic caching

The background sync feature captures sync events through the service worker's sync event listener. When connectivity is restored, the service worker triggers a background sync event that prompts the application to synchronize pending operations.

```javascript
// Background sync for pending operations (if supported)
if ('sync' in self.registration) {
  self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
      console.log('Service Worker: Background sync triggered');
      event.waitUntil(
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'BACKGROUND_SYNC' });
          });
        })
      );
    }
  });
}
```

The service worker implements multiple caching strategies:
- **handleNavigationRequest**: Provides smart offline fallbacks based on route
- **handleApiRequest**: Serves API responses from cache when offline
- **handleStaticAsset**: Uses cache-first strategy for static assets
- **handleGenericRequest**: General request handling with fallback

Cache invalidation is managed through versioned cache names and cleanup during the activate event, ensuring old caches are removed when new service worker versions are installed.

**Section sources**
- [sw.js](file://public/sw.js#L1-L289)
- [next.config.js](file://next.config.js#L1-L38)

## Testing and Lighthouse Auditing

To ensure PWA functionality meets modern standards, comprehensive testing and auditing should be performed using browser developer tools and Lighthouse.

### Testing Checklist:
1. **Service Worker Registration**: Verify service worker is active in Application tab
2. **Offline Functionality**: Test core features while offline
3. **Install Prompt**: Confirm install banner appears on supported browsers
4. **Cache Behavior**: Verify assets are properly cached and served
5. **Background Sync**: Test mutation queuing and synchronization

### Lighthouse Audit Steps:
1. Open Chrome DevTools
2. Navigate to Lighthouse panel
3. Select "Progressive Web App" category
4. Run audit on various pages
5. Address any failing criteria

Key Lighthouse PWA criteria include:
- **Installable**: Manifest provides required properties
- **PWA Optimized**: Meets baseline PWA requirements
- **Service Worker**: Properly registered and functional
- **Content Availability**: Available offline
- **Page Load**: Loads while offline

The application should score 90+ on Lighthouse PWA audits to ensure optimal user experience across devices and network conditions.

**Section sources**
- [manifest.json](file://public/manifest.json#L1-L27)
- [sw.js](file://public/sw.js#L1-L289)
- [next.config.js](file://next.config.js#L1-L38)