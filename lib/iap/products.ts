/**
 * Apple App Store in-app purchase product identifiers.
 *
 * IMPORTANT: These IDs must match exactly what you create in
 * App Store Connect → My Apps → Brewed → In-App Purchases.
 *
 * Apple convention is to use reverse-DNS prefixed by your bundle ID:
 *   com.brewedbyboon.app.pro.monthly
 *
 * TWO-TIER STRUCTURE:
 *   Brewed Trader (basic)  — com.brewedbyboon.app.trader.monthly  ← create in ASC
 *   Brewed Pro             — com.brewedbyboon.app.pro.monthly     ← already exists
 *
 * Both belong to the same subscription group so Apple handles
 * upgrade/downgrade/crossgrade between them automatically.
 *
 * If you change an ID here, you must:
 *   1. Update the App Store Connect product
 *   2. Re-run a sandbox purchase to re-validate
 *   3. Update validate-apple-receipt Edge Function PRODUCT_IDS allowlist
 */

export const SUBSCRIPTION_GROUP = 'brewed_pro';

export const PRODUCT_IDS = {
  traderMonthly: 'com.brewedbyboon.app.trader.monthly',
  proMonthly:    'com.brewedbyboon.app.pro.monthly',
} as const;

export type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

export const ALL_PRODUCT_IDS: ProductId[] = Object.values(PRODUCT_IDS);

// Used by the paywall as a *fallback* if the App Store hasn't returned
// the localised price yet. Never charge from this — always use the
// store-returned localised price string at the moment of purchase.
export const FALLBACK_PRICES: Record<ProductId, string> = {
  [PRODUCT_IDS.traderMonthly]: '£5 / month',
  [PRODUCT_IDS.proMonthly]:    '£9 / month',
};

// Kept for backwards compatibility with existing imports.
export const FALLBACK_PRICE = FALLBACK_PRICES[PRODUCT_IDS.proMonthly];

export interface PlanDetail {
  name: string;
  shortName: string;
  period: 'month';
  fallbackPrice: string;
  tagline: string;
  features: string[];
}

export const SUBSCRIPTION_DETAILS: Record<ProductId, PlanDetail> = {
  [PRODUCT_IDS.traderMonthly]: {
    name: 'Brewed Trader',
    shortName: 'Trader',
    period: 'month',
    fallbackPrice: FALLBACK_PRICES[PRODUCT_IDS.traderMonthly],
    tagline: 'The working ledger. Everything you need to run the books.',
    features: [
      'Track unlimited events & applications',
      'Per-event P&L with VAT, COGS & commissions',
      'Product catalog & menu costs',
      'CSV sales report import',
      'Company management & trading history',
      'Core reports & annual P&L',
      'Discover: weekly directory of UK festivals + companies',
      'Fleet overview (one unit)',
      'Face ID / Touch ID sign in · Multi-device sync',
    ],
  },
  [PRODUCT_IDS.proMonthly]: {
    name: 'Brewed Pro',
    shortName: 'Pro',
    period: 'month',
    fallbackPrice: FALLBACK_PRICES[PRODUCT_IDS.proMonthly],
    tagline: 'The full operation. Forecasting, fleet reminders, PDF import.',
    features: [
      'Everything in Brewed Trader',
      'Demand forecast — weather-aware, learns from your history',
      'Stock prep & planning guidance',
      'PDF sales report import (item-level, on-device)',
      'Fleet reminders — MOT, tax & service notifications',
      'Multi-unit fleet management',
      'Advanced reports & performance trends',
      'Priority support',
    ],
  },
};
