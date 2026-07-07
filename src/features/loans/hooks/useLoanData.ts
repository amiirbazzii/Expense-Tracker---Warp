"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { localDataStore } from "@/lib/store";
import { useLocalData } from "@/hooks/useLocalData";
import { Loan, LoanSummary } from "../types";

/**
 * Provides loan data and mutation actions.
 * Reads from the reactive LocalDataStore; mutations write locally and enqueue.
 */
export function useLoanData() {
  const { user } = useAuth();
  const { loans: allLoans, isLoading } = useLocalData();

  const loans = allLoans as Loan[];

  const summary = useMemo<LoanSummary>(() => {
    const activeLoans = loans.filter((l) => l.paidInstallments < l.totalInstallments);
    const totalAmount = loans.reduce((sum, l) => sum + l.totalAmount, 0);
    const remainingBalance = activeLoans.reduce(
      (sum, l) => sum + l.installmentAmount * (l.totalInstallments - l.paidInstallments),
      0,
    );
    return {
      activeCount: activeLoans.length,
      totalAmount,
      remainingBalance,
    };
  }, [loans]);

  const createLoan = async (data: {
    name: string;
    totalAmount: number;
    totalInstallments: number;
    paidInstallments: number;
    installmentAmount: number;
    monthlyPaymentDay: number;
    startMonth: number;
    startYear: number;
  }) => {
    if (!user) throw new Error("Authentication required");
    return await localDataStore.createLoan(data);
  };

  const updateLoan = async (
    loanId: Loan["_id"],
    data: {
      name: string;
      totalAmount: number;
      totalInstallments: number;
      paidInstallments: number;
      installmentAmount: number;
      monthlyPaymentDay: number;
      startMonth: number;
      startYear: number;
    }
  ) => {
    if (!user) throw new Error("Authentication required");
    return await localDataStore.updateLoan(loanId, data);
  };

  const deleteLoan = async (loanId: Loan["_id"]) => {
    if (!user) throw new Error("Authentication required");
    return await localDataStore.deleteLoan(loanId);
  };

  const payInstallment = async (loanId: Loan["_id"]) => {
    if (!user) throw new Error("Authentication required");
    return await localDataStore.payInstallment(loanId);
  };

  return {
    loans,
    summary,
    isLoading,
    createLoan,
    updateLoan,
    deleteLoan,
    payInstallment,
  };
}
