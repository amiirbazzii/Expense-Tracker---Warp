# Offline Functionality

<cite>
**Referenced Files in This Document**   
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx)
- [sw.js](file://public/sw.js)
- [OfflineBanner.tsx](file://src/components/OfflineBanner.tsx)
- [NetworkStatusIndicator.tsx](file://src/components/NetworkStatusIndicator.tsx)
- [expenses.ts](file://convex/expenses.ts)
- [userSettings.ts](file://convex/userSettings.ts)
- [settings/page.tsx](file://src/app/settings/page.tsx)
- [next.config.mjs](file://next.config.mjs)
</cite>

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Offline Write Process](#offline-write-process)
4. [Sync Process](#sync-process)
5. [User Experience Components](#user-experience-components)
6. [Data Consistency and Conflict Resolution](#data-consistency-and-conflict-resolution)
7. [Performance Benefits and Trade-offs](#performance-benefits-and-trade-offs)
8. [Debugging and Testing](#debugging-and-testing)

## Architecture Overview

The offline-first architecture of the Expense Tracker application combines client-side storage with service worker caching to provide seamless functionality regardless of network connectivity. The system uses a dual-layer approach: localforage for IndexedDB storage of pending mutations and a service worker for caching static assets and API responses.

```mermaid
graph TB
subgraph "Client Application"
OC[OfflineContext]
LF[localforage<br/>IndexedDB]
NS[NetworkStatusIndicator]
OB[OfflineBanner]
CM[Convex Mutations]
end
subgraph "Service Worker"
SW[sw.js]
Cache[Cache Storage]
BG[Background Sync]
end
subgraph "Backend"
API[Convex API]
DB[(Database)]
end
OC --> LF
OC --> CM
CM --> SW
SW --> Cache
SW --> BG
BG --> API
CM --> API
API --> DB
OB --> OC
NS --> OC
style OC fill:#4C82AF,stroke:#333
style LF fill:#4C82AF,stroke:#333
style NS fill:#4C82AF,stroke:#333
style OB fill:#4C82AF,stroke:#333
style CM fill:#4C82AF,stroke:#333
style SW fill:#7D4CDB,stroke:#333
style Cache fill:#7D4CDB,stroke:#333
style BG fill:#7D4CDB,stroke:#333
style API fill:#10B981,stroke:#333
style DB fill:#10B981,stroke:#333
```

**Diagram sources**
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx)
- [sw.js](file://public/sw.js)
- [next.config.mjs](file://next.config.mjs)

**Section sources**
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx#L1-L171)
- [sw.js](file://public/sw.js#L1-L49)

## Core Components

The offline functionality is built around several key components that work together to provide a seamless offline experience. The OfflineContext manages the application's offline state and pending operations, while the service worker handles caching and background synchronization.

### OfflineContext Implementation

The OfflineContext is a React context that tracks network status and manages the queue of pending operations. It uses localforage to persist pending expenses in IndexedDB and provides methods to add and sync pending operations.

```mermaid
classDiagram
class OfflineContext {
+isOnline : boolean
+pendingExpenses : PendingExpense[]
+addPendingExpense(expense) : Promise~void~
+syncPendingExpenses() : Promise~void~
+retryFailedExpense(expenseId) : Promise~void~
}
class PendingExpense {
+id : string
+amount : number
+title : string
+category : string[]
+for : string[]
+date : number
+status : ExpenseStatus
}
class ExpenseStatus {
<<enumeration>>
pending
syncing
synced
failed
}
class localforage {
+config(options) : void
+getItem(key) : Promise~any~
+setItem(key, value) : Promise~void~
}
class ConvexMutation {
+useMutation(api.expenses.createExpense)
}
OfflineContext --> localforage : "uses for storage"
OfflineContext --> ConvexMutation : "uses for API calls"
OfflineContext --> PendingExpense : "contains"
PendingExpense --> ExpenseStatus : "uses"
```

**Diagram sources**
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx#L1-L171)

**Section sources**
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx#L1-L171)

### Service Worker Configuration

The service worker (sw.js) implements caching strategies for different types of resources. It precaches essential application routes and uses runtime caching for API calls, with background sync capabilities for failed mutations.

```mermaid
flowchart TD
A[Install Event] --> B[Open Cache]
B --> C[Add URLs to Cache]
C --> D[CACHE_NAME: expense-tracker-v1]
E[Fetch Event] --> F[Match Request in Cache]
F --> G{Cache Hit?}
G --> |Yes| H[Return Cached Response]
G --> |No| I[Fetch from Network]
I --> J{Network Success?}
J --> |Yes| K[Return Response]
J --> |No| L[Return Cache or Error]
M[Activate Event] --> N[Get All Cache Names]
N --> O{Cache Name === Current?}
O --> |No| P[Delete Old Cache]
O --> |Yes| Q[Keep Cache]
style A fill:#6366F1,stroke:#333
style B fill:#6366F1,stroke:#333
style C fill:#6366F1,stroke:#333
style D fill:#6366F1,stroke:#333
style E fill:#6366F1,stroke:#333
style F fill:#6366F1,stroke:#333
style G fill:#F59E0B,stroke:#333
style H fill:#10B981,stroke:#333
style I fill:#6366F1,stroke:#333
style J fill:#F59E0B,stroke:#333
style K fill:#10B981,stroke:#333
style L fill:#EF4444,stroke:#333
style M fill:#6366F1,stroke:#333
style N fill:#6366F1,stroke:#333
style O fill:#F59E0B,stroke:#333
style P fill:#EF4444,stroke:#333
style Q fill:#10B981,stroke:#333
```

**Diagram sources**
- [sw.js](file://public/sw.js#L1-L49)

**Section sources**
- [sw.js](file://public/sw.js#L1-L49)
- [next.config.mjs](file://next.config.mjs#L1-L74)

## Offline Write Process

When a user creates an expense while offline, the application intercepts the Convex API call and queues the operation for later synchronization. This process ensures that no data is lost during network outages.

```mermaid
sequenceDiagram
participant User as "User"
participant UI as "UI Component"
participant OC as "OfflineContext"
participant LF as "localforage"
participant API as "Convex API"
User->>UI : Create Expense (Offline)
UI->>OC : addPendingExpense()
OC->>OC : Generate ID and set status=pending
OC->>OC : Add to pendingExpenses state
OC->>LF : setItem('pending-expenses')
LF-->>OC : Success
OC-->>UI : Operation queued
UI-->>User : "Expense saved locally"
Note over OC,LF : Operation stored in IndexedDB<br/>No network call attempted
```

**Diagram sources**
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx#L90-L108)
- [expenses.ts](file://convex/expenses.ts#L1-L324)

**Section sources**
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx#L90-L108)
- [expenses.ts](file://convex/expenses.ts#L1-L324)

## Sync Process

The synchronization process automatically attempts to send pending operations to the server when connectivity is restored. Users can also manually trigger synchronization from the settings page.

```mermaid
sequenceDiagram
participant OC as "OfflineContext"
participant LF as "localforage"
participant CM as "createExpenseMutation"
participant API as "Convex API"
participant User as "User"
OC->>OC : isOnline = true
OC->>OC : syncPendingExpenses()
OC->>LF : getItem('pending-expenses')
LF-->>OC : Return pending expenses
loop For each pending expense
OC->>OC : updateExpenseStatus(id, 'syncing')
OC->>CM : createExpenseMutation()
CM->>API : HTTP Request
alt Success
API-->>CM : 200 OK
CM-->>OC : Success
OC->>OC : Remove from pending list
OC->>LF : setItem('pending-expenses')
else Failure
API-->>CM : Error
CM-->>OC : Error
OC->>OC : updateExpenseStatus(id, 'failed')
OC->>LF : setItem('pending-expenses')
end
end
User->>Settings : Manual Sync
Settings->>OC : syncPendingExpenses()
OC->>OC : Execute sync process
```

**Diagram sources**
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx#L110-L154)
- [settings/page.tsx](file://src/app/settings/page.tsx#L17-L37)

**Section sources**
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx#L110-L154)
- [settings/page.tsx](file://src/app/settings/page.tsx#L17-L37)

## User Experience Components

The application provides clear visual feedback about the network status and pending operations through two key components: OfflineBanner and NetworkStatusIndicator.

### OfflineBanner

The OfflineBanner displays a prominent notification when the application is offline, showing the number of pending expenses that will be synced when connectivity is restored.

```mermaid
flowchart TD
A[isOnline = false] --> B[Render Banner]
B --> C[Orange Background]
C --> D[Alert Icon]
D --> E[Text: "You are offline.<br/>X pending expense(s)"]
E --> F[Display on Screen]
style A fill:#F59E0B,stroke:#333
style B fill:#F59E0B,stroke:#333
style C fill:#F59E0B,stroke:#333
style D fill:#F59E0B,stroke:#333
style E fill:#F59E0B,stroke:#333
style F fill:#F59E0B,stroke:#333
```

**Diagram sources**
- [OfflineBanner.tsx](file://src/components/OfflineBanner.tsx#L1-L26)

**Section sources**
- [OfflineBanner.tsx](file://src/components/OfflineBanner.tsx#L1-L26)

### NetworkStatusIndicator

The NetworkStatusIndicator provides a subtle, persistent visual cue in the corner of the screen indicating the current network status with a color-coded dot.

```mermaid
flowchart TD
A[isOnline = true] --> B[Green Dot]
A --> C[Red Dot]
B --> D[Position: top-4 right-4]
C --> D
D --> E[Size: 16x16px]
E --> F[Border: white]
F --> G[Shadow]
G --> H[Title: "Online"/"Offline"]
style A fill:#6366F1,stroke:#333
style B fill:#10B981,stroke:#333
style C fill:#EF4444,stroke:#333
style D fill:#6366F1,stroke:#333
style E fill:#6366F1,stroke:#333
style F fill:#6366F1,stroke:#333
style G fill:#6366F1,stroke:#333
style H fill:#6366F1,stroke:#333
```

**Diagram sources**
- [NetworkStatusIndicator.tsx](file://src/components/NetworkStatusIndicator.tsx#L1-L22)

**Section sources**
- [NetworkStatusIndicator.tsx](file://src/components/NetworkStatusIndicator.tsx#L1-L22)

## Data Consistency and Conflict Resolution

The application employs several strategies to ensure data consistency and handle potential conflicts that may arise during offline operation and synchronization.

### Optimistic Updates

The application uses optimistic updates to provide immediate feedback to users when creating or modifying expenses. The UI is updated immediately, assuming the operation will succeed, and only rolls back if the server rejects the request.

### Conflict Resolution

The current implementation uses a "last write wins" strategy for conflict resolution. When multiple clients modify the same expense while offline, the last one to sync will overwrite previous changes. This is managed by the server-side mutation handlers in Convex.

### Data Validation

All mutations include validation to ensure data integrity:
- Expense amounts must be numbers
- Titles must be non-empty strings
- Categories and "for" values are normalized (capitalized)
- User authentication is verified for all operations

```mermaid
flowchart TD
A[User Creates Expense] --> B[Optimistic Update]
B --> C[Add to Pending Queue]
C --> D[Sync When Online]
D --> E{Server Accepts?}
E --> |Yes| F[Remove from Queue]
E --> |No| G[Mark as Failed]
G --> H[Allow Manual Retry]
H --> I[Re-attempt Sync]
style A fill:#6366F1,stroke:#333
style B fill:#6366F1,stroke:#333
style C fill:#6366F1,stroke:#333
style D fill:#6366F1,stroke:#333
style E fill:#F59E0B,stroke:#333
style F fill:#10B981,stroke:#333
style G fill:#EF4444,stroke:#333
style H fill:#6366F1,stroke:#333
style I fill:#6366F1,stroke:#333
```

**Diagram sources**
- [expenses.ts](file://convex/expenses.ts#L1-L324)
- [userSettings.ts](file://convex/userSettings.ts#L1-L59)

**Section sources**
- [expenses.ts](file://convex/expenses.ts#L1-L324)
- [userSettings.ts](file://convex/userSettings.ts#L1-L59)

## Performance Benefits and Trade-offs

The offline-first design provides significant performance benefits but also introduces certain trade-offs that must be considered.

### Benefits

- **Improved Responsiveness**: Operations complete immediately without waiting for network round-trips
- **Reliability**: Application remains functional during network outages
- **Reduced Server Load**: Batched synchronization reduces the number of individual API calls
- **Better User Experience**: Users can continue working without interruption

### Trade-offs

- **Storage Usage**: Pending operations consume local storage space
- **Data Synchronization Delay**: Changes are not immediately visible to other devices
- **Conflict Potential**: Concurrent modifications can lead to data conflicts
- **Complexity**: Additional code is required to manage offline state and synchronization

```mermaid
graph LR
A[Offline-First Design] --> B[Benefits]
A --> C[Trade-offs]
B --> B1[Immediate Feedback]
B --> B2[Network Resilience]
B --> B3[Reduced API Calls]
B --> B4[Continuous Productivity]
C --> C1[Local Storage Usage]
C --> C2[Synchronization Delay]
C --> C3[Conflict Possibility]
C --> C4[Implementation Complexity]
style A fill:#6366F1,stroke:#333
style B fill:#10B981,stroke:#333
style C fill:#EF4444,stroke:#333
style B1 fill:#10B981,stroke:#333
style B2 fill:#10B981,stroke:#333
style B3 fill:#10B981,stroke:#333
style B4 fill:#10B981,stroke:#333
style C1 fill:#EF4444,stroke:#333
style C2 fill:#EF4444,stroke:#333
style C3 fill:#EF4444,stroke:#333
style C4 fill:#EF4444,stroke:#333
```

**Section sources**
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx#L1-L171)
- [sw.js](file://public/sw.js#L1-L49)

## Debugging and Testing

Effective debugging and testing are essential for maintaining the reliability of the offline functionality.

### Debugging Tips

- **Inspect IndexedDB**: Use browser developer tools to view the "ExpenseTracker" database and "pending_expenses" store
- **Simulate Offline Mode**: Use the Network tab in developer tools to throttle to "Offline"
- **Monitor Console Logs**: Check for error messages from localforage and API calls
- **Service Worker Inspection**: Use the Application tab to view service worker status and cache storage

### Testing Strategies

- **Manual Testing**: Test creating expenses while offline and verify they sync when online
- **Edge Cases**: Test with large numbers of pending operations
- **Error Conditions**: Simulate API failures to verify retry logic
- **Storage Limits**: Test behavior when IndexedDB quota is exceeded

```mermaid
flowchart TD
A[Debugging Process] --> B[Open Dev Tools]
B --> C{Which Issue?}
C --> |Storage| D[Application Tab]
C --> |Network| E[Network Tab]
C --> |Logic| F[Console Tab]
C --> |Service Worker| G[Application Tab]
D --> H[Inspect IndexedDB]
H --> I[Check pending_expenses store]
E --> J[Set Offline Mode]
J --> K[Test Offline Functionality]
F --> L[Check for Errors]
L --> M[Review Stack Traces]
G --> N[Inspect Service Worker]
N --> O[Check Cache Storage]
style A fill:#6366F1,stroke:#333
style B fill:#6366F1,stroke:#333
style C fill:#F59E0B,stroke:#333
style D fill:#6366F1,stroke:#333
style E fill:#6366F1,stroke:#333
style F fill:#6366F1,stroke:#333
style G fill:#6366F1,stroke:#333
style H fill:#6366F1,stroke:#333
style I fill:#6366F1,stroke:#333
style J fill:#6366F1,stroke:#333
style K fill:#6366F1,stroke:#333
style L fill:#6366F1,stroke:#333
style M fill:#6366F1,stroke:#333
style N fill:#6366F1,stroke:#333
style O fill:#6366F1,stroke:#333
```

**Section sources**
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx#L1-L171)
- [sw.js](file://public/sw.js#L1-L49)
- [next.config.mjs](file://next.config.mjs#L1-L74)