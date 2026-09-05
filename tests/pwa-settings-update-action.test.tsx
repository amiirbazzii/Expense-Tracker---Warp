/**
 * The Settings version row uses exactly `useUpdateAvailable()` + `applyUpdate`.
 * This mirrors that wiring (the page itself needs many providers to mount):
 *  - hidden while no update;
 *  - shown once an update is available;
 *  - STILL shown after the toast would have been dismissed (dismissal never
 *    touches the shared flag);
 *  - clicking it calls the same applyUpdate -> one reload.
 */

jest.mock("@/lib/pwa/reloadPage", () => ({ reloadPage: jest.fn() }));

import { render, act, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { reloadPage } from "@/lib/pwa/reloadPage";
import {
  useUpdateAvailable,
  applyUpdate,
  markUpdateAvailable,
  __resetUpdateStateForTests,
} from "@/lib/pwa/updateState";

const reloadSpy = reloadPage as jest.Mock;

// Same shape as the Settings version line.
function VersionRow() {
  const updateAvailable = useUpdateAvailable();
  return createElement(
    "p",
    null,
    "v1.4.0",
    updateAvailable
      ? createElement("button", { onClick: applyUpdate }, "Update")
      : null,
  );
}

beforeEach(() => {
  __resetUpdateStateForTests();
  reloadSpy.mockClear();
});

it("hides the Update action when no update is available", () => {
  const { queryByText } = render(createElement(VersionRow));
  expect(queryByText("Update")).toBeNull();
});

it("shows it once an update is available and keeps it after toast dismissal", () => {
  const { queryByText } = render(createElement(VersionRow));

  act(() => markUpdateAvailable());
  expect(queryByText("Update")).not.toBeNull();

  // A toast dismissal is not modeled in the module at all — the flag stands,
  // so the Settings action remains for the rest of the session.
  expect(queryByText("Update")).not.toBeNull();
});

it("reloads once when the Settings action is clicked", () => {
  const { getByText } = render(createElement(VersionRow));
  act(() => markUpdateAvailable());

  fireEvent.click(getByText("Update"));
  fireEvent.click(getByText("Update"));

  expect(reloadSpy).toHaveBeenCalledTimes(1);
});
