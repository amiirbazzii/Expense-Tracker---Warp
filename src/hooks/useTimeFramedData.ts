import { useMemo, useState, useEffect, useRef } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useLocalData } from "./useLocalData";
import moment from 'jalali-moment';

type DataType = "expense" | "income";

/**
 * Provides time-framed (month-scoped) expense or income data.
 * Now reads exclusively from the reactive LocalDataStore — no Convex queries.
 */
export function useTimeFramedData(type: DataType, _token: string | null) {
  const { settings, isLoading: areSettingsLoading } = useSettings();
  const isJalali = settings?.calendar === "jalali";
  const [currentDate, setCurrentDate] = useState(moment());

  const { expenses: allExpenses, income: allIncome } = useLocalData();

  // Adjust calendar locale when settings change
  useEffect(() => {
    moment.locale(isJalali ? 'fa' : 'en');
  }, [isJalali, currentDate]);

  const startDate = currentDate.clone().startOf(isJalali ? 'jMonth' : 'month').valueOf();
  const endDate = currentDate.clone().endOf(isJalali ? 'jMonth' : 'month').valueOf();

  // Filter the local data by the current month's date range
  const rawSource = type === 'expense' ? allExpenses : allIncome;

  // Keep the 100ms loading debounce so fast month-switches don't flash empty
  const [displayData, setDisplayData] = useState<typeof rawSource | undefined>(undefined);
  const delayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (delayTimer.current) {
      clearTimeout(delayTimer.current);
      delayTimer.current = null;
    }
    // Clear immediately so the new data is visible as soon as it arrives
    const filtered = (rawSource as any[]).filter((item: any) =>
      item.date >= startDate && item.date <= endDate
    );
    setDisplayData(filtered);
  }, [rawSource, startDate, endDate]);

  // Clear display briefly on month navigation to avoid stale render
  const prevStart = useRef(startDate);
  useEffect(() => {
    if (prevStart.current !== startDate) {
      prevStart.current = startDate;
      // Briefly show nothing; the effect above will re-set displayData
      delayTimer.current = setTimeout(() => {
        delayTimer.current = null;
      }, 100);
    }
  }, [startDate]);

  const isLoading = areSettingsLoading || displayData === undefined;

  const data = useMemo(() => {
    if (!displayData) return undefined;
    // Sort by date descending (most recent first), then by creation time
    const startOfDay = (ts: number) => {
      const d = new Date(ts);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    };

    return [...displayData].sort((a, b) => {
      const aDay = startOfDay(a.date);
      const bDay = startOfDay(b.date);

      if (bDay !== aDay) {
        return bDay - aDay;
      }

      const aTime = (a as any).createdAt ?? a._creationTime ?? a.date;
      const bTime = (b as any).createdAt ?? b._creationTime ?? b.date;
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

  const goToNextMonth = () => {
    setCurrentDate(currentDate.clone().add(1, "month"));
  };

  const monthName = isJalali ? currentDate.format("jMMMM") : currentDate.format("MMMM");
  const year = isJalali ? currentDate.format("jYYYY") : currentDate.format("YYYY");

  const refetch = () => {
    // No-op: store re-renders automatically on writes.
  };

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
    isUsingOfflineData: false,
  };
}
