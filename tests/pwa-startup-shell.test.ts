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

jest.mock("@/lib/connectivity", () => ({
  connectivity: {
    isOnline: true,
    subscribe: () => () => {},
    verify: async () => true,
  },
}));

import Home from "@/app/page";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ensureAppShell } from "@/lib/pwa/warmAppShell";

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

  const SW_SOURCE =
    'precacheAndRoute([{url:"/_next/static/chunks/app.js",revision:null},{url:"/add",revision:"build1"},{url:"/login",revision:"build1"}])';

  const mockCaches = (matchResult: Response | undefined) => {
    const put = jest.fn().mockResolvedValue(undefined);
    const match = jest.fn().mockResolvedValue(matchResult);
    const open = jest.fn().mockResolvedValue({ put, match });
    const keys = jest.fn().mockResolvedValue(["workbox-precache-v2-x"]);
    Object.defineProperty(global, "caches", {
      configurable: true,
      value: { open, keys },
    });
    return { put, match };
  };

  const mockFetch = () =>
    (global.fetch = jest.fn().mockImplementation(async (url: string) =>
      url === "/sw.js"
        ? new Response(SW_SOURCE)
        : new Response("shell", {
            headers: { Vary: "rsc, next-router-state-tree" },
          }),
    ));

  it("restores missing precache entries under their exact revisioned keys", async () => {
    const { put } = mockCaches(undefined); // nothing cached
    mockFetch();

    await ensureAppShell();

    // Hashed assets are keyed by plain URL, revisioned documents by
    // ?__WB_REVISION__ — exactly the keys Workbox's install would have used.
    expect(put).toHaveBeenCalledWith(
      "/_next/static/chunks/app.js",
      expect.any(Response),
    );
    expect(put).toHaveBeenCalledWith(
      "/add?__WB_REVISION__=build1",
      expect.any(Response),
    );
    expect(put).toHaveBeenCalledWith(
      "/login?__WB_REVISION__=build1",
      expect.any(Response),
    );
  });

  it("re-fetches route documents that are missing from every cache", async () => {
    const { put } = mockCaches(undefined);
    mockFetch();

    await ensureAppShell();

    expect(global.fetch).toHaveBeenCalledWith("/add", { credentials: "same-origin" });
    expect(global.fetch).toHaveBeenCalledWith("/dashboard", { credentials: "same-origin" });
    expect(put).toHaveBeenCalledWith("/add", expect.any(Response));
    expect(put).toHaveBeenCalledWith("/login", expect.any(Response));

    const addResponse = put.mock.calls.find(([route]) => route === "/add")?.[1] as Response;
    expect(addResponse.headers.get("Vary")).toBeNull();
  });

  it("touches the network only for the manifest when everything is cached", async () => {
    // Every entry present (e.g. a healthy precache).
    const { put } = mockCaches(new Response("cached"));
    mockFetch();

    await ensureAppShell();

    // The only network traffic allowed is reading the manifest out of sw.js.
    const urls = (global.fetch as jest.Mock).mock.calls.map(([u]) => u);
    expect(urls).toEqual(["/sw.js"]);
    expect(put).not.toHaveBeenCalled();
  });
});
