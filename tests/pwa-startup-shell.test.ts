import { render, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { TextDecoder, TextEncoder } from "node:util";
import { ReadableStream } from "node:stream/web";

Object.assign(global, { ReadableStream, TextDecoder, TextEncoder });
// Jest's jsdom environment does not provide the Fetch response classes that
// the cache warm-up uses, while Node's implementation does.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Response: UndiciResponse } = require("undici");

const mockUseAuth = jest.fn();
const mockNavigate = jest.fn();
const mockReplace = jest.fn();

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/lib/pwa/coreRoutes", () => ({
  STARTUP_SHELL_ROUTES: ["/add", "/login"],
  navigateToStartupShell: (...args: unknown[]) => mockNavigate(...args),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

import Home from "@/app/page";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { warmAppShell } from "@/lib/pwa/warmAppShell";

describe("offline startup shell", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(global, "Response", {
      configurable: true,
      value: UndiciResponse,
    });
  });

  it("leaves the splash through a document navigation for a restored session", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "user-1" }, token: "token", loading: false });
    const { container } = render(createElement(Home));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/add"));
    expect(container.innerHTML).toBe("");
  });

  it("uses the same document-navigation path for an unauthenticated launch", async () => {
    mockUseAuth.mockReturnValue({ user: null, token: null, loading: false });
    render(createElement(Home));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/login"));
  });

  it("does not add a second loader while a saved session validates", () => {
    mockUseAuth.mockReturnValue({ user: null, token: "token", loading: true });
    const { getByText } = render(
      createElement(ProtectedRoute, null, createElement("p", null, "App shell")),
    );

    expect(getByText("App shell")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("warms /add and /login documents without visiting either route", async () => {
    const put = jest.fn().mockResolvedValue(undefined);
    const open = jest.fn().mockResolvedValue({ put });
    Object.defineProperty(global, "caches", { configurable: true, value: { open } });
    global.fetch = jest.fn().mockImplementation(async () =>
      new Response("shell", { headers: { Vary: "rsc, next-router-state-tree" } }),
    );

    await warmAppShell();

    expect(global.fetch).toHaveBeenCalledWith("/add", { credentials: "same-origin" });
    expect(global.fetch).toHaveBeenCalledWith("/login", { credentials: "same-origin" });
    expect(put).toHaveBeenCalledWith("/add", expect.any(Response));
    expect(put).toHaveBeenCalledWith("/login", expect.any(Response));

    const addResponse = put.mock.calls.find(([route]) => route === "/add")?.[1] as Response;
    expect(addResponse.headers.get("Vary")).toBeNull();
  });
});
