"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { DateObject } from "react-multi-date-picker";
import type { Calendar, Locale } from "react-date-object";
import gregorian from "react-date-object/calendars/gregorian";
import { usePopoverPosition } from "./usePopoverPosition";

export type ViewMode = "day" | "month" | "year";

interface MapDaysInput {
  date: DateObject;
  today: DateObject;
  isSameDate: (date1: DateObject, date2: DateObject) => boolean;
}

type MapDaysReturn = React.HTMLAttributes<HTMLSpanElement> & {
  disabled?: boolean;
  hidden?: boolean;
};

export interface DatePickerConfig {
  calendar: Calendar;
  locale?: Locale;
  fontClassName: string;
  tabLabels: [string, string, string];
  confirmLabel: string;
  displayFormat: string;
  monthFormat: string;
  isRtl: boolean;
  popoverClassName: string;
  calendarClassName: string;
}

const POPOVER_WIDTH = 300;

function cloneDateObject(date: DateObject, locale?: Locale): DateObject {
  const clone = new DateObject(date);
  if (locale) clone.setLocale(locale);
  return clone;
}

export function useDatePickerState(
  value: string,
  onChange: (date: string) => void,
  config: DatePickerConfig,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [tempDate, setTempDate] = useState<DateObject | null>(null);
  const [currentDate, setCurrentDate] = useState<DateObject>(() => {
    if (value) {
      const gregorianDate = new DateObject({ date: value, calendar: gregorian });
      const converted = new DateObject(gregorianDate).convert(config.calendar);
      return config.locale ? converted.setLocale(config.locale) : converted;
    }
    const date = new DateObject({ calendar: config.calendar });
    return config.locale ? date.setLocale(config.locale) : date;
  });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const viewModeRef = useRef(viewMode);
  const tempDateRef = useRef<DateObject | null>(null);
  const currentDateRef = useRef(currentDate);

  viewModeRef.current = viewMode;
  tempDateRef.current = tempDate;
  currentDateRef.current = currentDate;

  const { popoverStyle } = usePopoverPosition({
    isOpen,
    wrapperRef,
    popoverRef,
    popoverWidth: POPOVER_WIDTH,
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const open = useCallback(() => {
    if (value) {
      const gregorianDate = new DateObject({ date: value, calendar: gregorian });
      const converted = new DateObject(gregorianDate).convert(config.calendar);
      const targetDate = config.locale ? converted.setLocale(config.locale) : converted;
      setTempDate(targetDate);
      setCurrentDate(new DateObject(targetDate));
    } else {
      setTempDate(null);
    }
    setIsOpen(true);
  }, [value, config.calendar, config.locale]);

  const applyStep = useCallback(
    (date: DateObject, direction: "back" | "forward"): DateObject => {
      const next = cloneDateObject(date, config.locale);
      const isBackward = direction === "back";

      if (viewModeRef.current === "day") {
        isBackward ? next.subtract(1, "month") : next.add(1, "month");
      } else if (viewModeRef.current === "month") {
        isBackward ? next.subtract(1, "year") : next.add(1, "year");
      } else {
        isBackward ? next.subtract(12, "year") : next.add(12, "year");
      }
      return next;
    },
    [config.locale],
  );

  const goBack = useCallback(() => {
    setCurrentDate((prev) => applyStep(prev, "back"));
    setTempDate((prev) => (prev ? applyStep(prev, "back") : prev));
  }, [applyStep]);

  const goForward = useCallback(() => {
    setCurrentDate((prev) => applyStep(prev, "forward"));
    setTempDate((prev) => (prev ? applyStep(prev, "forward") : prev));
  }, [applyStep]);

  const handleCalendarChange = useCallback((dateObject: DateObject | null) => {
    if (!dateObject) return;
    setTempDate(dateObject);
  }, []);

  const handleConfirm = useCallback(() => {
    const temporaryDate = tempDateRef.current;
    if (temporaryDate) {
      const gregorianDate = new DateObject(temporaryDate).convert(gregorian);
      const javaScriptDate = gregorianDate.toDate();
      const year = javaScriptDate.getFullYear();
      const month = String(javaScriptDate.getMonth() + 1).padStart(2, "0");
      const day = String(javaScriptDate.getDate()).padStart(2, "0");
      onChange(`${year}-${month}-${day}`);
    }
    setIsOpen(false);
  }, [onChange]);

  const handleMonthYearChange = useCallback(
    (date: DateObject) => {
      setCurrentDate(cloneDateObject(date, config.locale));
      setTempDate((prev) => {
        if (!prev) return prev;
        const next = cloneDateObject(prev, config.locale);
        next.set("month", date.month.number);
        next.set("year", date.year);
        return next;
      });
    },
    [config.locale],
  );

  const handleMonthSelect = useCallback(
    (monthNumber: number) => {
      setCurrentDate((prev) => {
        const next = cloneDateObject(prev, config.locale);
        next.set("month", monthNumber);
        return next;
      });
      setTempDate((prev) => {
        if (!prev) return prev;
        const next = cloneDateObject(prev, config.locale);
        next.set("month", monthNumber);
        return next;
      });
      setViewMode("day");
    },
    [config.locale],
  );

  const handleYearSelect = useCallback(
    (year: number) => {
      setCurrentDate((prev) => {
        const next = cloneDateObject(prev, config.locale);
        next.set("year", year);
        return next;
      });
      setTempDate((prev) => {
        if (!prev) return prev;
        const next = cloneDateObject(prev, config.locale);
        next.set("year", year);
        return next;
      });
      setViewMode("month");
    },
    [config.locale],
  );

  const handleMapDays = useCallback(
    ({ date, today, isSameDate }: MapDaysInput): MapDaysReturn | void => {
      const temporaryDate = tempDateRef.current;
      const current = currentDateRef.current;
      if (!current) return;

      const isSelected = temporaryDate != null && isSameDate(date, temporaryDate);
      const isToday = isSameDate(date, today);
      const isInCurrentMonth = date.month?.number === current.month?.number;

      return {
        className: [
          `relative !h-9 !w-9 !flex !items-center !justify-center !rounded-xl ${config.fontClassName}`,
          isSelected ? "!bg-black !text-white !font-medium" : "",
          !isSelected && isToday ? "!bg-gray-100 !text-gray-800" : "",
          !isInCurrentMonth && viewModeRef.current === "day" ? "!opacity-30" : "",
        ]
          .filter(Boolean)
          .join(" "),
      };
    },
    [config.fontClassName],
  );

  const rangeText = useMemo(() => {
    if (viewMode === "day") {
      return `${currentDate.format("MMMM")} ${currentDate.year}`;
    }
    if (viewMode === "month") {
      return String(currentDate.year);
    }
    const decadeStart = Math.floor(currentDate.year / 12) * 12;
    return `${decadeStart}-${decadeStart + 11}`;
  }, [viewMode, currentDate]);

  const displayValue = useMemo(() => {
    if (!value) return "";
    if (!config.locale) return value;
    const gregorianDate = new DateObject({ date: value, calendar: gregorian });
    return new DateObject(gregorianDate).convert(config.calendar).format(config.displayFormat);
  }, [value, config.displayFormat, config.locale, config.calendar]);

  return {
    isOpen,
    viewMode,
    setViewMode,
    tempDate,
    currentDate,
    wrapperRef,
    popoverRef,
    popoverStyle,
    open,
    goBack,
    goForward,
    handleCalendarChange,
    handleConfirm,
    handleMonthYearChange,
    handleMonthSelect,
    handleYearSelect,
    handleMapDays,
    displayValue,
    rangeText,
    config,
  };
}
