/**
 * ConnectivityService — probe-verified online state.
 *
 * The service must: trust `offline` events immediately, trust `online` events
 * only after a successful probe, share concurrent probes, retry with backoff
 * while offline, and notify subscribers only on transitions.
 */
import { ConnectivityService } from "@/lib/connectivity";

describe("ConnectivityService", () => {
  let service: ConnectivityService;
  let fetchMock: jest.Mock;

  // The service treats any resolution as reachability; jsdom has no Response,
  // and the service never inspects the body, so a bare status object suffices.
  const probeSucceeds = () => fetchMock.mockResolvedValue({ status: 404 });
  const probeFails = () =>
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

  beforeEach(() => {
    // tests/setup.ts stubs window.addEventListener to swallow online/offline
    // registrations; this suite exists to test exactly those, so restore the
    // native implementation (each test file gets its own jsdom window).
    window.addEventListener =
      EventTarget.prototype.addEventListener as typeof window.addEventListener;
    jest.useFakeTimers();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    service = new ConnectivityService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("reports online when the probe gets any HTTP response (404 included)", async () => {
    probeSucceeds();
    await expect(service.verify()).resolves.toBe(true);
    expect(service.isOnline).toBe(true);
  });

  it("reports offline when the probe rejects, and notifies subscribers once", async () => {
    probeSucceeds();
    await service.verify();

    const seen: boolean[] = [];
    service.subscribe((online) => seen.push(online));

    probeFails();
    await expect(service.verify()).resolves.toBe(false);
    await expect(service.verify()).resolves.toBe(false);

    expect(service.isOnline).toBe(false);
    // Only the transition notifies — the second failed probe is not a change.
    expect(seen).toEqual([false]);
  });

  it("shares one probe between concurrent verify() calls", async () => {
    probeSucceeds();
    const [a, b] = await Promise.all([service.verify(), service.verify()]);
    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("flips offline immediately on the browser offline event", async () => {
    probeSucceeds();
    await service.verify();

    window.dispatchEvent(new window.Event("offline"));
    expect(service.isOnline).toBe(false);
  });

  it("does not flip online on the browser online event until a probe succeeds", async () => {
    probeFails();
    await service.verify();
    expect(service.isOnline).toBe(false);

    // Still no real connectivity: the online event alone must not flip state.
    window.dispatchEvent(new window.Event("online"));
    await jest.advanceTimersByTimeAsync(0); // let the failing probe settle
    expect(service.isOnline).toBe(false);

    // Real connectivity returns: the next online event verifies and flips.
    probeSucceeds();
    window.dispatchEvent(new window.Event("online"));
    await jest.advanceTimersByTimeAsync(0);
    expect(service.isOnline).toBe(true);
  });

  it("retries with backoff while offline and recovers without a browser event", async () => {
    probeFails();
    await service.verify();
    expect(service.isOnline).toBe(false);
    const callsAfterFirstProbe = fetchMock.mock.calls.length;

    // First retry after the initial delay.
    await jest.advanceTimersByTimeAsync(2_000);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFirstProbe);
    expect(service.isOnline).toBe(false);

    // The network comes back with no online event (e.g. VPN false negative):
    // a later retry must discover it.
    probeSucceeds();
    await jest.advanceTimersByTimeAsync(60_000);
    expect(service.isOnline).toBe(true);
  });

  it("whenOnline resolves immediately when online", async () => {
    probeSucceeds();
    await service.verify();
    await expect(service.whenOnline()).resolves.toBeUndefined();
  });

  it("whenOnline waits for a verified online transition", async () => {
    probeFails();
    await service.verify();

    let resolved = false;
    const wait = service.whenOnline().then(() => {
      resolved = true;
    });
    expect(resolved).toBe(false);

    probeSucceeds();
    await service.verify();
    await wait;
    expect(resolved).toBe(true);
  });

  it("sends a network-only probe (no-store, HEAD)", async () => {
    probeSucceeds();
    await service.verify();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/connectivity-probe");
    expect(init).toMatchObject({ method: "HEAD", cache: "no-store" });
  });
});
