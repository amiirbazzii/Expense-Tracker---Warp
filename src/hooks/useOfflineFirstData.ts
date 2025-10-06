import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';
import localforage from 'localforage';

interface BackupData {
  version: string;
  savedAt: string;
  userId: string;
  data: {
    expenses: any[];
    income: any[];
    categories: any[];
    forValues: any[];
    cards: any[];
  };
}

export function useOfflineFirstData() {
  const { token } = useAuth();
  const [offlineData, setOfflineData] = useState<BackupData | null>(null);
  const [isUsingOfflineData, setIsUsingOfflineData] = useState(false);

  // Try to fetch from Convex
  const convexExpenses = useQuery(api.expenses.getExpenses, token ? { token } : 'skip');
  const convexIncome = useQuery(api.cardsAndIncome.getIncome, token ? { token } : 'skip');
  const convexCategories = useQuery(api.expenses.getCategories, token ? { token } : 'skip');
  const convexForValues = useQuery(api.expenses.getForValues, token ? { token } : 'skip');
  const convexCards = useQuery(api.cardsAndIncome.getCardBalances, token ? { token } : 'skip');

  // Check if Convex data is available
  const hasConvexData = convexExpenses !== undefined && 
                        convexIncome !== undefined && 
                        convexCategories !== undefined && 
                        convexForValues !== undefined && 
                        convexCards !== undefined;

  // Load offline backup data
  useEffect(() => {
    const loadOfflineData = async () => {
      try {
        const backupStorage = localforage.createInstance({
          name: 'ExpenseTrackerBackup',
          storeName: 'backups'
        });

        const backup = await backupStorage.getItem('latest_backup') as BackupData;
        if (backup) {
          setOfflineData(backup);
          console.log('Offline backup loaded:', {
            expenses: backup.data.expenses?.length || 0,
            income: backup.data.income?.length || 0,
            savedAt: backup.savedAt
          });
        }
      } catch (error) {
        console.error('Failed to load offline data:', error);
      }
    };

    loadOfflineData();
  }, []);

  // Determine which data to use
  useEffect(() => {
    if (!hasConvexData && offlineData) {
      setIsUsingOfflineData(true);
      console.log('📴 Using offline backup data');
    } else if (hasConvexData) {
      setIsUsingOfflineData(false);
      console.log('🌐 Using online Convex data');
    }
  }, [hasConvexData, offlineData]);

  // Return the appropriate data source
  const expenses = hasConvexData ? convexExpenses : offlineData?.data.expenses || [];
  const income = hasConvexData ? convexIncome : offlineData?.data.income || [];
  const categories = hasConvexData ? convexCategories : offlineData?.data.categories || [];
  const forValues = hasConvexData ? convexForValues : offlineData?.data.forValues || [];
  const cards = hasConvexData ? convexCards : offlineData?.data.cards || [];

  return {
    expenses,
    income,
    categories,
    forValues,
    cards,
    isUsingOfflineData,
    hasOfflineBackup: !!offlineData,
    offlineBackupDate: offlineData?.savedAt ? new Date(offlineData.savedAt) : null,
    isLoading: !hasConvexData && !offlineData
  };
}
