import { Id } from "../../../../convex/_generated/dataModel";
import {
  installmentIndexForMonth,
  isInstallmentPaid,
  type LoanCalendar,
} from "../schedule";

export type { LoanCalendar } from "../schedule";

export interface Loan {
  _id: Id<"loans">;
  _creationTime: number;
  name: string;
  totalAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  installmentAmount: number;
  monthlyPaymentDay: number;
  startMonth: number;
  startYear: number;
  calendar?: LoanCalendar;
  userId: Id<"users">;
  createdAt: number;
}

export interface LoanSummary {
  activeCount: number;
  totalAmount: number;
  remainingBalance: number;
}

/**
 * Compute total installment amount due in a given month across all loans.
 */
export function computeMonthlyDue(loans: Loan[], date: Date): {
  totalDue: number;
  loanCount: number;
} {
  let totalDue = 0;
  let loanCount = 0;

  for (const loan of loans) {
    if (
      installmentIndexForMonth(loan, date) !== null &&
      !isInstallmentPaid(loan, date)
    ) {
      totalDue += loan.installmentAmount;
      loanCount++;
    }
  }

  return { totalDue, loanCount };
}
