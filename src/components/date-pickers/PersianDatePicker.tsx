"use client";

import { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from "react";
import { Calendar as CalendarGrid, DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persian_fa from "react-date-object/locales/persian_fa";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import InputContainer from "../InputContainer";

interface PersianDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label: string;
}

type ViewMode = "day" | "month" | "year";

const TABS = ["\u0631\u0648\u0632", "\u0645\u0627\u0647", "\u0633\u0627\u0644"];

const POPOVER_W = 300;

const FONT = "font-sans force-persian";

const POPOVER_CLS = "bg-white rounded-2xl shadow-xl border border-gray-200/60 overflow-hidden persian-datepicker-popover";

const TAB_BASE = `flex-1 py-2.5 text-[13px] font-medium text-center transition-all duration-200 select-none ${FONT}`;
const TAB_ACTIVE = `${TAB_BASE} text-black border-b-2 border-black`;
const TAB_INACTIVE = `${TAB_BASE} text-gray-400 hover:text-gray-600 border-b-2 border-transparent`;

const NAV_BTN = "p-2 rounded-lg hover:bg-gray-100";
const NAV_ICON = "text-gray-600";

const GRID_CLS = "grid grid-cols-3 gap-3 p-4 text-center";
const CELL_BASE = `py-2.5 px-2 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${FONT}`;
const CELL_DEFAULT = `${CELL_BASE} text-gray-900 hover:bg-gray-100`;
const CELL_SELECTED = `${CELL_BASE} bg-black text-white shadow-sm`;
const CELL_TODAY = `${CELL_BASE} bg-gray-100 text-gray-800`;

const DAY_CELL = "!h-9 !w-9 !flex !items-center !justify-center !rounded-xl";

export function PersianDatePicker({ value, onChange, label }: PersianDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [tempDate, setTempDate] = useState<DateObject | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const viewModeRef = useRef(viewMode);
  const tempDateRef = useRef<DateObject | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  viewModeRef.current = viewMode;
  tempDateRef.current = tempDate;

  const [currentDate, setCurrentDate] = useState<DateObject>(() => {
    if (value) {
      const gregD = new DateObject({ date: value, calendar: gregorian });
      return new DateObject(gregD).convert(persian).setLocale(persian_fa);
    }
    return new DateObject({ calendar: persian }).setLocale(persian_fa);
  });

  const currentDateRef = useRef(currentDate);
  currentDateRef.current = currentDate;

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const popoverEl = popoverRef.current;
    const updatePosition = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const popoverHeight = popoverEl?.offsetHeight || 400;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const spaceBelow = viewportH - rect.bottom;
      const spaceAbove = rect.top;
      const showBelow = spaceBelow >= popoverHeight || spaceAbove < popoverHeight;
      let left = rect.left;
      if (left + POPOVER_W > viewportW - 8) {
        left = viewportW - POPOVER_W - 8;
      }
      if (left < 8) left = 8;
      setPopoverStyle({
        position: "fixed",
        zIndex: 50,
        width: POPOVER_W,
        left,
        direction: "rtl",
        ...(showBelow
          ? { top: rect.bottom + 4 }
          : { bottom: viewportH - rect.top + 4 }),
      });
    };

    updatePosition();

    // Double-RAF: waits for browser paint frame boundaries so Framer Motion spring updates are tracked
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(updatePosition);
    });

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  const open = useCallback(() => {
    if (value) {
      const gregD = new DateObject({ date: value, calendar: gregorian });
      const persD = new DateObject(gregD).convert(persian).setLocale(persian_fa);
      setTempDate(persD);
      setCurrentDate(new DateObject(persD).setLocale(persian_fa));
    } else {
      setTempDate(null);
    }
    setIsOpen(true);
  }, [value]);

  const goBack = useCallback(() => {
    setCurrentDate((prev) => {
      const next = new DateObject(prev).setLocale(persian_fa);
      if (viewModeRef.current === "day") next.subtract(1, "month");
      else if (viewModeRef.current === "month") next.subtract(1, "year");
      else next.subtract(12, "year");
      return next;
    });
    setTempDate((prev) => {
      if (!prev) return prev;
      const next = new DateObject(prev).setLocale(persian_fa);
      if (viewModeRef.current === "day") next.subtract(1, "month");
      else if (viewModeRef.current === "month") next.subtract(1, "year");
      else next.subtract(12, "year");
      return next;
    });
  }, []);

  const goForward = useCallback(() => {
    setCurrentDate((prev) => {
      const next = new DateObject(prev).setLocale(persian_fa);
      if (viewModeRef.current === "day") next.add(1, "month");
      else if (viewModeRef.current === "month") next.add(1, "year");
      else next.add(12, "year");
      return next;
    });
    setTempDate((prev) => {
      if (!prev) return prev;
      const next = new DateObject(prev).setLocale(persian_fa);
      if (viewModeRef.current === "day") next.add(1, "month");
      else if (viewModeRef.current === "month") next.add(1, "year");
      else next.add(12, "year");
      return next;
    });
  }, []);

  const handleCalendarChange = useCallback((dateObj: DateObject | null) => {
    if (!dateObj) return;
    setTempDate(dateObj);
  }, []);

  const handleConfirm = useCallback(() => {
    const td = tempDateRef.current;
    if (td) {
      const gregD = new DateObject(td).convert(gregorian);
      const jsDate = gregD.toDate();
      const y = jsDate.getFullYear();
      const m = String(jsDate.getMonth() + 1).padStart(2, "0");
      const d = String(jsDate.getDate()).padStart(2, "0");
      onChange(`${y}-${m}-${d}`);
    }
    setIsOpen(false);
  }, [onChange]);

  const handleMapDays = useCallback(({ date, today, isSameDate }: any) => {
    const td = tempDateRef.current;
    const cd = currentDateRef.current;
    if (!cd) return;
    const isTemp = td && isSameDate(date, td);
    const isToday = isSameDate(date, today);
    const isCurrentMonth = date.month?.number === cd.month?.number;
    return {
      className: [
        `relative ${DAY_CELL} ${FONT}`,
        isTemp ? "!bg-black !text-white !font-medium" : "",
        !isTemp && isToday ? "!bg-gray-100 !text-gray-800" : "",
        !isCurrentMonth && viewModeRef.current === "day" ? "!opacity-30" : "",
      ]
        .filter(Boolean)
        .join(" "),
    };
  }, []);

  const handleMonthYearChange = useCallback((d: DateObject) => {
    setCurrentDate(new DateObject(d).setLocale(persian_fa));
    setTempDate((prev) => {
      if (!prev) return prev;
      const next = new DateObject(prev).setLocale(persian_fa);
      next.set("month", d.month.number);
      next.set("year", d.year);
      return next;
    });
  }, []);

  const rangeText = useMemo(() => {
    if (viewMode === "day") {
      return `${currentDate.format("MMMM")} ${currentDate.year}`;
    }
    if (viewMode === "month") {
      return String(currentDate.year);
    }
    const start = Math.floor(currentDate.year / 12) * 12;
    return `${start}-${start + 11}`;
  }, [viewMode, currentDate]);

  const displayValue = useMemo(() => {
    if (!value) return "";
    const gregD = new DateObject({ date: value, calendar: gregorian });
    return new DateObject(gregD).convert(persian).format("YYYY/MM/DD");
  }, [value]);

  const isTabActive = (tab: string) =>
    (tab === TABS[0] && viewMode === "day") ||
    (tab === TABS[1] && viewMode === "month") ||
    (tab === TABS[2] && viewMode === "year");

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div onClick={open}>
        <InputContainer
          leftIcon={CalendarIcon}
          rightAdornment={
            <svg className="size-5 text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        >
          <input
            value={displayValue}
            readOnly
            placeholder={label}
            className={`w-full bg-transparent outline-none text-black placeholder:text-gray-500 border-0 focus:ring-0 min-h-[24px] p-0 cursor-pointer ${FONT}`}
          />
        </InputContainer>
      </div>

      {isOpen && (
        <div ref={popoverRef} style={popoverStyle} className={POPOVER_CLS}>
          <div className="flex">
            {TABS.map((tab, i) => (
              <button
                type="button"
                key={tab}
                onClick={() =>
                  setViewMode(
                    tab === TABS[0] ? "day" : tab === TABS[1] ? "month" : "year"
                  )
                }
                className={`${isTabActive(tab) ? TAB_ACTIVE : TAB_INACTIVE}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between px-4 py-2 select-none">
            <button type="button" onClick={goBack} className={NAV_BTN} aria-label="Previous">
              <ChevronRight size={18} className={NAV_ICON} />
            </button>
            <span className={`text-sm font-semibold text-gray-900 ${FONT}`}>{rangeText}</span>
            <button type="button" onClick={goForward} className={NAV_BTN} aria-label="Next">
              <ChevronLeft size={18} className={NAV_ICON} />
            </button>
          </div>

          <div className="h-[256px] grid">
            {viewMode === "day" && (
              <div className="w-full px-3">
                <CalendarGrid
                  value={tempDate}
                  onChange={handleCalendarChange}
                  currentDate={currentDate}
                  onMonthChange={handleMonthYearChange}
                  onYearChange={handleMonthYearChange}
                  calendar={persian}
                  locale={persian_fa}
                  mapDays={handleMapDays}
                  buttons={false}
                  showOtherDays
                  className="rmdp-custom rmdp-rtl"
                />
              </div>
            )}
            {viewMode === "month" && (
              <div key={"month-" + currentDate.year} className={GRID_CLS + " animate-fade-in"}>
                {Array.from({ length: 12 }, (_, i) => {
                  const monthNum = i + 1;
                  const monthDate = new DateObject({
                    calendar: persian,
                    locale: persian_fa,
                    year: currentDate.year,
                    month: monthNum,
                    day: 1,
                  });
                  const monthName = monthDate.format("MMMM");
                  const isSelected =
                    tempDate != null &&
                    tempDate.month?.number === monthNum &&
                    tempDate.year === currentDate.year;
                  return (
                    <button
                      type="button"
                      key={monthNum}
                      onClick={() => {
                        setCurrentDate((prev) => {
                          const next = new DateObject(prev).setLocale(persian_fa);
                          next.set("month", monthNum);
                          return next;
                        });
                        setTempDate((prev) => {
                          if (!prev) return prev;
                          const next = new DateObject(prev).setLocale(persian_fa);
                          next.set("month", monthNum);
                          return next;
                        });
                        setViewMode("day");
                      }}
                      className={isSelected ? CELL_SELECTED : CELL_DEFAULT}
                    >
                      {monthName}
                    </button>
                  );
                })}
              </div>
            )}
            {viewMode === "year" && (
              <div key={"year-" + Math.floor(currentDate.year / 12)} className={GRID_CLS + " animate-fade-in"}>
                {(() => {
                  const start = Math.floor(currentDate.year / 12) * 12;
                  return Array.from({ length: 12 }, (_, i) => {
                    const y = start + i;
                    const isSelected = tempDate?.year === y;
                    return (
                      <button
                        type="button"
                        key={y}
                        onClick={() => {
                          setCurrentDate((prev) => {
                            const next = new DateObject(prev).setLocale(persian_fa);
                            next.set("year", y);
                            return next;
                          });
                          setTempDate((prev) => {
                            if (!prev) return prev;
                            const next = new DateObject(prev).setLocale(persian_fa);
                            next.set("year", y);
                            return next;
                          });
                          setViewMode("month");
                        }}
                        className={isSelected ? CELL_SELECTED : CELL_DEFAULT}
                      >
                        {y}
                      </button>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          <div className={`p-3 border-t border-gray-100 ${FONT}`}>
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full py-2.5 bg-black text-white text-sm force-persian font-medium rounded-xl hover:bg-gray-800 active:scale-[0.98] transition-all duration-150"
            >
              {"\u062A\u0627\u06CC\u06CC\u062F"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
