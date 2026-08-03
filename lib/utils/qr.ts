/**
 * QR label content.
 *
 * Labels encode a **URL**, not the bare tracking code: a phone's built-in camera shows whatever
 * the QR contains, so a raw UUID gives the person holding the label nothing. Pointing at
 * `/scan/<code>` opens the record's info page instead.
 */

/** Path segment the scan landing page lives under. */
const SCAN_PATH = '/scan';

/**
 * Base URL printed onto labels. Configurable because a label printed today must keep working
 * after deployment — `NEXT_PUBLIC_APP_URL` pins the public domain, and the current origin is a
 * sane fallback for local use.
 */
export function appBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/+$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

/** The URL to encode into a QR label for a given tracking code. */
export function buildScanUrl(code: string): string {
  return `${appBaseUrl()}${SCAN_PATH}/${encodeURIComponent(code)}`;
}

/**
 * Pulls the tracking code out of a scanned value.
 *
 * Accepts both shapes on purpose: new labels carry a `/scan/<code>` URL, while labels printed
 * before this change carry the bare code — and those are already stuck on physical shelves.
 */
export function parseScannedCode(scanned: string): string {
  const trimmed = scanned.trim();
  if (!trimmed) return trimmed;

  try {
    const url = new URL(trimmed);
    const marker = `${SCAN_PATH}/`;
    const index = url.pathname.indexOf(marker);
    if (index !== -1) {
      return decodeURIComponent(url.pathname.slice(index + marker.length));
    }
    // A URL we don't recognise — fall back to its last path segment rather than the whole string.
    const segments = url.pathname.split('/').filter(Boolean);
    return segments.length > 0 ? decodeURIComponent(segments[segments.length - 1]) : trimmed;
  } catch {
    // Not a URL at all: an old bare-code label.
    return trimmed;
  }
}
