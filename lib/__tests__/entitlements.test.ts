/**
 * Tests for the central feature-gating system (two-tier subscriptions).
 *
 * Halves:
 *  1. Pure unit tests of tierForSubscription() and hasFeature().
 *  2. File-content invariants pinning that gating flows through the
 *     central module (no scattered product-id checks in UI code).
 *
 * Run with:  npx tsx lib/__tests__/entitlements.test.ts
 */
import * as fs from 'fs';
import * as path from 'path';

interface Test { name: string; pass: boolean; detail: string }
const results: Test[] = [];
function expect(name: string, cond: boolean, detail: string = '') {
  results.push({ name, pass: cond, detail });
}

import {
  tierForSubscription, hasFeature, requiredPlanName, FEATURE_TIERS,
} from '../iap/entitlements';
import { PRODUCT_IDS } from '../iap/products';

// ── 1. Tier resolution ────────────────────────────────────────────────────────

expect('grandfathered_is_pro',
  tierForSubscription({ status: 'none', productId: null, grandfathered: true }) === 'pro',
  'reviewer_grandfathered accounts always resolve to pro');

expect('no_subscription_is_none',
  tierForSubscription({ status: 'none', productId: null, grandfathered: false }) === 'none',
  'no active subscription → none');

expect('expired_is_none',
  tierForSubscription({ status: 'expired', productId: PRODUCT_IDS.proMonthly, grandfathered: false }) === 'none',
  'expired subscription → none even with a product id on file');

expect('active_trader_is_trader',
  tierForSubscription({ status: 'active', productId: PRODUCT_IDS.traderMonthly, grandfathered: false }) === 'trader',
  'active trader product → trader tier');

expect('active_pro_is_pro',
  tierForSubscription({ status: 'active', productId: PRODUCT_IDS.proMonthly, grandfathered: false }) === 'pro',
  'active pro product → pro tier');

expect('grace_period_keeps_tier',
  tierForSubscription({ status: 'in_grace_period', productId: PRODUCT_IDS.traderMonthly, grandfathered: false }) === 'trader',
  'grace period keeps the plan tier');

expect('legacy_unknown_product_is_pro',
  tierForSubscription({ status: 'active', productId: 'com.brewedbyboon.app.legacy.annual', grandfathered: false }) === 'pro',
  'unknown product on an active sub must NOT downgrade a legacy subscriber');

expect('active_null_product_is_pro',
  tierForSubscription({ status: 'active', productId: null, grandfathered: false }) === 'pro',
  'active sub with missing product id (pre-tier data) → pro, never lock out');

// ── 2. Feature gating ─────────────────────────────────────────────────────────

expect('trader_gets_financials', hasFeature('trader', 'financials'), '');
expect('trader_gets_cogs', hasFeature('trader', 'cogs'), '');
expect('trader_gets_csv_import', hasFeature('trader', 'csv_import'), '');
expect('trader_gets_core_reports', hasFeature('trader', 'reports_core'), '');
expect('trader_gets_companies', hasFeature('trader', 'companies'), '');
expect('trader_gets_discover', hasFeature('trader', 'discover'), '');
expect('trader_gets_fleet_overview', hasFeature('trader', 'fleet_overview'), '');

expect('trader_no_forecast', !hasFeature('trader', 'forecast'), 'forecast is Pro');
expect('trader_no_pdf_import', !hasFeature('trader', 'pdf_import'), 'PDF import is Pro');
expect('trader_no_fleet_reminders', !hasFeature('trader', 'fleet_reminders'), 'fleet reminders are Pro');
expect('trader_no_multi_unit', !hasFeature('trader', 'fleet_multi_unit'), 'multi-unit fleet is Pro');

expect('pro_gets_everything',
  (Object.keys(FEATURE_TIERS) as (keyof typeof FEATURE_TIERS)[]).every((f) => hasFeature('pro', f)),
  'pro tier must pass every feature gate');

expect('none_gets_nothing',
  (Object.keys(FEATURE_TIERS) as (keyof typeof FEATURE_TIERS)[]).every((f) => !hasFeature('none', f)),
  'none tier must fail every gate (layout paywall is the real gate)');

// ── 3. Graceful degradation ───────────────────────────────────────────────────

expect('unknown_status_degrades_open_pro_feature',
  hasFeature('none', 'forecast', false),
  'when statusKnown=false every gate allows — never brick on a fetch failure');

expect('unknown_status_degrades_open_trader_feature',
  hasFeature('none', 'financials', false),
  'statusKnown=false allows basic features too');

// ── 4. Plan naming ────────────────────────────────────────────────────────────

expect('pro_feature_names_pro_plan', requiredPlanName('forecast') === 'Brewed Pro', requiredPlanName('forecast'));
expect('trader_feature_names_trader_plan', requiredPlanName('financials') === 'Brewed Trader', requiredPlanName('financials'));

// ── 5. File-content invariants ────────────────────────────────────────────────

const ROOT = path.join(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const ctxSrc      = read('lib/iap/SubscriptionContext.tsx');
const productsSrc = read('lib/iap/products.ts');
const paywallSrc  = read('app/(modal)/paywall.tsx');
const eventSrc    = read('app/(tabs)/events/[id]/index.tsx');
const cogsSrc     = read('components/cogs/CogsSection.tsx');
const fleetNewSrc = read('app/(modal)/fleet/new.tsx');
const upgradeSrc  = read('components/shared/UpgradePrompt.tsx');

expect('context_exports_useFeature',
  ctxSrc.includes('export function useFeature'),
  'SubscriptionContext must export the useFeature hook');

expect('context_uses_central_tier_resolution',
  ctxSrc.includes('tierForSubscription('),
  'tier must come from entitlements.tierForSubscription, not inline logic');

expect('products_has_two_tiers',
  productsSrc.includes('traderMonthly') && productsSrc.includes('proMonthly'),
  'products.ts must define both trader and pro product ids');

expect('paywall_renders_both_plans',
  paywallSrc.includes('PLAN_ORDER') && paywallSrc.includes('traderMonthly') && paywallSrc.includes('proMonthly'),
  'paywall must offer both plans');

expect('paywall_has_restore',
  paywallSrc.includes('RESTORE PURCHASES'),
  'paywall must keep Restore Purchases');

expect('paywall_has_apple_legal',
  paywallSrc.includes('stdeula') && paywallSrc.includes('auto-renews'),
  'paywall must keep App Store mandatory legal copy');

expect('paywall_no_external_payment',
  !/stripe|paypal|checkout\.com|external.*payment/i.test(paywallSrc),
  'paywall must not reference external payment processors on iOS');

expect('event_detail_gates_forecast',
  eventSrc.includes("useFeature('forecast')"),
  'event detail must gate the forecast card via useFeature');

expect('event_detail_shows_upgrade_prompt',
  eventSrc.includes('UpgradePrompt'),
  'gated forecast must show the calm UpgradePrompt, not a blank space');

expect('cogs_gates_pdf_import',
  cogsSrc.includes("useFeature('pdf_import')"),
  'CogsSection must gate PDF import via useFeature');

expect('cogs_pdf_gate_saves_nothing',
  cogsSrc.includes('nothing was saved'),
  'PDF gate fires BEFORE save — the alert copy confirms nothing was persisted');

expect('fleet_new_gates_multi_unit',
  fleetNewSrc.includes("useFeature('fleet_multi_unit')"),
  'fleet new-unit screen must gate additional units via useFeature');

expect('upgrade_prompt_not_aggressive',
  !upgradeSrc.toLowerCase().includes('unlock now') && !upgradeSrc.includes('!!'),
  'upgrade prompt copy stays calm');

expect('no_scattered_product_id_checks',
  !eventSrc.includes('proMonthly') && !cogsSrc.includes('proMonthly') && !fleetNewSrc.includes('proMonthly'),
  'UI code must never compare raw product ids — gating goes through useFeature');

// ── Report ────────────────────────────────────────────────────────────────────
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass);
const width = Math.max(...results.map(r => r.name.length));
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name.padEnd(width + 2)}${r.detail ? ' ' + r.detail : ''}`);
}
console.log(`\n${passed} passed, ${failed.length} failed`);
if (failed.length > 0) process.exit(1);

// ── 6. Reviewer/test entitlement isolation (launch audit) ────────────────────
// Appended by the launch-readiness pass: pins that dev/test entitlement
// paths can never leak into production builds.
{
  const devSrc = read('lib/iap/devEntitlement.ts');
  const results2: Test[] = [];
  const expect2 = (name: string, cond: boolean, detail: string = '') => {
    results2.push({ name, pass: cond, detail });
  };

  expect2('dev_override_getter_gated_by_DEV',
    /getDevTierOverride[\s\S]{0,120}if \(!__DEV__\) return null;/.test(devSrc),
    'getDevTierOverride must hard-return null outside __DEV__');

  expect2('dev_override_setter_gated_by_DEV',
    /setDevTierOverride[\s\S]{0,120}if \(!__DEV__\) return;/.test(devSrc),
    'setDevTierOverride must be a no-op outside __DEV__');

  expect2('dev_override_local_only',
    devSrc.includes('AsyncStorage') && !devSrc.includes('supabase'),
    'override must be device-local — no server flag');

  expect2('context_dev_tier_double_gated',
    ctxSrcFresh().includes("__DEV__ && devTier !== null ? devTier : serverTier"),
    'context must apply the override only when __DEV__ is true at the use site too');

  expect2('paywall_gate_uses_server_entitlement',
    !ctxSrcFresh().includes('devTier') ||
    ctxSrcFresh().indexOf('const isEntitled') < ctxSrcFresh().indexOf('devTier'),
    'isEntitled (layout paywall) must be derived before/without the dev override');

  const migSrc = fs.readFileSync(path.join(ROOT, 'supabase', 'migration_016_reviewer_isolation.sql'), 'utf8');
  expect2('migration_resets_blanket_grandfathering',
    migSrc.includes('SET reviewer_grandfathered = false') && migSrc.includes('NOT IN'),
    'migration 016 must reset the blanket UPDATE, keeping only allowlisted accounts');

  expect2('migration_is_idempotent_documented',
    migSrc.includes('idempotent'),
    'migration must be safe to re-run');

  for (const r of results2) {
    results.push(r);
    console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name.padEnd(45)}${r.detail ? ' ' + r.detail : ''}`);
  }
  const failed2 = results2.filter(r => !r.pass);
  console.log(`\nisolation: ${results2.length - failed2.length} passed, ${failed2.length} failed`);
  if (failed2.length > 0) process.exit(1);
}

function ctxSrcFresh(): string {
  return fs.readFileSync(path.join(ROOT, 'lib', 'iap', 'SubscriptionContext.tsx'), 'utf8');
}
