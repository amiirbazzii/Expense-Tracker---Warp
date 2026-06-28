import { Id } from "../../../../convex/_generated/dataModel";

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
  userId: Id<"users">;
  createdAt: number;
}

export interface LoanSummary {
  activeCount: number;
  totalAmount: number;
  remainingBalance: number;
}

/**
 * Given a loan's start month/year and the number of paid installments,
 * determine which months are still unpaid.
 *
 * Returns true if the loan has an unpaid installment in the given month/year.
 */
export function loanHasUnpaidInMonth(
  loan: Loan,
  month: number, // 1-12
  year: number
): boolean {
  // The remaining installments to pay
  const remaining = loan.totalInstallments - loan.paidInstallments;
  if (remaining <= 0) return false;

  // The first unpaid installment month offset
  // Start is at loan.startMonth / loan.startYear
  // paidInstallments have been paid starting from start month
  const startOffset =
    (loan.startYear * 12 + loan.startMonth) + loan.paidInstallments;
  const endOffset =
    (loan.startYear * 12 + loan.startMonth) + loan.totalInstallments - 1;
  const checkOffset = year * 12 + month;

  return checkOffset >= startOffset && checkOffset <= endOffset;
}

/**
 * Compute total installment amount due in a given month across all loans.
 */
export function computeMonthlyDue(
  loans: Loan[],
  month: number,
  year: number
): { totalDue: number; loanCount: number } {
  let totalDue = 0;
  let loanCount = 0;

  for (const loan of loans) {
    if (loanHasUnpaidInMonth(loan, month, year)) {
      totalDue += loan.installmentAmount;
      loanCount++;
    }
  }

  return { totalDue, loanCount };
}
