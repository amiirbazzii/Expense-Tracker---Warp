# Local-First Hooks

<cite>
**Referenced Files in This Document**   
- [useLocalFirst.ts](file://src/hooks/useLocalFirst.ts)
- [LocalFirstProvider.tsx](file://src/providers/LocalFirstProvider.tsx)
- [LocalStorageManager.ts](file://src/lib/storage/LocalStorageManager.ts)
- [CloudSyncManager.ts](file://src/lib/sync/CloudSyncManager.ts)
- [ConflictDetector.ts](file://src/lib/sync/ConflictDetector.ts)
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Core Architecture](#core-architecture)
3. [LocalFirstProvider Implementation](#localfirstprovider-implementation)
4. [useLocalFirst Hook Interface](#uselocalfirst-hook-interface)
5. [Entity-Specific Hooks](#entity-specific-hooks)
6. [Data Flow and Synchronization](#data-flow-and-synchronization)
7. [Conflict Detection and Resolution](#conflict-detection-and-resolution)
8. [Usage Examples](#usage-examples)
9. [Best Practices](#best-practices)

## Introduction
The Local-First Hooks system provides a comprehensive solution for building offline-capable applications with automatic cloud synchronization. This architecture enables users to interact with the application seamlessly regardless of network connectivity, ensuring data persistence and consistency across devices. The system is built around two core components: the `LocalFirstProvider` that manages global state and the `useLocalFirst` hook that provides data access and manipulation capabilities to components.

**Section sources**
- [LocalFirstProvider.tsx](file://src/providers/LocalFirstProvider.tsx#L1-L67)
- [useLocalFirst.ts](file://src/hooks/useLocalFirst.ts#L1-L544)

## Core Architecture
The local-first architecture follows a layered pattern with clear separation of concerns between data storage, synchronization logic, and UI presentation. The system leverages IndexedDB via localforage for persistent local storage, implements background synchronization with conflict detection, and provides a React-friendly interface through custom hooks.

```mermaid
graph TB
subgraph "UI Layer"
A[React Components]
B[useLocalFirst Hook]
end
subgraph "Logic Layer"
C[LocalFirstProvider]
D[OfflineContext]
end
subgraph "Data Layer"
E[LocalStorageManager]
F[CloudSyncManager]
G[ConflictDetector]
end
A --> B
B --> C
C --> D
D --> E
D --> F
D --> G
E --> |IndexedDB| H[(Persistent Storage)]
F --> |HTTPS| I[Cloud API]
G --> E
G --> F
```

**Diagram sources**
- [LocalFirstProvider.tsx](file://src/providers/LocalFirstProvider.tsx#L1-L67)
- [useLocalFirst.ts](file://src/hooks/useLocalFirst.ts#L1-L544)
- [LocalStorageManager.ts](file://src/lib/storage/LocalStorageManager.ts#L1-L486)
- [CloudSyncManager.ts](file://src/lib/sync/CloudSyncManager.ts#L1-L662)
- [ConflictDetector.ts](file://src/lib/sync/ConflictDetector.ts#L1-L490)

**Section sources**
- [LocalFirstProvider.tsx](file://src/providers/LocalFirstProvider.tsx#L1-L67)
- [useLocalFirst.ts](file://src/hooks/useLocalFirst.ts#L1-L544)

## LocalFirstProvider Implementation
The `LocalFirstProvider` serves as the root provider that wraps the application and manages the local-first data ecosystem. It integrates multiple context providers and handles conflict resolution UI presentation.

```mermaid
classDiagram
class LocalFirstProvider {
+children : ReactNode
+render() : JSX.Element
}
class LocalFirstProviderInner {
+children : ReactNode
+conflictState : ConflictState
+resolveConflict() : Promise<void>
+dismissConflict() : void
+handleConflictAccept() : Promise<void>
+handleConflictDismiss() : void
+render() : JSX.Element
}
class ConflictPrompt {
+conflictResult : ConflictDetectionResult
+onAccept() : void
+onDismiss() : void
+isVisible : boolean
+isLoading : boolean
+render() : JSX.Element
}
LocalFirstProvider --> LocalFirstProviderInner : "composes"
LocalFirstProviderInner --> ConflictPrompt : "conditionally renders"
LocalFirstProvider --> ConvexProvider : "wraps"
LocalFirstProvider --> OfflineProvider : "wraps"
```

**Diagram sources**
- [LocalFirstProvider.tsx](file://src/providers/LocalFirstProvider.tsx#L1-L67)

**Section sources**
- [LocalFirstProvider.tsx](file://src/providers/LocalFirstProvider.tsx#L1-L67)

## useLocalFirst Hook Interface
The `useLocalFirst` hook provides a unified interface for accessing and manipulating local-first data. It exposes the current data state, synchronization status, and conflict information.

```typescript
interface LocalFirstDataResult<T> {
  data: T[];
  syncStatus: SyncStatus;
  conflicts: ConflictItem[];
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: Date | null;
  pendingCount: number;
}
```

The hook manages the complete lifecycle of data operations:
- Initializes local storage managers on authentication
- Loads data from persistent storage
- Handles background synchronization
- Detects and reports conflicts
- Updates UI state accordingly

```mermaid
sequenceDiagram
participant Component
participant Hook as useLocalFirst
participant Storage as LocalStorageManager
participant Cloud as CloudSyncManager
Component->>Hook : Render component
Hook->>Storage : Initialize with token
Storage-->>Hook : Ready
Hook->>Storage : Load data by entity type
Storage-->>Hook : Return local data
Hook-->>Component : Update state
Note over Hook,Cloud : Background sync when online
Hook->>Storage : Check for pending operations
Storage-->>Hook : Return pending items
Hook->>Cloud : syncToCloud() if pending
Cloud-->>Hook : Sync result
Hook->>Storage : Update sync status
Hook->>Component : Update sync status
```

**Diagram sources**
- [useLocalFirst.ts](file://src/hooks/useLocalFirst.ts#L1-L544)
- [LocalStorageManager.ts](file://src/lib/storage/LocalStorageManager.ts#L1-L486)
- [CloudSyncManager.ts](file://src/lib/sync/CloudSyncManager.ts#L1-L662)

**Section sources**
- [useLocalFirst.ts](file://src/hooks/useLocalFirst.ts#L1-L544)

## Entity-Specific Hooks
The system provides specialized hooks for different entity types, each extending the base functionality with type-specific operations.

### useExpenses Hook
Provides CRUD operations for expense entities with automatic synchronization.

```mermaid
classDiagram
class useExpenses {
+filters : DataFilters
+createExpense(expense) : Promise<LocalExpense>
+updateExpense(id, updates) : Promise<LocalExpense | null>
+deleteExpense(id) : Promise<boolean>
+refreshData() : Promise<void>
}
useExpenses --> useLocalFirstData : "extends"
useExpenses --> LocalStorageManager : "uses"
class LocalStorageManager {
+saveExpense(expense) : Promise<LocalExpense>
+updateExpense(id, updates) : Promise<LocalExpense | null>
+deleteExpense(id) : Promise<boolean>
}
```

**Diagram sources**
- [useLocalFirst.ts](file://src/hooks/useLocalFirst.ts#L200-L290)
- [LocalStorageManager.ts](file://src/lib/storage/LocalStorageManager.ts#L150-L220)

### useIncome Hook
Manages income records with similar CRUD operations and synchronization.

```mermaid
classDiagram
class useIncome {
+filters : DataFilters
+createIncome(income) : Promise<LocalIncome>
+updateIncome(id, updates) : Promise<LocalIncome | null>
+deleteIncome(id) : Promise<boolean>
+refreshData() : Promise<void>
}
useIncome --> useLocalFirstData : "extends"
useIncome --> LocalStorageManager : "uses"
class LocalStorageManager {
+saveIncome(income) : Promise<LocalIncome>
+updateIncome(id, updates) : Promise<LocalIncome | null>
+deleteIncome(id) : Promise<boolean>
}
```

**Diagram sources**
- [useLocalFirst.ts](file://src/hooks/useLocalFirst.ts#L292-L370)
- [LocalStorageManager.ts](file://src/lib/storage/LocalStorageManager.ts#L222-L290)

### useCategories and useCards Hooks
Provide specialized interfaces for category and card management.

```mermaid
flowchart TD
A[useCategories] --> B[useLocalFirstData]
A --> C[createCategory]
C --> D[LocalStorageManager.saveCategory]
E[useCards] --> F[useLocalFirstData]
E --> G[createCard]
G --> H[LocalStorageManager.saveCard]
I[Common Pattern] --> J[Type-specific hook]
J --> K[Entity filter]
J --> L[Create operation]
K --> M[Optional filtering]
L --> N[Storage manager call]
```

**Diagram sources**
- [useLocalFirst.ts](file://src/hooks/useLocalFirst.ts#L372-L454)
- [LocalStorageManager.ts](file://src/lib/storage/LocalStorageManager.ts#L292-L370)

**Section sources**
- [useLocalFirst.ts](file://src/hooks/useLocalFirst.ts#L200-L454)

## Data Flow and Synchronization
The synchronization process follows a well-defined flow that ensures data consistency between local storage and cloud backend.

```mermaid
sequenceDiagram
participant App as Application
participant Hook as useLocalFirst
participant Storage as LocalStorageManager
participant Cloud as CloudSyncManager
participant API as Convex API
App->>Hook : User creates expense
Hook->>Storage : saveExpense()
Storage->>Storage : Generate IDs, set syncStatus=pending
Storage-->>Hook : Return saved expense
Hook-->>App : Update UI immediately
Note over Hook : Background process
Hook->>Hook : Detect online status
Hook->>Storage : exportData()
Storage-->>Hook : LocalDataExport
Hook->>Cloud : syncToCloud(data, token)
Cloud->>API : Batch create/update mutations
API-->>Cloud : Results
Cloud-->>Hook : SyncResult
alt Conflicts detected
Hook->>Hook : Set syncStatus=conflict
Hook->>Hook : Store conflicts
else Success
Hook->>Hook : Set syncStatus=synced
Hook->>Storage : updateSyncState()
end
Hook->>App : Update sync status
```

The `LocalStorageManager` handles all local data operations with the following characteristics:
- **Persistent Storage**: Uses IndexedDB via localforage for reliable storage
- **Data Structure**: Organizes data by entity type in separate collections
- **Metadata Management**: Tracks schema version, device ID, and user association
- **Sync State**: Maintains pending operations queue and last sync timestamp

**Section sources**
- [useLocalFirst.ts](file://src/hooks/useLocalFirst.ts#L1-L544)
- [LocalStorageManager.ts](file://src/lib/storage/LocalStorageManager.ts#L1-L486)
- [CloudSyncManager.ts](file://src/lib/sync/CloudSyncManager.ts#L1-L662)

## Conflict Detection and Resolution
The system implements a comprehensive conflict detection and resolution strategy to handle data inconsistencies between local and cloud storage.

### Conflict Detection Process
```mermaid
sequenceDiagram
participant Detector as ConflictDetector
participant Local as LocalStorageManager
participant Cloud as CloudSyncManager
Detector->>Local : getDataHash()
Local-->>Detector : Local data hash
Detector->>Cloud : getCloudDataHash(token)
Cloud-->>Detector : Cloud data hash
alt Hashes differ
Detector->>Detector : detectConflicts(localData, cloudData)
Detector->>Detector : checkDataIntegrity()
Detector->>Detector : detectEntityConflicts()
Detector->>Detector : determineSeverity()
Detector->>Detector : getRecommendedAction()
Detector-->>System : ConflictDetectionResult
else Hashes match
Detector-->>System : No conflicts
end
```

### Conflict Resolution Workflow
When conflicts are detected, the system presents a resolution interface and applies the chosen strategy:

```mermaid
flowchart TD
A[Conflict Detected] --> B{Conflict Type}
B --> |missing_cloud| C[Recommend: Upload Local]
B --> |corrupted_local| D[Recommend: Download Cloud]
B --> |schema_mismatch| E[Recommend: Manual Merge]
B --> |divergent_data| F[Analyze Conflict Details]
F --> G{Auto-resolvable?}
G --> |Yes| H[Determine Direction by Timestamp]
G --> |No| I[Recommend: Manual Merge]
H --> J{Local more recent?}
J --> |Yes| K[Recommend: Upload Local]
J --> |No| L[Recommend: Download Cloud]
M[User Action] --> N[Apply Resolution]
N --> O[Update Local/Cloud Data]
O --> P[Update Sync Status]
P --> Q[Refresh UI]
```

The `ConflictDetector` class implements several key methods:
- **Data Integrity Checks**: Validates basic data presence and schema compatibility
- **Entity-Level Comparison**: Compares individual records across all entity types
- **Timestamp Analysis**: Uses `updatedAt` timestamps to determine data freshness
- **Automated Resolution**: Recommends actions based on conflict patterns and severity

**Diagram sources**
- [ConflictDetector.ts](file://src/lib/sync/ConflictDetector.ts#L1-L490)
- [CloudSyncManager.ts](file://src/lib/sync/CloudSyncManager.ts#L1-L662)
- [LocalStorageManager.ts](file://src/lib/storage/LocalStorageManager.ts#L1-L486)

**Section sources**
- [ConflictDetector.ts](file://src/lib/sync/ConflictDetector.ts#L1-L490)

## Usage Examples
### Basic Integration
Wrap your application with the `LocalFirstProvider` at the root level:

```tsx
// app/layout.tsx
import { LocalFirstProvider } from '../providers/LocalFirstProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <LocalFirstProvider>
          {children}
        </LocalFirstProvider>
      </body>
    </html>
  );
}
```

### Using Entity Hooks in Components
```tsx
// components/ExpenseList.tsx
import { useExpenses } from '../../hooks/useLocalFirst';

function ExpenseList() {
  const {
    data: expenses,
    isLoading,
    error,
    syncStatus,
    pendingCount,
    createExpense,
    updateExpense,
    deleteExpense
  } = useExpenses({ startDate: getMonthStart(), endDate: getMonthEnd() });

  const handleCreate = async () => {
    await createExpense({
      amount: 50.00,
      title: "Grocery Shopping",
      category: "groceries",
      date: Date.now(),
      syncStatus: "pending"
    });
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <button onClick={handleCreate}>Add Expense</button>
      <div>Sync Status: {syncStatus} ({pendingCount} pending)</div>
      {expenses.map(expense => (
        <ExpenseCard 
          key={expense.id} 
          expense={expense}
          onUpdate={updateExpense}
          onDelete={deleteExpense}
        />
      ))}
    </div>
  );
}
```

### Handling Sync States
Monitor synchronization status to provide user feedback:

```tsx
// components/SyncIndicator.tsx
import { useSyncStatus } from '../../hooks/useLocalFirst';

function SyncIndicator() {
  const { 
    globalSyncStatus, 
    lastGlobalSync, 
    pendingOperationsCount,
    triggerGlobalSync 
  } = useSyncStatus();

  return (
    <div>
      <span>Status: {globalSyncStatus}</span>
      {lastGlobalSync && <span>Last Sync: {lastGlobalSync.toLocaleString()}</span>}
      {pendingOperationsCount > 0 && (
        <span>Pending: {pendingOperationsCount}</span>
      )}
      {globalSyncStatus === 'pending' && (
        <button onClick={triggerGlobalSync}>Sync Now</button>
      )}
    </div>
  );
}
```

**Section sources**
- [useLocalFirst.ts](file://src/hooks/useLocalFirst.ts#L1-L544)
- [LocalFirstProvider.tsx](file://src/providers/LocalFirstProvider.tsx#L1-L67)

## Best Practices
### Data Filtering
Apply filters at the hook level to optimize performance and reduce memory usage:

```typescript
// Use specific date ranges
const monthlyExpenses = useExpenses({
  startDate: startOfMonth,
  endDate: endOfMonth
});

// Filter by category
const foodExpenses = useExpenses({
  category: ['groceries', 'dining']
});

// Limit results for performance
const recentExpenses = useExpenses({
  limit: 10,
  offset: 0
});
```

### Error Handling
Implement proper error handling around data operations:

```typescript
const handleCreateExpense = async () => {
  try {
    await createExpense(expenseData);
    showSuccessToast("Expense created successfully");
  } catch (error) {
    showErrorToast(`Failed to create expense: ${error.message}`);
    // Log error to monitoring service
    console.error('Expense creation failed:', error);
  }
};
```

### Performance Optimization
- **Batch Operations**: When creating multiple records, consider implementing batch operations to reduce sync overhead
- **Selective Sync**: Use filters to sync only necessary data subsets
- **Loading States**: Always handle `isLoading` states to provide feedback during data operations
- **Conflict Awareness**: Monitor `conflicts` array and prompt users appropriately

### Offline Considerations
- **Immediate Feedback**: Update UI immediately after local operations, before sync completes
- **Pending Indicators**: Show `pendingCount` to inform users of unsynced changes
- **Retry Logic**: The system automatically retries failed sync operations when connectivity is restored
- **Data Validation**: Validate data locally before saving to prevent sync failures

**Section sources**
- [useLocalFirst.ts](file://src/hooks/useLocalFirst.ts#L1-L544)
- [LocalStorageManager.ts](file://src/lib/storage/LocalStorageManager.ts#L1-L486)