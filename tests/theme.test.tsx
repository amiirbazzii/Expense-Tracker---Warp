import { renderHook, act } from "@testing-library/react";
import React from "react";
import {
  THEME_STORAGE_KEY,
  getStoredTheme,
  getSystemTheme,
  resolveTheme,
  applyTheme,
  ThemeProvider,
  useTheme,
  ThemeMode,
} from "@/contexts/ThemeContext";

describe("Theme Management and Persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.documentElement.removeAttribute("data-theme");
  });

  describe("Pure utility functions", () => {
    it("getStoredTheme returns 'system' when localStorage is empty", () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
      expect(getStoredTheme()).toBe("system");
    });

    it("getStoredTheme returns stored valid values", () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue("dark");
      expect(getStoredTheme()).toBe("dark");

      (window.localStorage.getItem as jest.Mock).mockReturnValue("light");
      expect(getStoredTheme()).toBe("light");

      (window.localStorage.getItem as jest.Mock).mockReturnValue("system");
      expect(getStoredTheme()).toBe("system");
    });

    it("getStoredTheme falls back to 'system' on invalid stored values", () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue("invalid-theme");
      expect(getStoredTheme()).toBe("system");
    });

    it("resolveTheme returns explicit theme when not system", () => {
      expect(resolveTheme("dark")).toBe("dark");
      expect(resolveTheme("light")).toBe("light");
    });

    it("resolveTheme queries matchMedia when system", () => {
      const matchMediaMock = jest.fn().mockImplementation((query) => ({
        matches: query.includes("dark"),
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));
      window.matchMedia = matchMediaMock;

      expect(resolveTheme("system")).toBe("dark");
    });

    it("applyTheme sets data-theme attribute on documentElement for light and dark", () => {
      applyTheme("dark");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

      applyTheme("light");
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });

    it("applyTheme removes data-theme attribute for system mode", () => {
      document.documentElement.setAttribute("data-theme", "dark");
      applyTheme("system");
      expect(document.documentElement.getAttribute("data-theme")).toBeNull();
    });
  });

  describe("ThemeProvider & useTheme hook", () => {
    let matchMediaListeners: Array<() => void> = [];
    let isDarkOS = false;

    beforeEach(() => {
      matchMediaListeners = [];
      isDarkOS = false;

      window.matchMedia = jest.fn().mockImplementation((query) => ({
        get matches() {
          return isDarkOS;
        },
        media: query,
        addEventListener: jest.fn((_event, cb) => matchMediaListeners.push(cb)),
        removeEventListener: jest.fn((_event, cb) => {
          matchMediaListeners = matchMediaListeners.filter((listener) => listener !== cb);
        }),
      }));
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    it("initializes with stored theme on mount", () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue("dark");

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe("dark");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    it("setTheme immediately applies theme, updates DOM, and writes to localStorage", () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue("system");

      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme("dark");
      });

      expect(result.current.theme).toBe("dark");
      expect(result.current.resolvedTheme).toBe("dark");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(window.localStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "dark");

      act(() => {
        result.current.setTheme("light");
      });

      expect(result.current.theme).toBe("light");
      expect(result.current.resolvedTheme).toBe("light");
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(window.localStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "light");

      act(() => {
        result.current.setTheme("system");
      });

      expect(result.current.theme).toBe("system");
      expect(document.documentElement.getAttribute("data-theme")).toBeNull();
      expect(window.localStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "system");
    });

    it("reacts to OS theme changes when theme is system", () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue("system");
      isDarkOS = false;

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.resolvedTheme).toBe("light");

      // Simulate OS switching to dark mode
      act(() => {
        isDarkOS = true;
        matchMediaListeners.forEach((cb) => cb());
      });

      expect(result.current.resolvedTheme).toBe("dark");
      expect(document.documentElement.getAttribute("data-theme")).toBeNull();
    });
  });
});
