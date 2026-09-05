/**
 * Shared update-state module: the single source of truth both the toast and
 * the Settings action read from.
 *  - first install / no update -> updateAvailable false;
 *  - a real replacement worker -> updateAvailable true;
 *  - dismissing the toast must NOT clear it (that is the hook's concern, but
 *    the module simply never exposes a "clear" — proven here);
 *  - applyUpdate reloads exactly once, and never touches any data store.
 */

jest.mock("@/lib/pwa/reloadPage", () => ({ reloadPage: jest.fn() }));

import { reloadPage } from "@/lib/pwa/reloadPage";
import * as updateStateApi from "@/lib/pwa/updateState";
import {
  isUpdateAvailable,
  markUpdateAvailable,
  subscribeUpdateAvailable,
  applyUpdate,
  __resetUpdateStateForTests,
} from "@/lib/pwa/updateState";

const reloadSpy = reloadPage as jest.Mock;

beforeEach(() => {
  __resetUpdateStateForTests();
  reloadSpy.mockClear();
});

it("starts false before any update is discovered", () => {
  expect(isUpdateAvailable()).toBe(false);
});

it("becomes true once a replacement worker is marked, and notifies subscribers", () => {
  const seen: boolean[] = [];
  subscribeUpdateAvailable((v) => seen.push(v));

  markUpdateAvailable();

  expect(isUpdateAvailable()).toBe(true);
  expect(seen).toEqual([true]);
});

it("only fires subscribers on the first mark (idempotent)", () => {
  const seen: boolean[] = [];
  subscribeUpdateAvailable((v) => seen.push(v));

  markUpdateAvailable();
  markUpdateAvailable();

  expect(seen).toEqual([true]);
});

it("exposes no way to clear availability — dismissing a toast cannot reset it", () => {
  markUpdateAvailable();
  // The module surface is set-only + read + apply; there is no clear/unset.
  const setters = Object.keys(updateStateApi).filter(
    (k) => /clear|reset|unset|dismiss/i.test(k) && !k.includes("ForTests"),
  );
  expect(setters).toEqual([]);
  expect(isUpdateAvailable()).toBe(true);
});

it("applyUpdate reloads exactly once no matter how many surfaces call it", () => {
  markUpdateAvailable();

  applyUpdate(); // e.g. toast
  applyUpdate(); // e.g. Settings button, same session

  expect(reloadSpy).toHaveBeenCalledTimes(1);
});
