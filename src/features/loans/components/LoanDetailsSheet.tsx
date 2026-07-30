"use client";

import { useMemo } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { useSettings } from "@/contexts/SettingsContext";
import { useLocalData } from "@/hooks/useLocalData";
import { formatCurrency } from "@/lib/formatters";
import {
  Landmark,
  Wallet,
  PiggyBank,
  ListOrdered,
  CheckCircle2,
  CreditCard,
  CalendarIcon,
  Pencil,
} from "lucide-react";
import { Loan } from "../types";

interface LoanDetailsSheetProps {
  open: boolean;
  onClose: () => void;
  loan: (Loan & { isCurrentMonthPaid?: boolean }) | null;
  /** Opens the edit form for this loan. */
  onEdit: (loan: Loan) => void;
}

function DetailRow({
  icon: Icon,
  label,
  value,
  valueClassName = "text-gray-900",
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2 text-gray-500">
        <Icon size={16} className="text-gray-400" />
        <span className="text-sm">{label}</span>
      </div>
      <span className={`text-sm font-medium ${valueClassName}`}>{value}</span>
    </div>
  );
}

/**
 * Read-only overview of a loan. Opened from the loan card's "View Details"
 * action; editing is an explicit step from here rather than the card's first
 * action, so a tap can no longer land the user in a form by accident.
 */
export function LoanDetailsSheet({
  open,
  onClose,
  loan,
  onEdit,
}: LoanDetailsSheetProps) {
  const { settings } = useSettings();
  const { expenses, cards } = useLocalData();

  // The card used for payments. Loans don't carry a card themselves — each
  // payment expense does — so show the card of the most recent installment
  // payment linked to this loan. Older payments (before linking existed)
  // can't be attributed, in which case this stays "—".
  const paymentCardName = useMemo(() => {
    if (!loan) return null;
    const lastPayment = expenses
      .filter((e) => e.loanId === loan._id && e.cardId)
      .sort((a, b) => b.date - a.date)[0];
    if (!lastPayment) return null;
    return (
      cards.find((c) => c.cardId === lastPayment.cardId)?.cardName ?? null
    );
  }, [loan, expenses, cards]);

  if (!loan) return null;

  const fmt = (value: number) =>
    settings
      ? formatCurrency(value, settings.currency)
      : `$${value.toLocaleString()}`;

  const paidAmount = loan.paidInstallments * loan.installmentAmount;
  const remainingBalance =
    (loan.totalInstallments - loan.paidInstallments) * loan.installmentAmount;

  return (
    <BottomSheet open={open} onClose={onClose} title={loan.name}>
      <div className="divide-y divide-gray-100">
        <DetailRow
          icon={Landmark}
          label="Total loan amount"
          value={fmt(loan.totalAmount)}
        />
        <DetailRow
          icon={Wallet}
          label="Paid so far"
          value={fmt(paidAmount)}
          valueClassName="text-green-600"
        />
        <DetailRow
          icon={PiggyBank}
          label="Remaining balance"
          value={fmt(remainingBalance)}
        />
        <DetailRow
          icon={ListOrdered}
          label="Total installments"
          value={String(loan.totalInstallments)}
        />
        <DetailRow
          icon={CheckCircle2}
          label="Paid installments"
          value={`${loan.paidInstallments} of ${loan.totalInstallments}`}
          valueClassName={
            loan.paidInstallments > 0 ? "text-green-600" : "text-gray-900"
          }
        />
        <DetailRow
          icon={CreditCard}
          label="Payment card"
          value={paymentCardName ?? "—"}
          valueClassName={paymentCardName ? "text-gray-900" : "text-gray-400"}
        />
        <DetailRow
          icon={CalendarIcon}
          label="Payment day"
          value={`Day ${loan.monthlyPaymentDay} of each month`}
        />
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full mt-4"
        onClick={() => onEdit(loan)}
      >
        <span className="flex items-center justify-center gap-2">
          <Pencil size={14} />
          Edit Loan
        </span>
      </Button>
    </BottomSheet>
  );
}
