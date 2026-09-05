/**
 * Full page reload, in its own module so the update-flow tests can mock it:
 * jsdom marks window.location and location.reload unforgeable, so the call
 * cannot be spied on where it happens.
 */
export function reloadPage(): void {
  window.location.reload();
}
