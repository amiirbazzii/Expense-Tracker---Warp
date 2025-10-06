# Data Backup & Export Feature

## Overview
Added a comprehensive backup and export system to the Settings page that allows users to save and export their data from IndexedDB.

## Features

### 1. Save to IndexedDB (NEW!)
- **Purpose**: Local backup stored in browser's IndexedDB
- **Storage**: Persistent browser storage (survives page refresh)
- **Benefits**:
  - Instant backup without downloading files
  - Can be restored later
  - Shows last backup date and time
  - Displays count of backed up items
- **Use Case**: Quick local backup before making changes

### 2. JSON Backup Export
- **Purpose**: Complete backup of all user data
- **Format**: JSON file with full data structure
- **Includes**: 
  - All expenses
  - All income records
  - Categories
  - Cards
  - For values
- **Use Case**: Portable backup that can be saved anywhere

### 3. Excel Export
- **Purpose**: Spreadsheet format for data analysis
- **Format**: .xlsx file with multiple sheets
- **Sheets**:
  - **Expenses**: Date, Title, Amount, Categories, For, Card
  - **Income**: Date, Source, Amount, Category, Card, Notes
  - **Categories**: Name, Type
  - **For Values**: Value
  - **Cards**: ID, Name, Balance, Total Income, Total Expenses
- **Use Case**: Data analysis, reporting, sharing with accountants

## Implementation

### Files Created/Modified

1. **src/hooks/useDataBackup.ts** (NEW)
   - Custom hook for data backup operations
   - `exportAsJSON()`: Exports complete data as JSON
   - `exportAsExcel()`: Exports data as Excel spreadsheet
   - Uses existing `LocalStorageManager` for data access

2. **src/app/settings/page.tsx** (MODIFIED)
   - Added backup section with two export buttons
   - Integrated `useDataBackup` hook
   - Beautiful UI with icons and descriptions

3. **package.json** (MODIFIED)
   - Added `xlsx` dependency for Excel export functionality

## Usage

### For Users
1. Navigate to Settings page
2. Scroll to "Data Backup & Export" section
3. Choose your backup method:
   - **Save to IndexedDB**: Quick local backup (no download)
   - **Export as JSON**: Download complete backup file
   - **Export as Excel**: Download spreadsheet for analysis
4. View last backup info (date, time, item counts)

### File Naming
- JSON: `expense-tracker-backup-YYYY-MM-DD.json`
- Excel: `expense-tracker-export-YYYY-MM-DD.xlsx`

### IndexedDB Storage
- Database: `ExpenseTrackerBackup`
- Store: `backups`
- Key: `latest_backup`
- Persists across browser sessions

## Technical Details

### Dependencies
- `xlsx`: For Excel file generation
- `localforage`: Already used for IndexedDB access
- Existing `LocalStorageManager` class

### Data Flow
1. User clicks export button
2. Hook calls `LocalStorageManager` methods
3. Data is formatted appropriately
4. Blob is created and downloaded via browser

### Error Handling
- Try-catch blocks for all operations
- Toast notifications for success/failure
- Loading states during export

## Benefits

1. **Data Portability**: Users can backup their data locally
2. **Data Analysis**: Excel format allows for custom analysis
3. **Migration**: JSON format can be used for data migration
4. **Peace of Mind**: Users have control over their data
5. **Offline-First**: Works completely offline using IndexedDB

## Future Enhancements

Potential improvements:
- Import functionality (restore from backup)
- Scheduled automatic backups
- Cloud backup integration
- CSV export option
- PDF report generation
- Date range filtering for exports
