import { useMemo, useState, useCallback } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import moment from "jalali-moment";
import { startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";

type DataType = "expense" | "income";

export function useTimeFramedData(type: DataType, token: string | null) {
  const { settings } = useSettings();
  const isJalali = settings?.calendar === "jalali";

  const [currentDate, setCurrentDate] = useState(new Date());
  const [key, setKey] = useState(0); // For cache busting

  const query = type === 'expense' 
    ? api.expenses.getExpensesByDateRange 
    : api.cardsAndIncome.getIncomeByDateRange;

  // Compute month range depending on calendar
  const calcRange = () => {
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
  };

  const { start, end } = calcRange();

  const result = useQuery(
    query,
    token
      ? {
          token,
          startDate: start,
          endDate: end,
          key,
        }
      : "skip"
  );

  const fetchedData = result as Doc<"expenses">[] | Doc<"income">[] | undefined;
  const isLoading = fetchedData === undefined;

  const data = useMemo(() => {
    if (!fetchedData) return undefined;
    // Sort data by date in descending order (most recent first)
    const startOfDay = (ts: number) => {
      const d = new Date(ts);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    };

    return [...fetchedData].sort((a, b) => {
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
  }, [fetchedData]);

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
