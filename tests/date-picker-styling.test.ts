import fs from 'fs';
import path from 'path';
import { renderHook, act } from '@testing-library/react';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_en from 'react-date-object/locales/gregorian_en';
import { DateObject } from 'react-multi-date-picker';
import { useDatePickerState } from '../src/components/date-pickers/useDatePickerState';
import {
  CELL_BASE,
  CELL_DEFAULT,
  CELL_TODAY,
  CELL_SELECTED,
} from '../src/components/date-pickers/datePickerComponents';

describe('Date Picker Styling & Overlap Prevention', () => {
  describe('globals.css rules for date picker', () => {
    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    it('ensures the parent .rmdp-day cell is always transparent and never paints a background', () => {
      // .rmdp-custom .rmdp-day and its state variations must set background transparent
      expect(cssContent).toMatch(
        /\.rmdp-custom \.rmdp-day[\s\S]*?background:\s*transparent !important/
      );
      expect(cssContent).toMatch(
        /\.rmdp-custom \.rmdp-day[\s\S]*?background-color:\s*transparent !important/
      );
    });

    it('ensures today state does NOT paint a background on the parent cell', () => {
      // The parent .rmdp-day.rmdp-today must be transparent
      expect(cssContent).toMatch(
        /\.rmdp-custom \.rmdp-day\.rmdp-today[\s\S]*?background:\s*transparent !important/
      );
      // And today outline belongs on the child span
      expect(cssContent).toMatch(
        /\.rmdp-custom \.rmdp-day\.rmdp-today:not\(\.rmdp-selected\)\s+span[\s\S]*?border:\s*1px solid var\(--accent\) !important/
      );
      expect(cssContent).toMatch(
        /\.rmdp-custom \.rmdp-day\.rmdp-today:not\(\.rmdp-selected\)\s+span[\s\S]*?background-color:\s*transparent !important/
      );
    });

    it('ensures hover and focus use surface-hover only when the date is not selected', () => {
      expect(cssContent).toMatch(
        /\.rmdp-custom \.rmdp-day:not\(\.rmdp-selected\):not\(\.rmdp-disabled\):not\(\.rmdp-day-hidden\)\s+span:hover/
      );
      expect(cssContent).toMatch(
        /\.rmdp-custom \.rmdp-day:not\(\.rmdp-selected\):not\(\.rmdp-disabled\):not\(\.rmdp-day-hidden\):focus\s+span/
      );
    });

    it('ensures selected date remains solid bg-accent and hover/today cannot override it', () => {
      expect(cssContent).toMatch(
        /\.rmdp-custom \.rmdp-day\.rmdp-selected\s+span[\s\S]*?background-color:\s*var\(--accent\) !important/
      );
      expect(cssContent).toMatch(
        /\.rmdp-custom \.rmdp-day\.rmdp-selected\s+span[\s\S]*?color:\s*var\(--accent-foreground\) !important/
      );
      expect(cssContent).toMatch(
        /\.rmdp-custom \.rmdp-day\.rmdp-today\.rmdp-selected\s+span[\s\S]*?background-color:\s*var\(--accent\) !important/
      );
    });

    it('ensures month and year pickers also enforce transparent parent cell and single-element background', () => {
      expect(cssContent).toMatch(
        /\.rmdp-custom \.rmdp-month-picker \.rmdp-day[\s\S]*?background:\s*transparent !important/
      );
      expect(cssContent).toMatch(
        /\.rmdp-custom \.rmdp-year-picker \.rmdp-day[\s\S]*?background:\s*transparent !important/
      );
      expect(cssContent).toMatch(
        /\.rmdp-custom \.rmdp-month-picker \.rmdp-day\.rmdp-today:not\(\.rmdp-selected\)\s+span[\s\S]*?border:\s*1px solid var\(--accent\) !important/
      );
    });
  });

  describe('useDatePickerState handleMapDays', () => {
    const config = {
      calendar: gregorian,
      locale: gregorian_en,
      fontClassName: 'font-sans',
      tabLabels: ['Day', 'Month', 'Year'] as [string, string, string],
      confirmLabel: 'Confirm',
      displayFormat: 'YYYY-MM-DD',
      monthFormat: 'MMM',
      isRtl: false,
      popoverClassName: '',
      calendarClassName: 'rmdp-custom',
    };

    it('does not apply !bg-surface-hover to today date span in handleMapDays', () => {
      const { result } = renderHook(() =>
        useDatePickerState('2026-10-15', () => {}, config)
      );

      const today = new DateObject({ date: '2026-10-13', calendar: gregorian });
      const current = new DateObject({ date: '2026-10-13', calendar: gregorian });

      const dayProps = result.current.handleMapDays({
        date: current,
        today,
        isSameDate: (d1, d2) => d1.format('YYYY-MM-DD') === d2.format('YYYY-MM-DD'),
      });

      expect(dayProps).toBeDefined();
      // Should NOT have !bg-surface-hover (which would paint a duplicate background layer)
      expect(dayProps?.className).not.toContain('!bg-surface-hover');
      // Should NOT have !bg-accent since 2026-10-13 is not the selected 2026-10-15
      expect(dayProps?.className).not.toContain('!bg-accent');
    });

    it('applies !bg-accent and !text-accent-foreground when date is selected', () => {
      const { result } = renderHook(() =>
        useDatePickerState('2026-10-15', () => {}, config)
      );

      act(() => {
        result.current.open();
      });

      const selectedDate = new DateObject({ date: '2026-10-15', calendar: gregorian });
      const today = new DateObject({ date: '2026-10-13', calendar: gregorian });

      const dayProps = result.current.handleMapDays({
        date: selectedDate,
        today,
        isSameDate: (d1, d2) => d1.format('YYYY-MM-DD') === d2.format('YYYY-MM-DD'),
      });

      expect(dayProps).toBeDefined();
      expect(dayProps?.className).toContain('!bg-accent');
      expect(dayProps?.className).toContain('!text-accent-foreground');
    });
  });

  describe('Month and Year Grid cell classes', () => {
    it('defines CELL_TODAY with border-accent and no background fill', () => {
      expect(CELL_BASE).toContain('border border-transparent');
      expect(CELL_TODAY).toContain('border-accent');
      expect(CELL_TODAY).toContain('hover:bg-surface-hover');
      expect(CELL_TODAY).not.toContain('bg-accent');
    });

    it('defines CELL_SELECTED with solid bg-accent and text-accent-foreground', () => {
      expect(CELL_SELECTED).toContain('bg-accent');
      expect(CELL_SELECTED).toContain('text-accent-foreground');
    });
  });
});
