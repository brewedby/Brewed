/**
 * Apple App Store in-app purchase product identifiers.
 *
 * IMPORTANT: These IDs must match exactly what you create in
 * App Store Connect → My Apps → Brewed → In-App Purchases.
 *
 * Apple convention is to use reverse-DNS prefixed by your bundle ID:
 *   com.brewedbyboon.app.pro.monthly
 *
 * If you change the ID here, you must:
 *   1. Update the App Store Connect product
 *   2. Re-run a sandbox purchase to re-validate
 *   3. Update validate-apple-receipt Edge Function PRODUCT_IDS allowlist
 */

export const SUBSCRIPTION_GROUP = 'brewed_pro';

export const PRODUCT_IDS = {
  proMonthly: 'com.brewedbyboon.app.pro.monthly',
} as const;

export type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

export const ALL_PRODUCT_IDS: ProductId[] = Object.values(PRODUCT_IDS);

// Used by the paywall as a *fallback* if the App Store hasn't returned
// the localised price yet. Never charge from this — always use the
// store-returned localised price string at the moment of purchase.
export const FALLBACK_PRICE = '£9 / month';

export const SUBSCRIPTION_DETAILS = {
  [PRODUCT_IDS.proMonthly]: {
    name: 'Brewed Pro',
    period: 'month',
    fallbackPrice: FALLBACK_PRICE,
    features: [
      'Track unlimited events & applications',
      'Per-event P&L with VAT, COGS & commissions',
      'Fleet management with MOT/tax/service alerts',
      'Reports & CSV export',
      'Discover: weekly directory of UK festivals + companies',
      'Face ID / Touch ID sign in',
      'Multi-device sync',
    ],
  },
} as const;
