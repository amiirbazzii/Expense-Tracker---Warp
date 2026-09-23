"use client";

import React, { useState, useEffect } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import InputContainer from "@/components/InputContainer";
import { Type, Hash, Calendar } from "lucide-react";
import { Loan } from "../types";
import { deriveStart, type LoanCalendar } from "../schedule";
import { useSettings } from "@/contexts/SettingsContext";

interface LoanFormData {
  name: string;
  totalAmount: string;
  totalInstallments: string;
  paidInstallments: string;
  installmentAmount: string;
  monthlyPaymentDay: string;
  startMonth: string;
  startYear: string;
}

interface LoanFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    totalAmount: number;
    totalInstallments: number;
    paidInstallments: number;
    installmentAmount: number;
    monthlyPaymentDay: number;
    startMonth: number;
    startYear: number;
    calendar: LoanCalendar;
  }) => Promise<void>;
  editingLoan?: Loan | null;
}

const emptyForm: LoanFormData = {
  name: "",
  totalAmount: "",
  totalInstallments: "",
  paidInstallments: "",
  installmentAmount: "",
  monthlyPaymentDay: "",
  startMonth: "",
  startYear: "",
};

export function LoanForm({ open, onClose, onSubmit, editingLoan }: LoanFormProps) {
  const { settings } = useSettings();
  const loanCalendar: LoanCalendar =
    editingLoan?.calendar ?? settings?.calendar ?? "gregorian";
  const [form, setForm] = useState<LoanFormData>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (editingLoan) {
      setForm({
        name: editingLoan.name,
        totalAmount: String(editingLoan.totalAmount),
        totalInstallments: String(editingLoan.totalInstallments),
        paidInstallments: String(editingLoan.paidInstallments),
        installmentAmount: String(editingLoan.installmentAmount),
        monthlyPaymentDay: String(editingLoan.monthlyPaymentDay),
        startMonth: String(editingLoan.startMonth),
        startYear: String(editingLoan.startYear),
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [editingLoan, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = form.name.trim();
    const totalAmount = parseFloat(form.totalAmount);
    const totalInstallments = parseInt(form.totalInstallments, 10);
    const paidInstallments = parseInt(form.paidInstallments || "0", 10);
    const installmentAmount = parseFloat(form.installmentAmount);
    const monthlyPaymentDay = parseInt(form.monthlyPaymentDay, 10);

    // Validation
    if (!name) { setError("Please enter a loan name."); return; }
    if (isNaN(totalAmount) || totalAmount <= 0) { setError("Please enter a valid total amount."); return; }
    if (isNaN(totalInstallments) || totalInstallments < 1) { setError("Please enter at least 1 installment."); return; }
    if (
      isNaN(paidInstallments) ||
      paidInstallments < 0 ||
      paidInstallments > totalInstallments ||
      (!editingLoan && paidInstallments >= totalInstallments)
    ) {
      setError(
        editingLoan
          ? "Paid installments must be between 0 and total."
          : "Paid installments must be between 0 and total - 1.",
      );
      return;
    }
    if (isNaN(installmentAmount) || installmentAmount <= 0) { setError("Please enter a valid installment amount."); return; }
    if (isNaN(monthlyPaymentDay) || monthlyPaymentDay < 1 || monthlyPaymentDay > 31) {
      setError("Payment day must be between 1 and 31.");
      return;
    }

    const calendar = loanCalendar;
    let startMonth: number;
    let startYear: number;

    if (editingLoan) {
      startMonth = parseInt(form.startMonth, 10);
      startYear = parseInt(form.startYear, 10);
      if (isNaN(startMonth) || startMonth < 1 || startMonth > 12) {
        setError("Start month must be between 1 and 12.");
        return;
      }
      if (isNaN(startYear)) {
        setError("Please enter a valid start year.");
        return;
      }
    } else {
      ({ startMonth, startYear } = deriveStart(
        new Date(),
        paidInstallments,
        calendar,
      ));
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        totalAmount,
        totalInstallments,
        paidInstallments,
        installmentAmount,
        monthlyPaymentDay,
        startMonth,
        startYear,
        calendar,
      });
      setForm(emptyForm);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save loan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={editingLoan ? "Edit Loan" : "Add New Loan"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <Input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Loan name"
          icon={Type}
          required
        />

        <CurrencyInput
          value={form.totalAmount}
          onChangeValue={(val) => setForm({ ...form, totalAmount: val })}
          placeholder="Total loan amount"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            value={form.totalInstallments}
            onChange={(e) => setForm({ ...form, totalInstallments: e.target.value })}
            placeholder="Total installments"
            icon={Hash}
            min="1"
            required
          />
          <Input
            type="number"
            value={form.paidInstallments}
            onChange={(e) => setForm({ ...form, paidInstallments: e.target.value })}
            placeholder="Already paid"
            icon={Hash}
            min="0"
          />
        </div>

        <CurrencyInput
          value={form.installmentAmount}
          onChangeValue={(val) => setForm({ ...form, installmentAmount: val })}
          placeholder="Installment amount"
          required
        />

        <InputContainer leftIcon={Calendar}>
          <input
            type="number"
            value={form.monthlyPaymentDay}
            onChange={(e) => setForm({ ...form, monthlyPaymentDay: e.target.value })}
            className="w-full bg-transparent outline-none text-black placeholder:text-gray-500"
            placeholder="Monthly payment day (1-31)"
            min="1"
            max="31"
            required
          />
        </InputContainer>

        {editingLoan && (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-gray-500">
              Start month (1-12) — {loanCalendar}
              <Input
                type="number"
                value={form.startMonth}
                onChange={(e) => setForm({ ...form, startMonth: e.target.value })}
                placeholder="1-12"
                aria-label={`Start month (1-12) — ${loanCalendar}`}
                icon={Calendar}
                min="1"
                max="12"
                required
              />
            </label>
            <label className="text-xs text-gray-500">
              Start year — {loanCalendar}
              <Input
                type="number"
                value={form.startYear}
                onChange={(e) => setForm({ ...form, startYear: e.target.value })}
                placeholder="Year"
                aria-label={`Start year — ${loanCalendar}`}
                icon={Hash}
                required
              />
            </label>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || !form.name || !form.totalAmount || !form.totalInstallments || !form.installmentAmount || !form.monthlyPaymentDay}
          loading={isSubmitting}
        >
          {editingLoan ? "Save Changes" : "Add Loan"}
        </Button>
      </form>
    </BottomSheet>
  );
}
