import { useMemo, useState, useCallback, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { useOnlineStatus } from "./useOnlineStatus";
import moment from 'jalali-moment';

type DataType = "expense" | "income";

export function useTimeFramedData(type: DataType, token: string | null) {
  const { settings, isLoading: areSettingsLoading } = useSettings();
  const isJalali = settings?.calendar === "jalali";
  const isOnline = useOnlineStatus();
  const [currentDate, setCurrentDate] = useState(moment());
  const [key, setKey] = useState(0);
  const [displayData, setDisplayData] = useState<Doc<"expenses">[] | Doc<"income">[] | undefined>(undefined);

  // Adjust calendar for currentDate when settings change
  useEffect(() => {
    moment.locale(isJalali ? 'fa' : 'en');
  }, [isJalali, currentDate]);

  const query = type === 'expense' 
    ? api.expenses.getExpensesByDateRange 
    : api.cardsAndIncome.getIncomeByDateRange;

  const startDate = currentDate.clone().startOf(isJalali ? 'jMonth' : 'month').valueOf();
  const endDate = currentDate.clone().endOf(isJalali ? 'jMonth' : 'month').valueOf();
  const cacheKey = `time-framed-data-${type}-${startDate}-${endDate}`;

  const result = useQuery(
    query,
    token && isOnline
      ? {
          token,
          startDate,
          endDate,
          key,
        }
      : "skip"
  );

  const fetchedData = result as Doc<"expenses">[] | Doc<"income">[] | undefined;

  useEffect(() => {
    if (isOnline) {
      if (fetchedData !== undefined) {
        // Online: data fetched, update state and cache
        setDisplayData(fetchedData);
        localStorage.setItem(cacheKey, JSON.stringify(fetchedData));
      }
    } else {
      // Offline: load from cache
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setDisplayData(JSON.parse(cached));
      } else {
        setDisplayData(undefined); // No cache available
      }
    }
  }, [fetchedData, isOnline, cacheKey]);

  const isLoading = areSettingsLoading || displayData === undefined;

  const data = useMemo(() => {
    if (!displayData) return undefined;
    // Sort data by date in descending order (most recent first)
    const startOfDay = (ts: number) => {
      const d = new Date(ts);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    };

    return [...displayData].sort((a, b) => {
      const aDay = startOfDay(a.date);
      const bDay = startOfDay(b.date);

      // Primary sort: by day (newest day first)
      if (bDay !== aDay) {
        return bDay - aDay;
      }

      // Secondary sort: by creation timestamp (newest first)
      const aTime = a.createdAt ?? a._creationTime ?? a.date;
      const bTime = b.createdAt ?? b._creationTime ?? b.date;
      return bTime - aTime;
    });
  }, [displayData]);

  const monthlyTotal = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, item) => sum + item.amount, 0);
  }, [data]);

  const goToPreviousMonth = () => {
    setCurrentDate(currentDate.clone().subtract(1, "month"));
  };

  const monthName = isJalali ? currentDate.format("jMMMM") : currentDate.format("MMMM");
  const year = isJalali ? currentDate.format("jYYYY") : currentDate.format("YYYY");

  const goToNextMonth = () => {
    setCurrentDate(currentDate.clone().add(1, "month"));
  };

  const refetch = useCallback(() => {
    setKey((prevKey) => prevKey + 1);
  }, []);

  return {
    currentDate,
    data,
    monthlyTotal,
    monthName,
    year,
    isLoading,
    goToPreviousMonth,
    goToNextMonth,
    refetch,
  };
}