# Cards Page Offline Mode

## Overview
The cards page now works offline, allowing users to view their cards and balances from backup. All modification operations (add, delete, transfer) require an internet connection.

## Changes Made

### Updated Cards Page
**File**: `src/app/cards/page.tsx`

**Changes**:
- Integrated `useOfflineFirstData` hook for cards
- Added offline mode indicator banner
- Display cards from backup when offline
- Disable add/delete/transfer buttons when offline
- Show helpful tooltips for disabled actions
- Use offline backup for card balances

## Features

### View Cards Offline ✅
- View all cards from last backup
- See card balances
- See total income per card
- See total expenses per card
- All data from backup

### Modify Cards Offline ❌
- Add card: Requires online
- Delete card: Requires online
- Transfer funds: Requires online

## User Experience

### Visual Indicators

**Offline Banner**:
```
⚠️ Viewing Offline Backup Data
Showing cards from your last backup. Changes require internet connection.
```

**Disabled Buttons**:
- Add button: Grayed out with tooltip
- Delete button: Grayed out with tooltip
- Transfer button: Shows "(Offline)" text

### Functionality Matrix

| Feature | Online | Offline |
|---------|--------|---------|
| View Cards | ✅ Live | ✅ Backup |
| View Balances | ✅ Live | ✅ Backup |
| Add Card | ✅ Yes | ❌ No |
| Delete Card | ✅ Yes | ❌ No |
| Transfer Funds | ✅ Yes | ❌ No |

## How It Works

### Online Mode
```
1. User opens cards page
2. Fetches from Convex API
3. Displays live data
4. Can add/delete/transfer
5. Changes sync immediately
```

### Offline Mode
```
1. User opens cards page (no internet)
2. Loads IndexedDB backup
3. Displays backup data
4. Shows offline banner
5. Disables modification buttons
6. View-only mode
```

## Data Flow

### Viewing Cards

```
Cards Page Opens
       ↓
Query Convex
       ↓
   Success? ──Yes──→ Use Convex Data
       ↓              ↓
      No          Display Cards
       ↓
Load IndexedDB Backup
       ↓
Display Backup Data
       ↓
Show Offline Banner
       ↓
Disable Buttons
```

## Card Data Structure

### Online (Convex)
```typescript
{
  cardId: string,
  cardName: string,
  balance: number,
  totalIncome: number,
  totalExpenses: number
}
```

### Offline (IndexedDB Backup)
```typescript
// Same structure from backup
{
  cardId: string,
  cardName: string,
  balance: number,
  totalIncome: number,
  totalExpenses: number
}
```

## Testing

### Test Scenario 1: View Offline
1. Create backup while online
2. Go offline
3. Open cards page
4. ✅ Should see orange banner
5. ✅ Should see all cards
6. ✅ Should see balances
7. ✅ Buttons should be disabled

### Test Scenario 2: Try to Modify Offline
1. Go offline
2. Open cards page
3. Try to add card
4. ✅ Button should be disabled
5. ✅ Tooltip shows "Requires internet"
6. Try to delete card
7. ✅ Button should be grayed out
8. Try to transfer
9. ✅ Button shows "(Offline)"

### Test Scenario 3: Back Online
1. Go offline, view cards
2. Go back online
3. Refresh page
4. ✅ Orange banner disappears
5. ✅ Buttons become enabled
6. ✅ Can add/delete/transfer

## Requirements

### For Offline Viewing:
1. **Backup exists** - User must have saved backup
2. **Backup is recent** - Shows data from backup date
3. **IndexedDB enabled** - Browser must support it

### For Modifications:
- **Internet required** - All changes need online connection
- **No offline queue** - Unlike expenses/income

## Limitations

### Current Limitations:
1. **Read-only** - Can't add/delete/transfer offline
2. **Backup age** - Shows old data if backup outdated
3. **No offline queue** - Changes not queued
4. **Manual backup** - User must create backup

### Why No Offline Queue?
Cards are foundational data that affects:
- Expenses (require valid cardId)
- Income (require valid cardId)
- Transfers (complex multi-step operations)

Adding/deleting cards offline could cause:
- Invalid references in expenses/income
- Sync conflicts
- Data integrity issues

**Decision**: Keep cards online-only for data integrity.

## Benefits

✅ **View Anytime** - See cards without internet
✅ **See Balances** - Check balances offline
✅ **Fast** - IndexedDB is faster than API
✅ **Reliable** - Works without internet
✅ **Clear Indicators** - Know what's available

## Technical Details

### Data Source

**Online**:
- Cards: `api.cardsAndIncome.getCardBalances`

**Offline**:
- Cards: IndexedDB backup

### Button States

```typescript
// Add button
disabled={!cardName.trim() || isSubmitting || isUsingOfflineData}

// Delete button
disabled={isUsingOfflineData}
className={isUsingOfflineData ? 'text-gray-400 cursor-not-allowed' : 'text-red-600'}

// Transfer button
disabled={!fromCard || !toCard || !amount || isTransferring || isUsingOfflineData}
text={isUsingOfflineData ? "Transfer (Offline)" : "Transfer"}
```

## Comparison with Other Pages

| Feature | Dashboard | Expenses | Income | Cards |
|---------|-----------|----------|--------|-------|
| View Offline | ✅ | ✅ | ✅ | ✅ |
| Create Offline | N/A | ✅ | ✅ | ❌ |
| Edit Offline | N/A | ❌ | ❌ | ❌ |
| Delete Offline | N/A | ❌ | ❌ | ❌ |
| Offline Queue | N/A | ✅ | ✅ | ❌ |

## Summary

The cards page now provides:
- **Complete offline viewing** from backup
- **Card balances** visible offline
- **Income/expense totals** per card
- **Clear visual indicators** of mode
- **Disabled buttons** with helpful tooltips
- **Read-only mode** for data integrity

Users can now view their cards and balances anytime, anywhere, with or without internet connection!

### Design Decision

Cards remain **online-only for modifications** to ensure:
- Data integrity
- Valid references
- No sync conflicts
- Reliable operations

This is the right balance between offline access and data safety.
