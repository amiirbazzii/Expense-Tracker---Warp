/**
 * Single source of truth for connectivity.
 *
 * `navigator.onLine` only reports whether a network interface is up — it is
 * true on wifi with no internet (lie-fi, captive portals) and can be false on
 * some VPN configurations even though requests would succeed. This service
 * treats the browser events as *hints* and verifies them with a real request:
 *
 *  - The probe hits `/api/connectivity-probe`, a deliberately nonexistent
 *    path: any HTTP response (a 404 included) proves the origin is reachable,
 *    which is exactly what "online" means for this app. The `/api/` prefix
 *    matches the service worker's NetworkOnly route, so the request can never
 *    be answered by the SW cache, and `cache: "no-store"` bypasses the HTTP
 *    cache. On an HTTPS origin a captive portal fails TLS, so lie-fi rejects
 *    and correctly reads as offline.
 *  - A browser `offline` event flips the state immediately (pessimistic), but
 *    the retry loop keeps probing so a false negative self-corrects.
 *  - A browser `online` event only flips the state after a probe succeeds.
 *  - While offline, the probe retries with exponential backoff (2s → 30s).
 *
 * Kept dependency-free: the /offline fallback page imports it and must render
 * with nothing but its own chunk.
 */

const PROBE_URL = "/api/connectivity-probe";
const PROBE_TIMEOUT_MS = 5_000;
const INITIAL_RETRY_MS = 2_000;
const MAX_RETRY_MS = 30_000;

type Listener = (online: boolean) => void;

export class ConnectivityService {
  private online: boolean =
    typeof navigator !== "undefined" ? navigator.onLine : true;
  private listeners = new Set<Listener>();
  private probeInFlight: Promise<boolean> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryDelayMs = INITIAL_RETRY_MS;
  private started = false;

  /** Idempotent. Registers browser listeners and verifies the initial state. */
  start(): void {
    if (this.started || typeof window === "undefined") return;
    this.started = true;

    window.addEventListener("online", () => {
      // Interface came up — believe it only once a probe confirms it.
      void this.verify();
    });
    window.addEventListener("offline", () => {
      // Interface went down. Trust it immediately, but keep probing so a
      // false negative (e.g. some VPNs) recovers without a browser event.
      this.setOnline(false);
    });

    void this.verify();
  }

  get isOnline(): boolean {
    this.start();
    return this.online;
  }

  /**
   * Subscribe to verified connectivity changes. Fires only on transitions.
   * Returns an unsubscribe function.
   */
  subscribe(listener: Listener): () => void {
    this.start();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Resolves immediately if online, otherwise on the next verified online. */
  whenOnline(): Promise<void> {
    this.start();
    if (this.online) return Promise.resolve();
    return new Promise((resolve) => {
      const unsubscribe = this.subscribe((online) => {
        if (online) {
          unsubscribe();
          resolve();
        }
      });
    });
  }

  /**
   * Probe the network now and update the state. Concurrent calls share one
   * probe. Resolves with the verified state; never rejects.
   */
  verify(): Promise<boolean> {
    this.start();
    if (this.probeInFlight) return this.probeInFlight;

    this.probeInFlight = this.probe()
      .then((reachable) => {
        this.setOnline(reachable);
        return reachable;
      })
      .finally(() => {
        this.probeInFlight = null;
      });

    return this.probeInFlight;
  }

  private async probe(): Promise<boolean> {
    if (typeof fetch === "undefined") return this.online;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      // Any response — 404 included — means the origin answered.
      await fetch(`${PROBE_URL}?t=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private setOnline(online: boolean): void {
    if (online) {
      this.retryDelayMs = INITIAL_RETRY_MS;
      this.clearRetry();
    } else {
      this.scheduleRetry();
    }

    if (online === this.online) return;
    this.online = online;
    this.listeners.forEach((listener) => {
      try {
        listener(online);
      } catch (err) {
        console.error("[Connectivity] listener threw:", err);
      }
    });
  }

  private scheduleRetry(): void {
    if (this.retryTimer !== null) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.retryDelayMs = Math.min(this.retryDelayMs * 2, MAX_RETRY_MS);
      void this.verify();
    }, this.retryDelayMs);
  }

  private clearRetry(): void {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }
}

export const connectivity = new ConnectivityService();
