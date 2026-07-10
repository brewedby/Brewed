/**
 * Central feature-gating for the two-tier subscription.
 *
 * THIS IS THE ONLY PLACE feature access rules live. UI components must
 * never compare product IDs or subscription status directly — they call
 * useFeature('forecast') (from SubscriptionContext) or hasFeature(tier, key).
 *
 * Pure module: no React, no Supabase, no React Native imports — fully
 * testable with tsx.
 *
 * Tiers:
 *   'none'   — no active subscription (app access is blocked by the
 *              layout-level paywall; feature gates rarely see this)
 *   'trader' — Brewed Trader (basic plan)
 *   'pro'    — Brewed Pro (everything)
 *
 * Graceful degradation: when the subscription status can't be loaded
 * (offline, server error), callers pass `statusKnown: false` and every
 * gate ALLOWS. The layout paywall is the hard gate; feature gates must
 * never brick a paying user because a status fetch failed.
 */

import { PRODUCT_IDS } from './products';

export type SubscriptionTier = 'none' | 'trader' | 'pro';

export type FeatureKey =
  // ── Trader (basic) features ────────────────────────────────────────
  | 'financials'        // event P&L, VAT, commission, costs
  | 'cogs'              // product catalog + COGS reconciliation
  | 'csv_import'        // CSV/TSV sales report import
  | 'reports_core'      // annual P&L, monthly breakdown, CSV export
  | 'companies'         // company management
  | 'discover'          // events directory
  | 'planning_basic'    // event planning, calendar
  | 'fleet_overview'    // fleet list + unit detail (first unit)
  // ── Pro features ───────────────────────────────────────────────────
  | 'forecast'          // demand forecast (weather-aware, historical learning)
  | 'stock_prep'        // plan-stock guidance in forecast
  | 'pdf_import'        // PDF item-level sales import
  | 'fleet_reminders'   // MOT/tax/service notifications
  | 'fleet_multi_unit'  // more than one fleet unit
  | 'reports_advanced'  // performance trends
  | 'doc_scanner';      // financial document scanning + reconciliation

/** Minimum tier required for each feature. */
export const FEATURE_TIERS: Record<FeatureKey, SubscriptionTier> = {
  financials:       'trader',
  cogs:             'trader',
  csv_import:       'trader',
  reports_core:     'trader',
  companies:        'trader',
  discover:         'trader',
  planning_basic:   'trader',
  fleet_overview:   'trader',
  forecast:         'pro',
  stock_prep:       'pro',
  pdf_import:       'pro',
  fleet_reminders:  'pro',
  fleet_multi_unit: 'pro',
  reports_advanced: 'pro',
  doc_scanner:      'pro',
};

const TIER_RANK: Record<SubscriptionTier, number> = { none: 0, trader: 1, pro: 2 };

/**
 * Derive the tier from the server-validated subscription state.
 *
 * - reviewer_grandfathered → pro (dev/reviewer accounts see everything)
 * - active/grace + trader product → trader
 * - active/grace + pro product → pro
 * - active/grace + UNKNOWN product id → pro. Legacy subscribers purchased
 *   before the two-tier split must never be downgraded by a client update.
 * - anything else → none
 */
export function tierForSubscription(input: {
  status: string | null | undefined;
  productId: string | null | undefined;
  grandfathered: boolean | null | undefined;
}): SubscriptionTier {
  if (input.grandfathered) return 'pro';
  const active = input.status === 'active' || input.status === 'in_grace_period';
  if (!active) return 'none';
  if (input.productId === PRODUCT_IDS.traderMonthly) return 'trader';
  if (input.productId === PRODUCT_IDS.proMonthly) return 'pro';
  // Unknown/legacy product on an active subscription → full access.
  return 'pro';
}

/**
 * Is `feature` available at `tier`?
 *
 * When statusKnown is false (subscription state failed to load), always
 * allow — degrade open, never lock a paying user out on a fetch failure.
 */
export function hasFeature(
  tier: SubscriptionTier,
  feature: FeatureKey,
  statusKnown: boolean = true,
): boolean {
  if (!statusKnown) return true;
  return TIER_RANK[tier] >= TIER_RANK[FEATURE_TIERS[feature]];
}

/** Human label for upgrade prompts. */
export function requiredPlanName(feature: FeatureKey): string {
  return FEATURE_TIERS[feature] === 'pro' ? 'Brewed Pro' : 'Brewed Trader';
}
