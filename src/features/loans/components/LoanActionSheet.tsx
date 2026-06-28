"use client";

import React from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { Loan } from "../types";
import { CreditCard, Pencil, Trash2 } from "lucide-react";

interface LoanActionSheetProps {
  open: boolean;
  onClose: () => void;
  loan: Loan | null;
  onPayInstallment: (loan: Loan) => void;
  onEdit: (loan: Loan) => void;
  onDelete: (loan: Loan) => void;
}

const actions = [
  {
    key: "pay",
    label: "Pay Installment",
    icon: CreditCard,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    handler: "onPayInstallment" as const,
  },
  {
    key: "edit",
    label: "Edit Loan",
    icon: Pencil,
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    handler: "onEdit" as const,
  },
  {
    key: "delete",
    label: "Delete Loan",
    icon: Trash2,
    color: "text-red-600",
    bgColor: "bg-red-50",
    handler: "onDelete" as const,
  },
];

export function LoanActionSheet({
  open,
  onClose,
  loan,
  onPayInstallment,
  onEdit,
  onDelete,
}: LoanActionSheetProps) {
  if (!loan) return null;

  const handlers = { onPayInstallment, onEdit, onDelete };
  const allPaid = loan.paidInstallments >= loan.totalInstallments;

  return (
    <BottomSheet open={open} onClose={onClose} title={loan.name}>
      <div className="space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          const disabled = action.key === "pay" && allPaid;

          return (
            <button
              key={action.key}
              type="button"
              disabled={disabled}
              onClick={() => {
                handlers[action.handler](loan);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors ${
                disabled
                  ? "opacity-40 cursor-not-allowed bg-gray-50"
                  : "hover:bg-gray-50 active:bg-gray-100"
              }`}
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-lg ${action.bgColor}`}
              >
                <Icon size={18} className={action.color} />
              </div>
              <span className={`text-sm font-medium ${action.color}`}>
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
