import { Currency, Calendar } from "@/contexts/SettingsContext";
import { format } from 'date-fns';
import moment from 'jalali-moment';

const currencySymbols: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  IRR: "T",
};

export const formatCurrency = (amount: number, currency: Currency) => {
  const symbol = currencySymbols[currency];
  const formattedAmount = new Intl.NumberFormat('en-US').format(amount);

  if (currency === "IRR") {
    return `${formattedAmount} ${symbol}`;
  }
  return `${symbol}${formattedAmount}`;
};

// Simple token conversion from date-fns -> jalali-moment tokens
const replaceToken = (str: string, token: string, jalali: string) =>
  str.replace(new RegExp(`(^|[^A-Za-z])${token}`, "g"), (_, p1) => `${p1}${jalali}`);

const convertToJalaliTokens = (fmt: string) => {
  let out = fmt;
  // Order matters: replace longer tokens first
  out = replaceToken(out, "yyyy", "jYYYY");
  out = replaceToken(out, "MMMM", "jMMMM");
  out = replaceToken(out, "MMM", "jMMM");
  out = replaceToken(out, "MM", "jMM");
  out = replaceToken(out, "dd", "jDD");
  out = replaceToken(out, "d", "jD");
  return out;
};

export const formatDate = (
  date: number | Date,
  calendar: Calendar,
  formatString = "yyyy/MM/dd",
) => {
  if (calendar === "jalali") {
    const jalaliFormat = convertToJalaliTokens(formatString);
    return moment(date).locale("fa").format(jalaliFormat);
  }
  return format(date, formatString);
};
