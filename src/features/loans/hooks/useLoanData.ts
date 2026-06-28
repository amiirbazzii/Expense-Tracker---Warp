"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { Loan, LoanSummary } from "../types";

export function useLoanData() {
  const { token } = useAuth();

  // Queries
  const loansQuery = useQuery(
    api.loans.getLoans,
    token ? { token } : "skip"
  );

  const summaryQuery = useQuery(
    api.loans.getLoanSummary,
    token ? { token } : "skip"
  );

  // Mutations
  const createLoanMutation = useMutation(api.loans.createLoan);
  const updateLoanMutation = useMutation(api.loans.updateLoan);
  const deleteLoanMutation = useMutation(api.loans.deleteLoan);
  const payInstallmentMutation = useMutation(api.loans.payInstallment);

  const loans = (loansQuery as Loan[] | undefined) ?? undefined;
  const summary = (summaryQuery as LoanSummary | undefined) ?? undefined;
  const isLoading = loansQuery === undefined;

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
    if (!token) throw new Error("Authentication required");
    return await createLoanMutation({ token, ...data });
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
    if (!token) throw new Error("Authentication required");
    return await updateLoanMutation({ token, loanId, ...data });
  };

  const deleteLoan = async (loanId: Loan["_id"]) => {
    if (!token) throw new Error("Authentication required");
    return await deleteLoanMutation({ token, loanId });
  };

  const payInstallment = async (loanId: Loan["_id"]) => {
    if (!token) throw new Error("Authentication required");
    return await payInstallmentMutation({ token, loanId });
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
