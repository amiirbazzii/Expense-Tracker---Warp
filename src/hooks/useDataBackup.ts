import { useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useAuth } from '@/contexts/AuthContext';
import localforage from 'localforage';
import { useOfflineFirstData } from './useOfflineFirstData';

export function useDataBackup() {
  const [isExporting, setIsExporting] = useState(false);
  const { user } = useAuth();
  
  // Use offline-first data hook (automatically falls back to IndexedDB when offline)
  const { 
    expenses: allExpenses, 
    income: allIncome, 
    categories: allCategories, 
    forValues: allForValues, 
    cards: allCards,
    isUsingOfflineData,
    hasOfflineBackup,
    offlineBackupDate
  } = useOfflineFirstData();

  const exportAsJSON = async () => {
    setIsExporting(true);
    try {
      if (!allExpenses || !allIncome || !allCategories || !allForValues || !allCards) {
        toast.error('No data available. Please create a backup first.');
        setIsExporting(false);
        return;
      }

      const exportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        userId: user?._id,
        dataSource: isUsingOfflineData ? 'IndexedDB Backup' : 'Convex Cloud',
        data: {
          expenses: allExpenses,
          income: allIncome,
          categories: allCategories,
          forValues: allForValues,
          cards: allCards
        }
      };
      
      console.log(`JSON export from ${isUsingOfflineData ? 'IndexedDB' : 'Convex'}`);
      console.log('Expenses:', allExpenses.length);
      console.log('Income:', allIncome.length);
      console.log('Categories:', allCategories.length);
      console.log('For Values:', allForValues.length);
      console.log('Cards:', allCards.length);
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expense-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      const source = isUsingOfflineData ? ' (from offline backup)' : '';
      toast.success(`Backup exported successfully!${source}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export backup');
    } finally {
      setIsExporting(false);
    }
  };

  const saveToIndexedDB = async () => {
    setIsExporting(true);
    try {
      if (!allExpenses || !allIncome || !allCategories || !allForValues || !allCards) {
        toast.error('No data available to backup.');
        setIsExporting(false);
        return;
      }
      
      if (isUsingOfflineData) {
        toast.info('Already using offline data. Backup will overwrite existing backup.');
      }

      const backupData = {
        version: '1.0.0',
        savedAt: new Date().toISOString(),
        userId: user?._id,
        data: {
          expenses: allExpenses,
          income: allIncome,
          categories: allCategories,
          forValues: allForValues,
          cards: allCards
        }
      };

      // Save to IndexedDB using localforage
      const backupStorage = localforage.createInstance({
        name: 'ExpenseTrackerBackup',
        storeName: 'backups'
      });

      await backupStorage.setItem('latest_backup', backupData);
      
      console.log('Backup saved to IndexedDB');
      console.log('Expenses:', allExpenses.length);
      console.log('Income:', allIncome.length);
      console.log('Categories:', allCategories.length);
      
      toast.success(`Backup saved successfully! (${allExpenses.length} expenses, ${allIncome.length} income)`);
    } catch (error) {
      console.error('Save to IndexedDB failed:', error);
      toast.error('Failed to save backup to IndexedDB');
    } finally {
      setIsExporting(false);
    }
  };

  const getLastBackupInfo = async () => {
    try {
      const backupStorage = localforage.createInstance({
        name: 'ExpenseTrackerBackup',
        storeName: 'backups'
      });

      const backup = await backupStorage.getItem('latest_backup') as any;
      if (backup) {
        return {
          date: new Date(backup.savedAt),
          expenseCount: backup.data.expenses?.length || 0,
          incomeCount: backup.data.income?.length || 0
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get backup info:', error);
      return null;
    }
  };

  const exportAsExcel = async () => {
    setIsExporting(true);
    try {
      if (!allExpenses || !allIncome || !allCategories || !allForValues || !allCards) {
        toast.error('No data available. Please create a backup first.');
        setIsExporting(false);
        return;
      }

      console.log(`Excel export from ${isUsingOfflineData ? 'IndexedDB' : 'Convex'}`);
      console.log('Expenses:', allExpenses.length);
      console.log('Income:', allIncome.length);
      console.log('Categories:', allCategories.length);
      console.log('For Values:', allForValues.length);
      console.log('Cards:', allCards.length);
      
      // Create a card lookup map (ID -> Name)
      // Note: getCardBalances returns { cardId, cardName, balance, ... }
      const cardMap = new Map<string, string>();
      (allCards as any[]).forEach((card: any) => {
        cardMap.set(card.cardId, card.cardName);
      });
      
      // Helper function to get card name
      const getCardName = (cardId: string | undefined) => {
        if (!cardId) return 'N/A';
        return cardMap.get(cardId) || cardId;
      };
      
      // Format expenses for Excel
      const expensesData = (allExpenses as any[]).map((exp: any) => ({
        Date: new Date(exp.date).toLocaleDateString(),
        Title: exp.title,
        Amount: exp.amount,
        Categories: Array.isArray(exp.category) ? exp.category.join(', ') : exp.category,
        For: Array.isArray(exp.for) ? exp.for.join(', ') : exp.for || 'N/A',
        Card: getCardName(exp.cardId)
      }));
      
      // Format income for Excel
      const incomeData = (allIncome as any[]).map((inc: any) => ({
        Date: new Date(inc.date).toLocaleDateString(),
        Source: inc.source,
        Amount: inc.amount,
        Category: inc.category,
        Card: getCardName(inc.cardId),
        Notes: inc.notes || ''
      }));
      
      // Format categories for Excel
      const categoriesData = (allCategories as any[]).map((cat: any) => ({
        Name: cat.name,
        Type: cat.type || 'N/A'
      }));
      
      // Format cards for Excel
      const cardsData = (allCards as any[]).map((card: any) => ({
        ID: card.cardId,
        Name: card.cardName || 'Unnamed Card',
        Balance: card.balance || 0,
        'Total Income': card.totalIncome || 0,
        'Total Expenses': card.totalExpenses || 0
      }));
      
      // Format for values for Excel
      const forValuesData = (allForValues as any[]).map((fv: any) => ({
        Value: fv.value
      }));
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Add sheets
      const expensesSheet = XLSX.utils.json_to_sheet(expensesData.length > 0 ? expensesData : [{ Message: 'No expenses found' }]);
      const incomeSheet = XLSX.utils.json_to_sheet(incomeData.length > 0 ? incomeData : [{ Message: 'No income found' }]);
      const categoriesSheet = XLSX.utils.json_to_sheet(categoriesData.length > 0 ? categoriesData : [{ Message: 'No categories found' }]);
      const forValuesSheet = XLSX.utils.json_to_sheet(forValuesData.length > 0 ? forValuesData : [{ Message: 'No for values found' }]);
      const cardsSheet = XLSX.utils.json_to_sheet(cardsData.length > 0 ? cardsData : [{ Message: 'No cards found' }]);
      
      XLSX.utils.book_append_sheet(wb, expensesSheet, 'Expenses');
      XLSX.utils.book_append_sheet(wb, incomeSheet, 'Income');
      XLSX.utils.book_append_sheet(wb, categoriesSheet, 'Categories');
      XLSX.utils.book_append_sheet(wb, forValuesSheet, 'For Values');
      XLSX.utils.book_append_sheet(wb, cardsSheet, 'Cards');
      
      // Generate Excel file
      XLSX.writeFile(wb, `expense-tracker-export-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      const source = isUsingOfflineData ? ' (from offline backup)' : '';
      toast.success(`Excel file exported successfully!${source}`);
    } catch (error) {
      console.error('Excel export failed:', error);
      toast.error('Failed to export Excel file');
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportAsJSON,
    exportAsExcel,
    saveToIndexedDB,
    getLastBackupInfo,
    isExporting,
    isUsingOfflineData,
    hasOfflineBackup,
    offlineBackupDate
  };
}
