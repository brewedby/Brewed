// Pure helpers extracted from lib/queries/profile.ts so the test
// suite can assert them without dragging in the Supabase client (which
// requires env vars at import time and would fail under tsx). The
// React-Query hooks live in lib/queries/profile.ts and re-export
// these helpers so application code has one import surface.

import type { Metric, SubscriptionStatus, UserProfile } from './queries/profile.types';

export type ProfileRow = {
  id: string;
  business_name: string | null;
  business_type: string | null;
  currency: string | null;
  custom_metrics: Metric[] | null;
  subscription_status: string | null;
  subscription_product_id: string | null;
  subscription_expires_at: string | null;
  subscription_will_renew: boolean | null;
  reviewer_grandfathered: boolean | null;
};

/**
 * Surface business_type as stored. The central resolver
 * (normalizeTradeType / getActiveTradeType) is the only place that
 * applies fallbacks — the loader just surfaces what the DB actually
 * has so silent miswrites are visible in the dev strip and tests.
 *
 * Non-string DB values (null / undefined / numeric) collapse to '' so
 * downstream code can rely on the type. No 'Coffee' coercion here.
 */
export function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    business_name: row.business_name,
    business_type: typeof row.business_type === 'string' ? row.business_type : '',
    currency: row.currency ?? 'GBP',
    custom_metrics: (row.custom_metrics ?? []) as Metric[],
    subscription_status: (row.subscription_status ?? 'none') as SubscriptionStatus,
    subscription_product_id: row.subscription_product_id ?? null,
    subscription_expires_at: row.subscription_expires_at ?? null,
    subscription_will_renew: row.subscription_will_renew ?? false,
    reviewer_grandfathered: row.reviewer_grandfathered ?? false,
  };
}

/**
 * Predicate used by the prediction snapshot guard. True only when the
 * profile has resolved with a real, explicit business_type set by the
 * user. Returning false suppresses persistence of a fallback-'Other'
 * snapshot to `event_predictions` while profile is still loading or
 * when the DB has no usable value.
 */
export function isExplicitTradeTypeFor(
  isProfileLoaded: boolean,
  rawBusinessType: string | null | undefined,
): boolean {
  if (!isProfileLoaded) return false;
  if (typeof rawBusinessType !== 'string') return false;
  return rawBusinessType.trim().length > 0;
}

// PostgREST "0 rows" code from .single() / .maybeSingle(). The loader
// treats this as a recoverable signal (the row needs to be created),
// not an error that should bubble to the UI. Exported so a future
// Supabase client upgrade that changes the code can be caught in
// tests rather than silently regressing the self-heal path.
export const POSTGREST_NO_ROWS = 'PGRST116';
