import { useMemo, useState, useCallback, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { useOnlineStatus } from "./useOnlineStatus";
import DateObject from "react-date-object";
import jalali from "react-date-object/calendars/jalali";
import gregorian from "react-date-object/calendars/gregorian";

type DataType = "expense" | "income";

export function useTimeFramedData(type: DataType, token: string | null) {
  const { settings, isLoading: areSettingsLoading } = useSettings();
  const isJalali = settings?.calendar === "jalali";
  const isOnline = useOnlineStatus();

  const [currentDate, setCurrentDate] = useState(new DateObject());
  const [key, setKey] = useState(0);
  const [displayData, setDisplayData] = useState<Doc<"expenses">[] | Doc<"income">[] | undefined>(undefined);

  // Adjust calendar for currentDate when settings change
  useEffect(() => {
    setCurrentDate(new DateObject(currentDate).convert(isJalali ? jalali : gregorian));
  }, [isJalali]);

  const query = type === 'expense' 
    ? api.expenses.getExpensesByDateRange 
    : api.cardsAndIncome.getIncomeByDateRange;

  const startDate = new DateObject(currentDate).toFirstOfMonth().toUnix() * 1000;
  const endDate = new DateObject(currentDate).toLastOfMonth().toUnix() * 1000;
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
    setCurrentDate(new DateObject(currentDate).subtract(1, "month"));
  };

  const goToNextMonth = () => {
    setCurrentDate(new DateObject(currentDate).add(1, "month"));
  };

  const refetch = useCallback(() => {
    setKey((prevKey) => prevKey + 1);
  }, []);

  return {
    currentDate,
    data,
    monthlyTotal,
    isLoading,
    goToPreviousMonth,
    goToNextMonth,
    refetch,
  };
}