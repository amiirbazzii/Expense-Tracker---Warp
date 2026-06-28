"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import { Plus, ChevronRight } from "lucide-react";
import { DateFilterHeader } from "@/components/DateFilterHeader";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { format } from "date-fns";

// Import loan components
import { LoanCard } from "@/features/loans/components/LoanCard";
import { LoanForm } from "@/features/loans/components/LoanForm";
import { LoanActionSheet } from "@/features/loans/components/LoanActionSheet";
import { LoanSummaryCards } from "@/features/loans/components/LoanSummaryCards";
import { PayInstallmentSheet } from "@/features/loans/components/PayInstallmentSheet";
import { useLoanData } from "@/features/loans/hooks/useLoanData";
import { Loan } from "@/features/loans/types";

export default function LoansPage() {
  const { token } = useAuth();
  const [navigating, setNavigating] = useState(false);

  // Get current month/year for date filter
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Loan data hook
  const {
    loans,
    summary,
    isLoading,
    createLoan,
    updateLoan,
    deleteLoan,
    payInstallment,
  } = useLoanData();

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showPaySheet, setShowPaySheet] = useState(false);

  // Handle month navigation
  const handleNextMonth = () => {
    if (isLoading) return;
    setNavigating(true);
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setTimeout(() => setNavigating(false), 100);
  };

  const handlePreviousMonth = () => {
    if (isLoading) return;
    setNavigating(true);
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setTimeout(() => setNavigating(false), 100);
  };

  // Filter loans for the selected month
  const filteredLoans = useMemo(() => {
    if (!loans) return [];
    return loans.filter((loan) => {
      const remaining = loan.totalInstallments - loan.paidInstallments;
      if (remaining <= 0) return false;

      const startOffset =
        loan.startYear * 12 + loan.startMonth + loan.paidInstallments;
      const endOffset =
        loan.startYear * 12 + loan.startMonth + loan.totalInstallments - 1;
      const checkOffset = currentYear * 12 + currentMonth;

      return checkOffset >= startOffset && checkOffset <= endOffset;
    });
  }, [loans, currentMonth, currentYear]);

  // Month name for display
  const monthName = format(new Date(currentYear, currentMonth - 1), "MMMM");

  // Handlers
  const handleLoanTap = (loan: Loan) => {
    setSelectedLoan(loan);
    setShowActionSheet(true);
  };

  const handlePayInstallment = (loan: Loan) => {
    setShowActionSheet(false);
    setShowPaySheet(true);
  };

  const handleEditLoan = (loan: Loan) => {
    setShowActionSheet(false);
    setEditingLoan(loan);
    setShowForm(true);
  };

  const handleDeleteLoan = async (loan: Loan) => {
    setShowActionSheet(false);
    if (confirm(`Are you sure you want to delete "${loan.name}"?`)) {
      try {
        await deleteLoan(loan._id);
      } catch (err: any) {
        alert(err?.message || "Failed to delete loan.");
      }
    }
  };

  const handleFormSubmit = async (data: {
    name: string;
    totalAmount: number;
    totalInstallments: number;
    paidInstallments: number;
    installmentAmount: number;
    monthlyPaymentDay: number;
    startMonth: number;
    startYear: number;
  }) => {
    if (editingLoan) {
      await updateLoan(editingLoan._id, data);
    } else {
      await createLoan(data);
    }
    setShowForm(false);
    setEditingLoan(null);
  };

  const handlePayComplete = () => {
    setShowPaySheet(false);
  };

  const hasLoans = loans && loans.length > 0;

  return (
    <>
      <div className="min-h-screen bg-white">
        <AppHeader />
        {(navigating || isLoading) && <FullScreenLoader message="Loading..." />}

        <div className="max-w-md mx-auto p-4 pt-[92px] pb-28">
          {/* Loan Summary Cards */}
          {hasLoans && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <LoanSummaryCards summary={summary} />
            </motion.div>
          )}

          {/* Date Filter Header */}
          <DateFilterHeader
            monthName={monthName}
            year={String(currentYear)}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
            subtitle="Loan Installments"
            isMainTitle={false}
            isLoading={isLoading || navigating}
          />

          {/* Loan List or Empty State */}
          {isLoading ? (
            <div className="space-y-3 mt-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse bg-gray-100 rounded-xl"
                />
              ))}
            </div>
          ) : hasLoans ? (
            <div className="space-y-3 mt-4">
              {filteredLoans.length > 0 ? (
                filteredLoans.map((loan) => (
                  <LoanCard key={loan._id} loan={loan} onTap={handleLoanTap} />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No installments due this month</p>
                </div>
              )}
            </div>
          ) : (
            // Empty state - show CTA to add first loan directly opening the form
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setEditingLoan(null);
                setShowForm(true);
              }}
              className="w-full mt-4 flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white shadow-sm transition-colors active:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-600">
                  <Plus size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">
                    Add your first loan
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Track installments easily
                  </p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </motion.button>
          )}

          {/* FAB for adding new loan */}
          {hasLoans && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setEditingLoan(null);
                setShowForm(true);
              }}
              className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center"
              aria-label="Add new loan"
            >
              <Plus size={28} />
            </motion.button>
          )}
        </div>

        <BottomNav />

        {/* Loan Form Bottom Sheet */}
        <LoanForm
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingLoan(null);
          }}
          onSubmit={handleFormSubmit}
          editingLoan={editingLoan}
        />

        {/* Loan Action Sheet */}
        <LoanActionSheet
          open={showActionSheet}
          onClose={() => setShowActionSheet(false)}
          loan={selectedLoan}
          onPayInstallment={handlePayInstallment}
          onEdit={handleEditLoan}
          onDelete={handleDeleteLoan}
        />

        {/* Pay Installment Sheet */}
        <PayInstallmentSheet
          open={showPaySheet}
          onClose={() => setShowPaySheet(false)}
          loan={selectedLoan}
          onPaid={handlePayComplete}
        />
      </div>
    </>
  );
}
