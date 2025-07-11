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

export const formatDate = (date: number | Date, calendar: Calendar, formatString = 'yyyy/MM/dd') => {
  if (calendar === 'jalali') {
    return moment(date).locale('fa').format('YYYY/MM/DD');
  } 
  return format(date, formatString);
};
