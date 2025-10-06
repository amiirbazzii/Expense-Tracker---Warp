import { useState } from 'react';
import { LocalStorageManager } from '@/lib/storage/LocalStorageManager';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useAuth } from '@/contexts/AuthContext';
import localforage from 'localforage';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export function useDataBackup() {
  const [isExporting, setIsExporting] = useState(false);
  const { user, token } = useAuth();
  
  // Fetch all data from Convex
  const allExpenses = useQuery(api.expenses.getExpenses, token ? { token } : 'skip');
  const allIncome = useQuery(api.cardsAndIncome.getIncome, token ? { token } : 'skip');
  const allCategories = useQuery(api.expenses.getCategories, token ? { token } : 'skip');
  const allForValues = useQuery(api.expenses.getForValues, token ? { token } : 'skip');
  const allCards = useQuery(api.cardsAndIncome.getCardBalances, token ? { token } : 'skip');

  const exportAsJSON = async () => {
    setIsExporting(true);
    try {
      if (!allExpenses || !allIncome || !allCategories || !allForValues || !allCards) {
        toast.error('Data is still loading, please wait...');
        setIsExporting(false);
        return;
      }

      const exportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        userId: user?._id,
        data: {
          expenses: allExpenses,
          income: allIncome,
          categories: allCategories,
          forValues: allForValues,
          cards: allCards
        }
      };
      
      console.log('JSON export - Expenses:', allExpenses.length);
      console.log('JSON export - Income:', allIncome.length);
      console.log('JSON export - Categories:', allCategories.length);
      console.log('JSON export - For Values:', allForValues.length);
      console.log('JSON export - Cards:', allCards.length);
      
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
      
      toast.success('Backup exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export backup');
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsExcel = async () => {
    setIsExporting(true);
    try {
      if (!allExpenses || !allIncome || !allCategories || !allForValues || !allCards) {
        toast.error('Data is still loading, please wait...');
        setIsExporting(false);
        return;
      }

      console.log('Excel export - Expenses:', allExpenses.length);
      console.log('Excel export - Income:', allIncome.length);
      console.log('Excel export - Categories:', allCategories.length);
      console.log('Excel export - For Values:', allForValues.length);
      console.log('Excel export - Cards:', allCards.length);
      
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
      
      toast.success('Excel file exported successfully!');
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
    isExporting
  };
}
