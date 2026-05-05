// Stateless URL-based navigation breadcrumb trail.
//
// Cross-tab navigation in Expo Router (e.g. tapping an event from a Company
// detail page) switches into the destination tab's stack, so router.back()
// pops within that tab — not back to the screen the user actually came from.
//
// Rather than fight that or maintain a global Zustand store (which can get
// out of sync with route state on refresh / deep-link / hot-reload), we
// encode the breadcrumb chain into a `trail` URL query parameter that
// every "drill-in" navigation appends to.
//
// Each detail screen reads `trail` from its own params, renders the back
// button using the previous crumb, and when navigating forward appends its
// own crumb to the trail before pushing.

import type { Href } from 'expo-router';

export interface Crumb {
  /** What to render in the back button / breadcrumb strip. */
  label: string;
  /** Pathname only — params live separately so we can re-encode them. */
  pathname: string;
  /** Route params for the destination, excluding `trail`. */
  params?: Record<string, string | number | undefined>;
}

const SEP_CRUMB = '~';
const SEP_FIELD = '|';

function encodeCrumb(c: Crumb): string {
  const paramsJson = c.params ? JSON.stringify(c.params) : '';
  return [c.label, c.pathname, paramsJson]
    .map((s) => encodeURIComponent(s))
    .join(SEP_FIELD);
}

function decodeCrumb(s: string): Crumb | null {
  const parts = s.split(SEP_FIELD);
  if (parts.length < 2) return null;
  try {
    const label = decodeURIComponent(parts[0]);
    const pathname = decodeURIComponent(parts[1]);
    if (!label || !pathname) return null;
    let params: Crumb['params'];
    if (parts[2]) {
      const raw = decodeURIComponent(parts[2]);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          params = parsed as Crumb['params'];
        }
      }
    }
    return { label, pathname, params };
  } catch {
    return null;
  }
}

export function encodeTrail(trail: Crumb[]): string {
  if (trail.length === 0) return '';
  return trail.map(encodeCrumb).join(SEP_CRUMB);
}

export function decodeTrail(encoded: string | undefined | null): Crumb[] {
  if (!encoded) return [];
  return encoded
    .split(SEP_CRUMB)
    .map(decodeCrumb)
    .filter((c): c is Crumb => c !== null);
}

/** Append `crumb` to the existing trail, returning the encoded string ready
 *  to drop into a `trail` route param. */
export function pushTrail(currentEncoded: string | undefined, crumb: Crumb): string {
  const trail = decodeTrail(currentEncoded);
  trail.push(crumb);
  return encodeTrail(trail);
}

/** Build the Href the back button should navigate to: the previous crumb,
 *  with the *remaining* trail re-encoded onto its params so that screen's
 *  own back button still works. Returns null when the trail is empty —
 *  caller should fall back to router.back(). */
export function popTrailHref(encoded: string | undefined | null): {
  label: string;
  href: Href;
} | null {
  const trail = decodeTrail(encoded);
  if (trail.length === 0) return null;
  const previous = trail[trail.length - 1];
  const remaining = trail.slice(0, -1);
  const remainingEncoded = encodeTrail(remaining);

  const params: Record<string, string | number> = {};
  if (previous.params) {
    for (const [k, v] of Object.entries(previous.params)) {
      if (v !== undefined && v !== null && v !== '') params[k] = v;
    }
  }
  if (remainingEncoded) params.trail = remainingEncoded;

  return {
    label: previous.label,
    href: { pathname: previous.pathname, params } as Href,
  };
}
