"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { useAuth } from "./AuthContext"; // To know when user is available
import { format as formatDateFns } from 'date-fns';
import { faIR } from 'date-fns/locale'; // For Jalali month names etc.

export type UserSettings = Doc<"userSettings">;

interface UserSettingsContextType {
  settings: UserSettings | null;
  isLoadingSettings: boolean;
  updateSettings: (newSettings: Partial<Pick<UserSettings, "currency" | "calendar">>) => Promise<void>;
  formatCurrency: (amount: number) => string;
  formatDate: (timestamp: number) => string; // Assuming timestamp in milliseconds, formats as "MMM d, yyyy"
  formatMonthYear: (timestamp: number) => string; // Formats as "MMMM yyyy"
}

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(undefined);

// Default formatter functions (can be expanded)
const defaultFormatCurrency = (amount: number, currency?: UserSettings["currency"], locale: string = "en-US") => {
  const options: Intl.NumberFormatOptions = {
    style: "currency",
    currency: currency || "USD", // Default to USD if no currency is set
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };

  // IRR (Toman) specific formatting - symbol after number, no minor units typically
  if (currency === "IRR") {
    // Persian locale for IRR often uses a different symbol or formatting.
    // Using 'fa-IR' might place the symbol correctly for some systems, but 'T' is custom.
    // For 'T' (Toman), it's common to not show fractional parts and place symbol after.
    // Intl.NumberFormat doesn't directly support "Toman" or custom symbols in this way.
    // We will handle this manually.
    const numStr = new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    return `${numStr} T`;
  }

  return new Intl.NumberFormat(locale, options).format(amount);
};

const defaultFormatDate = (timestamp: number, calendar?: UserSettings["calendar"], baseLocale: string = "en-US") => {
  const date = new Date(timestamp);
  let localeToUse;

  // Determine the locale for date-fns
  const options: { locale?: typeof faIR } = {};
  if (calendar === "jalali") {
    options.locale = faIR;
  }
  // If calendar is 'gregorian' or undefined, options.locale will remain undefined,
  // and date-fns will use its default (en-US) locale.

  const formatString = "MMM d, yyyy"; // Consistent with previous usage, e.g., "Jan 1, 2024" or Persian equivalent

  try {
    return formatDateFns(date, formatString, options);
  } catch (e) {
    console.warn("Date formatting error with date-fns, falling back to basic Gregorian format:", e);
    // Fallback to date-fns default (en-US Gregorian) without specific locale object
    return formatDateFns(date, formatString);
  }
};

const defaultFormatMonthYear = (timestamp: number, calendar?: UserSettings["calendar"]) => {
  const date = new Date(timestamp);
  const options: { locale?: typeof faIR } = {};
  if (calendar === "jalali") {
    options.locale = faIR;
  }
  // If calendar is 'gregorian' or undefined, options.locale will remain undefined,
  // and date-fns will use its default (en-US) locale.

  const formatString = "MMMM yyyy"; // e.g., "January 2024" or Persian equivalent

  try {
    return formatDateFns(date, formatString, options);
  } catch (e) {
    console.warn("MonthYear formatting error with date-fns, falling back to basic Gregorian format:", e);
    return formatDateFns(date, formatString);
  }
};


export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { user, token, loading: authLoading } = useAuth();

  // Use useQuery with skip based on auth state
  const settingsData = useQuery(
    api.userSettings.getSettings,
    !authLoading && token ? {} : "skip"
  );
  const updateSettingsMutation = useMutation(api.userSettings.updateSettings);

  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    if (!authLoading) {
        // If auth is not loading, and we either have settingsData or it's explicitly null (meaning query ran and returned null)
        // or if there's no token (user not logged in, so no settings to load)
        setIsLoadingSettings(settingsData === undefined && !!token);
    }
  }, [authLoading, settingsData, token]);


  const settings: UserSettings | null = settingsData || null;

  const updateSettings = useCallback(
    async (newSettings: Partial<Pick<UserSettings, "currency" | "calendar">>) => {
      if (!user) {
        console.error("Cannot update settings: user not authenticated.");
        return;
      }
      try {
        await updateSettingsMutation(newSettings);
        // The useQuery for getSettings should automatically update settingsData
      } catch (error) {
        console.error("Failed to update settings:", error);
        // Potentially show a toast notification to the user
        throw error;
      }
    },
    [user, updateSettingsMutation]
  );

  const formatCurrency = useCallback(
    (amount: number): string => {
      return defaultFormatCurrency(amount, settings?.currency, settings?.calendar === "jalali" ? "fa-IR" : "en-US");
    },
    [settings]
  );

  const formatDate = useCallback(
    (timestamp: number): string => {
      return defaultFormatDate(timestamp, settings?.calendar, settings?.calendar === "jalali" ? "fa-IR" : "en-US");
    },
    [settings]
  );

  const formatMonthYear = useCallback(
    (timestamp: number): string => {
      return defaultFormatMonthYear(timestamp, settings?.calendar);
    },
    [settings]
  );

  return (
    <UserSettingsContext.Provider
      value={{
        settings,
        isLoadingSettings,
        updateSettings,
        formatCurrency,
        formatDate,
        formatMonthYear,
      }}
    >
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  const context = useContext(UserSettingsContext);
  if (context === undefined) {
    throw new Error("useUserSettings must be used within a UserSettingsProvider");
  }
  return context;
}
