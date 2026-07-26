/**
 * Key used to hand a verified recovery code from /forgot-password to
 * /reset-password.
 *
 * sessionStorage rather than a URL query parameter: a secret in the query
 * string ends up in browser history, in `Referer` headers sent to any
 * third-party resource, in server/CDN access logs, and in the service worker's
 * cached copy of the page. sessionStorage is scoped to the tab and cleared when
 * it closes.
 */
export const RECOVERY_CODE_KEY = "pending-recovery-code";
