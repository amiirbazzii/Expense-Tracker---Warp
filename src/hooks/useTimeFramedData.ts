import { useMemo, useState, useCallback, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import moment from "jalali-moment";
import { startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { useOnlineStatus } from "./useOnlineStatus";

type DataType = "expense" | "income";

export function useTimeFramedData(type: DataType, token: string | null) {
  const { settings } = useSettings();
  const isJalali = settings?.calendar === "jalali";
  const isOnline = useOnlineStatus();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [key, setKey] = useState(0);
  const [displayData, setDisplayData] = useState<Doc<"expenses">[] | Doc<"income">[] | undefined>(undefined);

  const query = type === 'expense' 
    ? api.expenses.getExpensesByDateRange 
    : api.cardsAndIncome.getIncomeByDateRange;

  // Compute month range depending on calendar
  const calcRange = useCallback(() => {
    if (isJalali) {
      const m = moment(currentDate);
      return {
        start: m.clone().startOf("jMonth").toDate().getTime(),
        end: m.clone().endOf("jMonth").toDate().getTime(),
      };
    }
    return {
      start: startOfMonth(currentDate).getTime(),
      end: endOfMonth(currentDate).getTime(),
    };
  }, [currentDate, isJalali]);

  const { start, end } = calcRange();
  const cacheKey = `time-framed-data-${type}-${start}-${end}`;

  const result = useQuery(
    query,
    token && isOnline
      ? {
          token,
          startDate: start,
          endDate: end,
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

  const isLoading = displayData === undefined;

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
    if (isJalali) {
      const newDate = moment(currentDate).subtract(1, "jMonth").toDate();
      setCurrentDate(newDate);
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const goToNextMonth = () => {
    if (isJalali) {
      const newDate = moment(currentDate).add(1, "jMonth").toDate();
      setCurrentDate(newDate);
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
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