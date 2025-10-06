# Data Backup & Export Feature

## Overview
Added a comprehensive backup and export system to the Settings page that allows users to save and export their data from IndexedDB.

## Features

### 1. JSON Backup Export
- **Purpose**: Complete backup of all user data
- **Format**: JSON file with full data structure
- **Includes**: 
  - All expenses
  - All income records
  - Categories
  - Cards
  - For values
  - Income categories
  - Sync state
  - Metadata

### 2. Excel Export
- **Purpose**: Spreadsheet format for data analysis
- **Format**: .xlsx file with multiple sheets
- **Sheets**:
  - **Expenses**: Date, Title, Amount, Categories, For, Card, Status
  - **Income**: Date, Source, Amount, Category, Card, Notes, Status
  - **Categories**: Name, Type
  - **Cards**: Name

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
3. Click "Export as JSON" for complete backup
4. Click "Export as Excel" for spreadsheet format
5. Files are automatically downloaded with timestamp

### File Naming
- JSON: `expense-tracker-backup-YYYY-MM-DD.json`
- Excel: `expense-tracker-export-YYYY-MM-DD.xlsx`

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
