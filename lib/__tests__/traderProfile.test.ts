// Tests for the shared trader-profile resolver.
//
// Two halves:
//
//   1. Pure unit tests of resolveStatus() — the status decision tree
//      that decides between 'loading' | 'ready' | 'incomplete' | 'error'
//      given live data, cache data, fetching state, error state.
//
//   2. File-content invariants pinning that the resolver exists, is
//      shaped as expected, persists to AsyncStorage, surfaces dev
//      diagnostics, and is consumed by both COGS and event detail.
//
// Run with:  npx tsx lib/__tests__/traderProfile.test.ts

import * as fs from 'fs';
import * as path from 'path';

interface Test { name: string; pass: boolean; detail: string }
const results: Test[] = [];
function expect(name: string, cond: boolean, detail: string) {
  results.push({ name, pass: cond, detail });
}

const ROOT = path.join(__dirname, '..', '..');
const resolverSrc = fs.readFileSync(path.join(ROOT, 'lib', 'queries', 'traderProfile.ts'),                    'utf8');
const logicSrc    = fs.readFileSync(path.join(ROOT, 'lib', 'queries', 'traderProfileLogic.ts'),                'utf8');
const catalogSrc  = fs.readFileSync(path.join(ROOT, 'components', 'cogs', 'ProductCatalogScreen.tsx'),         'utf8');
const eventSrc    = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'events', '[id]', 'index.tsx'),           'utf8');

// ── 1. Pure status-tree unit tests ────────────────────────────────────
// Import from the leaf logic module — it has zero RN/Supabase imports
// so tsx can require it without breaking on react-native's index.js.
import { resolveStatus } from '../queries/traderProfileLogic';

const liveProfile = {
  id: 'u1',
  business_name: 'Brewed by Boon',
  business_type: 'Coffee',
  currency: 'GBP',
  custom_metrics: [],
  subscription_status: 'active' as const,
  subscription_product_id: null,
  subscription_expires_at: null,
  subscription_will_renew: false,
  reviewer_grandfathered: false,
};
const incompleteProfile = { ...liveProfile, business_name: null, business_type: '' };
const cachedProfile    = { ...liveProfile, business_name: 'Old Cached Name' };

{
  const r = resolveStatus({
    userId: null,
    live: null,
    cached: null,
    isFetching: false,
    isCacheLoading: false,
    isError: false,
  });
  expect('resolver_no_user_returns_loading',
    r.status === 'loading' && r.chosen === null && r.source === 'fallback',
    'pre-auth (no userId) must always be loading regardless of other flags');
}

{
  const r = resolveStatus({
    userId: 'u1',
    live: liveProfile,
    cached: null,
    isFetching: false,
    isCacheLoading: false,
    isError: false,
  });
  expect('resolver_live_data_returns_ready',
    r.status === 'ready' && r.source === 'profile' && r.chosen === liveProfile,
    'a complete live profile returns status=ready, source=profile');
}

{
  // The whole point of this hook: live data even with isError still
  // wins. React Query keeps prev data while exposing isError=true
  // when a refetch fails; the resolver must NOT bounce that to 'error'.
  const r = resolveStatus({
    userId: 'u1',
    live: liveProfile,
    cached: null,
    isFetching: false,
    isCacheLoading: false,
    isError: true,
  });
  expect('resolver_live_wins_over_isError',
    r.status === 'ready' && r.source === 'profile',
    'live data overrides isError — refetch failure must not lock the user out');
}

{
  const r = resolveStatus({
    userId: 'u1',
    live: incompleteProfile,
    cached: null,
    isFetching: false,
    isCacheLoading: false,
    isError: false,
  });
  expect('resolver_incomplete_live_returns_incomplete',
    r.status === 'incomplete' && r.source === 'profile' && r.chosen === incompleteProfile,
    'live profile missing name/type returns incomplete, not error');
}

{
  const r = resolveStatus({
    userId: 'u1',
    live: null,
    cached: cachedProfile,
    isFetching: false,
    isCacheLoading: false,
    isError: true,
  });
  expect('resolver_cache_used_when_live_fails',
    r.status === 'ready' && r.source === 'cache' && r.chosen === cachedProfile,
    'cached profile is used when live fetch errored and we have no live data');
}

{
  const r = resolveStatus({
    userId: 'u1',
    live: null,
    cached: null,
    isFetching: true,
    isCacheLoading: false,
    isError: false,
  });
  expect('resolver_fetching_returns_loading',
    r.status === 'loading' && r.source === 'fallback',
    'no live, no cache, fetching → loading');
}

{
  const r = resolveStatus({
    userId: 'u1',
    live: null,
    cached: null,
    isFetching: false,
    isCacheLoading: true,
    isError: false,
  });
  expect('resolver_cache_loading_returns_loading',
    r.status === 'loading' && r.source === 'fallback',
    'no live, no cache, cache loading → loading (avoid premature error)');
}

{
  const r = resolveStatus({
    userId: 'u1',
    live: null,
    cached: null,
    isFetching: false,
    isCacheLoading: false,
    isError: true,
  });
  expect('resolver_no_data_with_error_returns_error',
    r.status === 'error' && r.source === 'fallback' && r.chosen === null,
    'no live, no cache, not fetching, errored → error (genuine failure)');
}

// ── 2. Resolver shape invariants ────────────────────────────────────────
{
  expect('resolver_exports_useTraderProfile',
    /export function useTraderProfile\(/.test(resolverSrc),
    'lib/queries/traderProfile.ts must export useTraderProfile');

  expect('resolver_exports_status_type',
    /export type TraderProfileStatus\s*=\s*['"]loading['"]\s*\|\s*['"]ready['"]\s*\|\s*['"]incomplete['"]\s*\|\s*['"]error['"]/.test(logicSrc),
    'TraderProfileStatus must include exactly four states: loading | ready | incomplete | error');

  expect('resolver_exports_source_type',
    /export type TraderProfileSource\s*=\s*['"]profile['"]\s*\|\s*['"]cache['"]\s*\|\s*['"]fallback['"]/.test(logicSrc),
    'TraderProfileSource must include exactly three sources: profile | cache | fallback');

  expect('resolver_returns_retry_function',
    /retry:\s*\(\)\s*=>\s*Promise<void>/.test(resolverSrc),
    'ResolvedTraderProfile must expose a retry() promise so consumers can refetch on demand');

  expect('resolver_persists_to_asyncstorage',
    /AsyncStorage\.setItem|writeCachedProfile/.test(resolverSrc),
    'resolver must mirror successful fetches to AsyncStorage');

  expect('resolver_reads_asyncstorage',
    /AsyncStorage\.getItem|readCachedProfile/.test(resolverSrc),
    'resolver must hydrate cached profile from AsyncStorage on userId change');

  expect('resolver_logs_dev_diagnostics',
    /__DEV__[\s\S]{0,400}profile fetch error/.test(resolverSrc),
    'resolver must dev-only console.warn the underlying fetch error so Metro logs reveal the cause');

  expect('resolver_retry_invalidates_then_refetches',
    /invalidateQueries[\s\S]{0,200}refetch/.test(resolverSrc),
    'retry() must invalidate the profile query first, THEN refetch — not just refetch a cached error');

  expect('resolver_cache_key_namespaced_by_userId',
    /@traderProfile:[\s\S]{0,200}userId/.test(resolverSrc),
    'AsyncStorage cache key must be namespaced by userId to prevent cross-account leaks');
}

// ── 3. COGS uses the resolver ─────────────────────────────────────────────
{
  expect('catalog_imports_useTraderProfile',
    /import\s*\{\s*useTraderProfile\s*\}\s*from\s*['"]@\/lib\/queries\/traderProfile['"]/.test(catalogSrc),
    'ProductCatalogScreen must import useTraderProfile from the shared resolver');

  expect('catalog_no_longer_imports_useProfile',
    !/from\s+['"]@\/lib\/queries\/profile['"]/.test(catalogSrc),
    'ProductCatalogScreen must not import useProfile directly — all access goes through the resolver');

  expect('catalog_no_longer_imports_getActiveTradeType',
    !/getActiveTradeType/.test(catalogSrc),
    'ProductCatalogScreen must derive tradeType from the resolver, not call getActiveTradeType itself');

  expect('catalog_uses_trader_status_ready',
    /trader\.status\s*===\s*['"]ready['"]/.test(catalogSrc),
    'ProductCatalogScreen must branch on trader.status === ready');

  expect('catalog_uses_trader_status_loading',
    /trader\.status\s*===\s*['"]loading['"]/.test(catalogSrc),
    'ProductCatalogScreen must render a spinner on status === loading');

  expect('catalog_uses_trader_status_error',
    /trader\.status\s*===\s*['"]error['"]/.test(catalogSrc),
    'ProductCatalogScreen must render the recovery banner on status === error');

  expect('catalog_uses_trader_status_incomplete',
    /trader\.status\s*===\s*['"]incomplete['"]/.test(catalogSrc),
    'ProductCatalogScreen must render the setup prompt on status === incomplete (not the wrong picker)');

  expect('catalog_retry_calls_trader_retry',
    /trader\.retry\(\)/.test(catalogSrc),
    'ProductCatalogScreen RETRY button must call trader.retry() so the cache is invalidated + refetched');
}

// ── 4. Event detail uses the resolver ──────────────────────────────────────
{
  expect('event_detail_imports_useTraderProfile',
    /import\s*\{\s*useTraderProfile\s*\}\s*from\s*['"]@\/lib\/queries\/traderProfile['"]/.test(eventSrc),
    'event detail must import useTraderProfile');

  expect('event_detail_no_longer_imports_useProfile',
    !/import[^;]*\buseProfile\b/.test(eventSrc),
    'event detail must not import useProfile directly');

  expect('event_detail_no_longer_imports_getActiveTradeType',
    !/getActiveTradeType/.test(eventSrc),
    'event detail must not import getActiveTradeType — tradeType comes from the resolver');

  expect('event_detail_derives_profileLoading_from_status',
    /profileLoading\s*=\s*trader\.status\s*===\s*['"]loading['"]/.test(eventSrc),
    'event detail must derive profileLoading from trader.status === loading');

  expect('event_detail_derives_profileError_from_status',
    /profileError\s*=\s*trader\.status\s*===\s*['"]error['"]/.test(eventSrc),
    'event detail must derive profileError from trader.status === error');

  expect('event_detail_treats_incomplete_as_loaded_not_error',
    /profileLoaded[\s\S]{0,100}incomplete/.test(eventSrc),
    'event detail must treat incomplete (no trade type chosen) as loaded so the card shows its inline picker, not the error banner');

  expect('event_detail_refresh_calls_trader_retry',
    /trader\.retry\(\)/.test(eventSrc),
    'event detail pull-to-refresh must call trader.retry() so the shared profile is refreshed');
}

// ── 5. The old fragile gate must not return ──────────────────────────────
{
  // The bug we just fixed: gating on !isError when data exists. If anyone
  // reintroduces this pattern in COGS or event detail, fail loudly.
  expect('catalog_no_fragile_profileError_only_gate',
    !/profileReady\s*=\s*!profileLoading\s*&&\s*!profileError\s*&&\s*!!profile/.test(catalogSrc),
    'the old "!profileLoading && !profileError && !!profile" gate must not be reintroduced — React Query can have data AND isError=true simultaneously');
}

// ── Reporter ───────────────────────────────────────────────────
let pass = 0, fail = 0;
for (const r of results) {
  const tag = r.pass ? 'PASS' : 'FAIL';
  // eslint-disable-next-line no-console
  console.log(`${tag}  ${r.name.padEnd(56)} ${r.detail}`);
  if (r.pass) pass++; else fail++;
}
// eslint-disable-next-line no-console
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
