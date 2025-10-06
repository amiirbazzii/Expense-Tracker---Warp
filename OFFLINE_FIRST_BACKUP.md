# Offline-First Backup System

## Overview
The backup system now automatically falls back to IndexedDB data when the internet is down or Convex is unavailable. This makes the app truly offline-first.

## How It Works

### Automatic Fallback Logic

```
1. Try to fetch data from Convex (cloud)
   ↓
2. If Convex unavailable → Use IndexedDB backup
   ↓
3. Display data from whichever source is available
```

### New Hook: `useOfflineFirstData`

This hook intelligently manages data sources:

```typescript
const {
  expenses,        // From Convex OR IndexedDB
  income,          // From Convex OR IndexedDB
  categories,      // From Convex OR IndexedDB
  forValues,       // From Convex OR IndexedDB
  cards,           // From Convex OR IndexedDB
  isUsingOfflineData,    // true if using IndexedDB
  hasOfflineBackup,      // true if backup exists
  offlineBackupDate,     // Date of backup
  isLoading              // true if no data available
} = useOfflineFirstData();
```

## Features

### 1. Automatic Detection
- Detects when Convex is unavailable
- Automatically switches to IndexedDB backup
- No user intervention required

### 2. Visual Indicators
**When Online (Convex)**:
- Shows "Last backup" info card
- Normal operation

**When Offline (IndexedDB)**:
- Shows orange "Using Offline Backup Data" banner
- Displays backup date and time
- All export functions still work

### 3. Export from Any Source
All export functions work regardless of data source:
- **Save to IndexedDB**: Updates the backup
- **Export as JSON**: Includes data source in metadata
- **Export as Excel**: Works with offline data

### 4. Smart Toast Messages
- "Backup exported successfully! (from offline backup)"
- "Excel file exported successfully! (from offline backup)"
- Indicates data source in success messages

## User Experience

### Scenario 1: Normal Online Use
1. User has internet connection
2. Data loads from Convex
3. User can create backups
4. Exports use live cloud data

### Scenario 2: Internet Goes Down
1. Internet connection lost
2. App automatically switches to IndexedDB backup
3. Orange banner appears: "Using Offline Backup Data"
4. User can still view and export data
5. All functionality continues to work

### Scenario 3: No Backup Available
1. Internet down + No backup
2. App shows "No data available"
3. User prompted to wait for connection

## Technical Implementation

### Data Flow

```
┌─────────────────┐
│   User Opens    │
│   Settings      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ useOfflineFirst │
│      Data       │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌──────────┐
│Convex │ │IndexedDB │
│ API   │ │ Backup   │
└───┬───┘ └────┬─────┘
    │          │
    └────┬─────┘
         │
         ▼
    ┌─────────┐
    │  Data   │
    │Available│
    └─────────┘
```

### Storage Structure

**IndexedDB Backup**:
```javascript
{
  version: '1.0.0',
  savedAt: '2025-01-06T12:00:00.000Z',
  userId: 'user_id',
  data: {
    expenses: [...],
    income: [...],
    categories: [...],
    forValues: [...],
    cards: [...]
  }
}
```

**JSON Export with Source**:
```javascript
{
  version: '1.0.0',
  exportedAt: '2025-01-06T12:30:00.000Z',
  dataSource: 'IndexedDB Backup', // or 'Convex Cloud'
  userId: 'user_id',
  data: { ... }
}
```

## Benefits

✅ **True Offline Support**: App works without internet
✅ **Seamless Transition**: Automatic fallback, no user action needed
✅ **Data Preservation**: Always have access to last backup
✅ **Full Functionality**: Export and backup work offline
✅ **Clear Indicators**: User knows which data source is active
✅ **No Data Loss**: Can continue working offline

## Use Cases

### 1. Traveling
- No internet on plane/train
- View and export expense data
- Continue tracking (with offline queue)

### 2. Poor Connection
- Unstable internet
- App uses backup instead of waiting
- Smooth user experience

### 3. Server Maintenance
- Convex temporarily down
- Users unaffected
- Can still access their data

### 4. Data Security
- Local backup always available
- Not dependent on cloud
- Privacy-focused users benefit

## Best Practices

### For Users
1. **Create regular backups** when online
2. **Check backup date** in settings
3. **Update backup** before traveling
4. **Export important data** periodically

### For Developers
1. Always check `isUsingOfflineData` flag
2. Show appropriate UI indicators
3. Handle both data sources gracefully
4. Test offline scenarios regularly

## Future Enhancements

Potential improvements:
- Sync offline changes when back online
- Multiple backup slots
- Automatic periodic backups
- Backup compression
- Selective data restore
- Conflict resolution UI
