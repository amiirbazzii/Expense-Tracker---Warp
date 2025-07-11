import { useMemo, useState, useCallback } from "react";
import { startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";

type DataType = "expense" | "income";

export function useTimeFramedData(type: DataType, token: string | null) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [key, setKey] = useState(0); // For cache busting

  const query = type === 'expense' 
    ? api.expenses.getExpensesByDateRange 
    : api.cardsAndIncome.getIncomeByDateRange;

  const result = useQuery(
    query,
    token
      ? {
          token,
          startDate: startOfMonth(currentDate).getTime(),
          endDate: endOfMonth(currentDate).getTime(),
          key,
        }
      : "skip"
  );

  const data = result as Doc<"expenses">[] | Doc<"income">[] | undefined;
  const isLoading = data === undefined;

  const monthlyTotal = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, item) => sum + item.amount, 0);
  }, [data]);

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
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
