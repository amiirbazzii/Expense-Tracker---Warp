import moment from "jalali-moment";

export type LoanCalendar = "gregorian" | "jalali";

type LoanSchedule = {
  startMonth: number;
  startYear: number;
  totalInstallments: number;
  paidInstallments: number;
  calendar?: LoanCalendar;
};

/** Keep all month arithmetic in the calendar the loan was created with. */
export function monthIndex(date: Date, calendar: LoanCalendar): number {
  if (calendar === "jalali") {
    const jalaliDate = moment(date);
    return jalaliDate.jYear() * 12 + jalaliDate.jMonth() + 1;
  }

  return date.getFullYear() * 12 + date.getMonth() + 1;
}

export function loanStartIndex(loan: LoanSchedule): number {
  return loan.startYear * 12 + loan.startMonth;
}

export function installmentIndexForMonth(
  loan: LoanSchedule,
  date: Date,
): number | null {
  const index =
    monthIndex(date, loan.calendar ?? "gregorian") - loanStartIndex(loan);

  if (index < 0 || index >= loan.totalInstallments) return null;
  return index;
}

export function isInstallmentPaid(
  loan: LoanSchedule,
  date: Date,
): boolean {
  const index = installmentIndexForMonth(loan, date);
  return index !== null && index < loan.paidInstallments;
}

export function nextUnpaidIndex(loan: LoanSchedule): number | null {
  return loan.paidInstallments >= loan.totalInstallments
    ? null
    : loan.paidInstallments;
}

export function deriveStart(
  now: Date,
  paidInstallments: number,
  calendar: LoanCalendar,
): { startMonth: number; startYear: number } {
  const startIndex = monthIndex(now, calendar) - paidInstallments;
  return {
    startYear: Math.floor((startIndex - 1) / 12),
    startMonth: ((startIndex - 1) % 12) + 1,
  };
}
