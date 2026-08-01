/**
 * Routes that must be reachable on every post-install launch.
 *
 * These are deliberately loaded with a document navigation from the splash
 * screen. App Router's client transitions request an RSC payload, which is
 * not part of the durable app shell and can be absent while offline.
 */
export const STARTUP_SHELL_ROUTES = ["/add", "/login"] as const;

export type StartupShellRoute = (typeof STARTUP_SHELL_ROUTES)[number];

/**
 * Leave the splash through the service worker's document cache, never an RSC
 * navigation. `replace` also keeps the splash out of the back stack.
 */
export function navigateToStartupShell(route: StartupShellRoute): void {
  window.location.replace(route);
}
