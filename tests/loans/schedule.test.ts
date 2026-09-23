import {
  deriveStart,
  installmentIndexForMonth,
  isInstallmentPaid,
  monthIndex,
} from "../../src/features/loans/schedule";

describe("loan schedule calendar arithmetic", () => {
  const shahrivar = new Date("2026-09-15");
  const mehr = new Date("2026-09-23");

  it("keeps Jalali and Gregorian month boundaries separate", () => {
    expect(monthIndex(mehr, "jalali") - monthIndex(shahrivar, "jalali")).toBe(1);
    expect(monthIndex(mehr, "gregorian")).toBe(monthIndex(shahrivar, "gregorian"));
  });

  it("maps a Jalali loan to the installment in the viewed month", () => {
    const loan = {
      calendar: "jalali" as const,
      startYear: 1405,
      startMonth: 6,
      totalInstallments: 3,
      paidInstallments: 1,
    };

    expect(isInstallmentPaid(loan, shahrivar)).toBe(true);
    expect(isInstallmentPaid(loan, mehr)).toBe(false);
    expect(installmentIndexForMonth(loan, mehr)).toBe(1);
    expect(installmentIndexForMonth(loan, new Date("2026-12-01"))).toBeNull();
  });

  it("treats a missing calendar as Gregorian", () => {
    const legacyLoan = {
      startYear: 2026,
      startMonth: 9,
      totalInstallments: 2,
      paidInstallments: 1,
    };

    expect(isInstallmentPaid(legacyLoan, shahrivar)).toBe(true);
    expect(installmentIndexForMonth(legacyLoan, mehr)).toBe(0);
  });

  it("derives a Jalali start from the current Jalali month", () => {
    expect(deriveStart(new Date("2026-09-23"), 2, "jalali")).toEqual({
      startYear: 1405,
      startMonth: 5,
    });
  });
});
