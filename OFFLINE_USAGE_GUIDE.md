# Offline Usage Guide

## Current Offline Capabilities

### ✅ What Works Offline (with backup)
1. **Settings Page Exports**
   - Export as JSON
   - Export as Excel
   - View backup information

### ⚠️ What Requires Online Connection
1. **Dashboard** - Needs Convex for date-range queries
2. **Expenses Page** - Needs Convex for CRUD operations
3. **Income Page** - Needs Convex for CRUD operations
4. **Real-time Data** - Needs Convex for live updates

## How to Use Offline Exports

### Step 1: Create a Backup (While Online)
1. Open the app with internet connection
2. Go to **Settings** page
3. Click **"Save to IndexedDB"** button
4. Wait for success message
5. Note the backup date/time

### Step 2: Verify Backup
- Check that "Last backup" info appears
- Shows number of expenses and income
- Backup is now stored in your browser

### Step 3: Use Offline
1. Go offline (disable internet)
2. Open Settings page
3. You'll see orange banner: "Using Offline Backup Data"
4. Click **"Export as JSON"** or **"Export as Excel"**
5. Files will download with your backed-up data

## Important Notes

### ⚠️ Limitations
- **Dashboard won't load offline** - This is because it uses complex date-range queries
- **Can't create new expenses offline** - Requires Convex connection
- **Backup is read-only** - Can export but not modify data offline

### ✅ What's Saved in Backup
- All expenses (complete history)
- All income records
- All categories
- All "for" values
- All cards with balances

### 🔄 Keeping Backup Fresh
- Create new backup regularly (daily/weekly)
- Backup before traveling
- Backup before important meetings
- Check backup date in Settings

## Troubleshooting

### "No data available" when offline
**Problem**: No backup exists
**Solution**: 
1. Go online
2. Open Settings
3. Click "Save to IndexedDB"
4. Try offline again

### Backup shows old data
**Problem**: Backup is outdated
**Solution**:
1. Go online
2. Open Settings
3. Click "Save to IndexedDB" again
4. This overwrites old backup

### Exports are empty
**Problem**: Backup might be corrupted
**Solution**:
1. Go online
2. Delete browser data for this site
3. Login again
4. Create fresh backup

## Future Enhancements

To make the entire app work offline, we would need to:

1. **Refactor Dashboard**
   - Use offline-first data hook
   - Cache date-range queries
   - Filter locally instead of server-side

2. **Refactor Expenses Page**
   - Queue offline changes
   - Sync when back online
   - Show pending status

3. **Add Sync Manager**
   - Detect online/offline transitions
   - Auto-sync pending changes
   - Conflict resolution

4. **Service Worker**
   - Cache app shell
   - Cache API responses
   - Background sync

## Quick Reference

### When Online
```
Settings → Save to IndexedDB → Success!
```

### When Offline
```
Settings → See orange banner → Export works!
Dashboard → Won't load (needs online)
```

### Best Practice
```
1. Create backup daily when online
2. Check backup date before traveling
3. Use exports for offline data access
4. Sync when back online
```
