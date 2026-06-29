"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loan } from "../types";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/lib/formatters";
import {
  Landmark,
  CalendarIcon,
  CreditCard,
  Pencil,
  Trash2,
} from "lucide-react";
import { DropdownMenu } from "@/components/DropdownMenu";

interface LoanCardProps {
  loan: Loan & { isCurrentMonthPaid?: boolean };
  onPayInstallment: (loan: Loan) => void;
  onEdit: (loan: Loan) => void;
  onDelete: (loan: Loan) => void;
}

export function LoanCard({
  loan,
  onPayInstallment,
  onEdit,
  onDelete,
}: LoanCardProps) {
  const { settings } = useSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const progress =
    loan.totalInstallments > 0
      ? (loan.paidInstallments / loan.totalInstallments) * 100
      : 0;
  const remaining = loan.totalInstallments - loan.paidInstallments;

  const formattedTotal = settings
    ? formatCurrency(loan.totalAmount, settings.currency)
    : `$${loan.totalAmount.toLocaleString()}`;

  const formattedInstallment = settings
    ? formatCurrency(loan.installmentAmount, settings.currency)
    : `$${loan.installmentAmount.toLocaleString()}`;

  const allPaid = loan.paidInstallments >= loan.totalInstallments;
  const currentMonthPaid = loan.isCurrentMonthPaid || false;
  const payDisabled = allPaid || currentMonthPaid;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <motion.div
      ref={cardRef}
      whileTap={{ scale: 0.98 }}
      onClick={() => setIsMenuOpen((prev) => !prev)}
      // استایل کلی کارت: پس‌زمینه، گوشه‌ها، پدینگ
      className={`relative w-full text-left rounded-xl border border-gray-200 pt-4 transition-all cursor-pointer ${
        isMenuOpen ? "z-30" : "z-0"
      } ${
        loan.isCurrentMonthPaid
          ? "bg-[#F9F9F9] active:bg-gray-200"
          : "bg-white active:bg-gray-50 shadow-sm"
      }`}
    >
      {/* بخش هدر (نام وام و مبلغ قسط) */}
      <div className="flex items-start justify-between px-4">
        <div className="flex items-center gap-1">
          <h3
            className={`text-base font-medium ${
              loan.isCurrentMonthPaid ? "text-green-600" : "text-gray-950"
            }`}
          >
            {loan.name}
          </h3>
          {/* لیبل 'Paid' فقط زمانی نمایش داده می‌شود که قسط پرداخت شده باشد */}
          {loan.isCurrentMonthPaid && (
            <span className="text-xs font-medium text-green-600">| Paid</span>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-base font-medium text-gray-950">
            {formattedInstallment}
          </span>
          <span className="text-xs font-normal text-gray-400">/mo</span>
        </div>
      </div>

      {/* بخش اطلاعات میانی (مبلغ کل و روز پرداخت) */}
      <div className="flex items-center gap-6 px-4 py-2 text-gray-500">
        <div className="flex items-center gap-1">
          <Landmark size={16} className=" text-gray-400" />
          <span className="text-sm font-light">{formattedTotal}</span>
        </div>
        <div className="flex items-center gap-1">
          <CalendarIcon size={16} className="text-gray-400" />
          <span className="text-sm font-light">
            Day {loan.monthlyPaymentDay}
          </span>
        </div>
      </div>

      {/* خط جداکننده نازک */}
      <div className="border-t border-gray-200" />

      {/* بخش اسلایدر اقساط */}
      <div className="flex items-center gap-2  px-4 py-2">
        {/* ایجاد بخش‌های اسلایدر به تعداد کل اقساط */}
        <div className="flex-1 flex gap-0.5">
          {[...Array(loan.totalInstallments)].map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full ${
                index < loan.paidInstallments ? "bg-green-600" : "bg-gray-100"
              }`}
              style={{
                // محاسبه عرض هر بخش بر اساس تعداد کل اقساط
                width: `calc(100% / ${loan.totalInstallments})`,
              }}
            />
          ))}
        </div>
        {/* نمایش تعداد اقساط پرداخت شده و کل اقساط */}
        <div className="text-xs font-medium">
          <span className="text-green-600">{loan.paidInstallments}</span>
          <span className="text-gray-400">/{loan.totalInstallments}</span>
        </div>
      </div>

      <DropdownMenu isOpen={isMenuOpen}>
        <button
          type="button"
          disabled={payDisabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!payDisabled) {
              onPayInstallment(loan);
              setIsMenuOpen(false);
            }
          }}
          className={`flex items-center w-full px-4 py-2 text-sm text-left ${
            payDisabled
              ? "text-gray-400 bg-gray-50 cursor-not-allowed"
              : "text-gray-700 hover:bg-indigo-50"
          }`}
        >
          <CreditCard size={14} className="mr-2" />
          {allPaid
            ? "All installments paid"
            : currentMonthPaid
              ? "This month already paid"
              : "Pay Installment"}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(loan);
            setIsMenuOpen(false);
          }}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
        >
          <Pencil size={14} className="mr-2" />
          Edit Loan
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(loan);
            setIsMenuOpen(false);
          }}
          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
        >
          <Trash2 size={14} className="mr-2" />
          Delete Loan
        </button>
      </DropdownMenu>
    </motion.div>
  );
}
