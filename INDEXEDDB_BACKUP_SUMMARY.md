# IndexedDB Backup Feature

## Overview
Added the ability to save backup data directly to the browser's IndexedDB storage, providing instant local backups without downloading files.

## What Was Added

### 1. New Hook Functions
**File**: `src/hooks/useDataBackup.ts`

- `saveToIndexedDB()` - Saves complete backup to IndexedDB
- `getLastBackupInfo()` - Retrieves info about the last backup

### 2. UI Updates
**File**: `src/app/settings/page.tsx`

- **New Button**: "Save to IndexedDB" with purple theme and Database icon
- **Last Backup Info Card**: Shows date, time, and item counts
- **Auto-refresh**: Updates backup info after saving

### 3. Storage Structure

```javascript
{
  version: '1.0.0',
  savedAt: '2025-01-06T10:30:00.000Z',
  userId: 'user_id_here',
  data: {
    expenses: [...],
    income: [...],
    categories: [...],
    forValues: [...],
    cards: [...]
  }
}
```

## How It Works

1. **User clicks "Save to IndexedDB"**
2. Hook fetches all data from Convex
3. Creates backup object with timestamp
4. Saves to IndexedDB using localforage
5. Updates UI to show last backup info
6. Shows success toast with item counts

## Storage Details

- **Database Name**: `ExpenseTrackerBackup`
- **Store Name**: `backups`
- **Key**: `latest_backup`
- **Persistence**: Survives browser restarts
- **Size**: Depends on data (typically < 5MB)

## Benefits

✅ **Instant Backup**: No file download needed
✅ **Persistent**: Survives page refresh and browser restart
✅ **Visible Info**: Shows when last backup was made
✅ **Item Counts**: Displays number of expenses and income
✅ **Offline**: Works completely offline
✅ **Fast**: Much faster than downloading files

## UI Features

### Last Backup Info Card
```
🕐 Last backup: 1/6/2025 at 10:30:45 AM
   125 expenses, 45 income
```

### Save Button
- Purple theme (Database icon)
- "Save to IndexedDB"
- "Local backup in browser storage"
- Disabled during export
- Updates backup info on success

## Use Cases

1. **Before Major Changes**: Quick backup before bulk edits
2. **Regular Backups**: Daily/weekly local backups
3. **Offline Safety**: Backup without internet connection
4. **Quick Recovery**: Restore point for accidental changes
5. **Development**: Test data preservation

## Future Enhancements

Potential additions:
- Restore from IndexedDB backup
- Multiple backup slots (backup history)
- Automatic scheduled backups
- Backup comparison tool
- Backup size indicator
- Export IndexedDB backup to file
