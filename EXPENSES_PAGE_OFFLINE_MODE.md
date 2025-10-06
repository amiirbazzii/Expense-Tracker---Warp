# Expenses Page Offline Mode

## Overview
The expenses page now works completely offline, allowing users to view past expenses from backup and create new expenses that will sync later.

## Changes Made

### 1. Enhanced `useTimeFramedData` Hook
**File**: `src/hooks/useTimeFramedData.ts`

**Changes**:
- Integrated `useOfflineFirstData` hook
- Added IndexedDB backup as primary offline source
- Falls back to localStorage cache if no backup
- Filters offline data by date range
- Returns `isUsingOfflineData` flag

**Offline Data Priority**:
1. **Online**: Convex API (live data)
2. **Offline**: IndexedDB backup (filtered by date)
3. **Fallback**: localStorage cache

### 2. Updated Expenses Page
**File**: `src/app/expenses/page.tsx`

**Changes**:
- Added offline mode indicator banner
- Use offline backup for categories and forValues
- Display expenses from backup when offline
- Show helpful message about offline mode
- Existing offline queue still works for new expenses

## Features

### View Expenses Offline ✅
- View expenses from last backup
- Filter by month/year
- See expense details
- Navigate between months
- All data from backup

### Create Expenses Offline ✅
- Form still works offline
- New expenses saved to offline queue
- Will sync when back online
- Toast notification confirms offline save

### Categories & For Values Offline ✅
- Load from backup when offline
- Autocomplete still works
- Can select existing values
- Can create new values (queued)

## User Experience

### Visual Indicators

**Offline Banner**:
```
⚠️ Viewing Offline Backup Data
Showing expenses from your last backup. New expenses will sync when online.
```

**Features**:
- Orange background (warning color)
- WiFi off icon
- Clear message about data source
- Helpful instruction about syncing

### Functionality Matrix

| Feature | Online | Offline |
|---------|--------|---------|
| View Expenses | ✅ Live | ✅ Backup |
| Create Expense | ✅ Instant | ✅ Queued |
| Edit Expense | ✅ Yes | ❌ No |
| Delete Expense | ✅ Yes | ❌ No |
| Month Navigation | ✅ Yes | ✅ Yes |
| Categories | ✅ Live | ✅ Backup |
| For Values | ✅ Live | ✅ Backup |
| Cards | ✅ Live | ✅ Backup |

## How It Works

### Online Mode
```
1. User opens expenses page
2. Fetches from Convex API
3. Displays live data
4. Can create/edit/delete
5. Changes sync immediately
```

### Offline Mode
```
1. User opens expenses page (no internet)
2. Loads IndexedDB backup
3. Filters by current month
4. Displays backup data
5. Shows offline banner
6. Can create (queued for sync)
7. Can view (read-only)
```

### Creating Expense Offline
```
1. User fills form
2. Clicks "Add Expense"
3. Saved to offline queue
4. Toast: "Saved locally, will sync later"
5. Appears in list with "pending" badge
6. When online: auto-syncs
7. Toast: "Syncing X offline expenses..."
8. Success: "Sync completed"
```

## Data Flow

### Viewing Expenses

```
Expenses Page Opens
       ↓
useTimeFramedData Hook
       ↓
   Online? ──Yes──→ Fetch from Convex
       ↓              ↓
      No          Display Data
       ↓
Load IndexedDB Backup
       ↓
Filter by Date Range
       ↓
Display Backup Data
       ↓
Show Offline Banner
```

### Creating Expense

```
User Submits Form
       ↓
   Online? ──Yes──→ Create in Convex
       ↓              ↓
      No          Success Toast
       ↓              ↓
Add to Offline Queue   Refetch Data
       ↓
Save to localStorage
       ↓
Show "Pending" Badge
       ↓
Toast: "Saved locally"
       ↓
When Online: Auto-sync
```

## Testing

### Test Scenario 1: View Offline
1. Create backup while online
2. Go offline
3. Open expenses page
4. ✅ Should see orange banner
5. ✅ Should see expenses from backup
6. ✅ Month navigation should work
7. ✅ Can filter by month

### Test Scenario 2: Create Offline
1. Go offline
2. Open expenses page
3. Fill form and submit
4. ✅ Should see "Saved locally" toast
5. ✅ Expense appears with "pending" badge
6. ✅ Go online
7. ✅ Should auto-sync
8. ✅ "Pending" badge disappears

### Test Scenario 3: Month Navigation Offline
1. Go offline
2. Open expenses page
3. Click previous/next month
4. ✅ Should filter backup data
5. ✅ Should show correct month
6. ✅ Should update totals

## Requirements

### For Offline Viewing:
1. **Backup exists** - User must have saved backup
2. **Backup is recent** - Shows data from backup date
3. **IndexedDB enabled** - Browser must support it

### For Offline Creation:
1. **localStorage available** - For offline queue
2. **Form data valid** - All required fields filled
3. **Will sync later** - When connection returns

## Limitations

### Current Limitations:
1. **Read-only viewing** - Can't edit/delete offline
2. **Backup age** - Shows old data if backup outdated
3. **No real-time** - Won't see others' changes
4. **Manual backup** - User must create backup

### Future Enhancements:
1. **Auto-backup** - Automatic periodic backups
2. **Edit offline** - Queue edits for sync
3. **Delete offline** - Queue deletions
4. **Conflict resolution** - Handle sync conflicts
5. **Background sync** - Service worker sync

## Benefits

✅ **Always Available** - View expenses anytime
✅ **Create Offline** - Don't lose data
✅ **Auto-sync** - Seamless when online
✅ **Fast** - IndexedDB is faster than API
✅ **Reliable** - Works without internet
✅ **User-friendly** - Clear indicators

## Technical Details

### Offline Queue
- Stored in localStorage
- Key: `offline-expenses`
- Auto-syncs when online
- Retry failed syncs
- Shows pending status

### IndexedDB Backup
- Database: `ExpenseTrackerBackup`
- Store: `backups`
- Key: `latest_backup`
- Filtered by date range
- Faster than API calls

### localStorage Cache
- Fallback if no backup
- Key: `time-framed-data-expense-{start}-{end}`
- Per-month caching
- Cleared on new data

## Summary

The expenses page now provides:
- **Complete offline viewing** from backup
- **Offline expense creation** with queue
- **Automatic syncing** when online
- **Clear visual indicators** of mode
- **Month navigation** works offline
- **Categories/values** from backup
- **Fast and reliable** experience

Users can now manage their expenses anytime, anywhere, with or without internet!
