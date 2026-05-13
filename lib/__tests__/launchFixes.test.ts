// Launch-blocker fix invariants.
//
// Pure-function + file-content tests for the bundle of fixes shipped to
// address the launch-blocking bugs: login-after-logout, profile
// persistence, sticky prediction-error banner, and the COGS legacy
// re-categorise reminder. Run with:
//   npx tsx lib/__tests__/launchFixes.test.ts
//
// Why these exist: every one of these is a single-line regression
// waiting to happen — re-adding the early-return that traps users on
// sign-in, dropping the business_name verify branch, or removing the
// auto-fix CTA. Pinning the contracts to source means a future refactor
// that walks them back fails CI rather than ships.

import * as fs from 'fs';
import * as path from 'path';
import { mapLegacyCategoryForTrade } from '../../types/cogs';

interface Test { name: string; pass: boolean; detail: string }
const results: Test[] = [];
function expect(name: string, cond: boolean, detail: string) {
  results.push({ name, pass: cond, detail });
}

const ROOT = path.join(__dirname, '..', '..');
const LAYOUT_PATH   = path.join(ROOT, 'app', '_layout.tsx');
const PROFILE_PATH  = path.join(ROOT, 'lib', 'queries', 'profile.ts');
const PREDICT_PATH  = path.join(ROOT, 'components', 'events', 'PredictionInsightCard.tsx');
const EVENT_PATH    = path.join(ROOT, 'app', '(tabs)', 'events', '[id]', 'index.tsx');
const COGS_PATH     = path.join(ROOT, 'components', 'cogs', 'ProductCatalogScreen.tsx');
const PRODMUT_PATH  = path.join(ROOT, 'lib', 'mutations', 'productCatalog.ts');

const layoutSrc   = fs.readFileSync(LAYOUT_PATH,  'utf8');
const profileSrc  = fs.readFileSync(PROFILE_PATH, 'utf8');
const predictSrc  = fs.readFileSync(PREDICT_PATH, 'utf8');
const eventSrc    = fs.readFileSync(EVENT_PATH,   'utf8');
const cogsSrc     = fs.readFileSync(COGS_PATH,    'utf8');
const prodMutSrc  = fs.readFileSync(PRODMUT_PATH, 'utf8');

// 1. Login-after-logout: the layout's auth-group escape must not be
//    gated behind `if (!profile) return`. After `queryClient.clear()`
//    on signOut, a slow or errored profile refetch was trapping users
//    on the sign-in screen forever because the early `if (!profile)
//    return` ran *before* the `session && inAuthGroup` redirect block.
{
  // (a) The escape block exists.
  expect('layout_has_auth_group_escape',
    /session && inAuthGroup/.test(layoutSrc),
    'layout must have a session-in-auth-group escape block');

  // (b) The escape block redirects to dashboard when profile is null
  //     (errored). This is the critical fix — previously the layout
  //     just `return`ed, leaving the user stranded on sign-in.
  expect('layout_escapes_auth_when_profile_errored',
    /session && inAuthGroup[\s\S]{0,800}if \(!profile\)[\s\S]{0,500}router\.replace\([^)]*\/\(tabs\)\/dashboard/.test(layoutSrc),
    'auth-group escape must redirect to dashboard even when profile errored');

  // (c) The profile-loaded gates that follow only block onboarding /
  //     paywall redirects, not the auth-group escape. We assert order:
  //     escape block (line N) must precede the `if (!profile) return;`
  //     fall-through (line M, M > N). We anchor the fall-through search
  //     on the literal `if (!profile) return;` (with trailing semicolon)
  //     so it skips the same phrase in nearby explanatory comments.
  const escapeIdx = layoutSrc.indexOf('session && inAuthGroup');
  const fallThroughIdx = layoutSrc.indexOf('if (!profile) return;');
  expect('layout_escape_precedes_profile_gate',
    escapeIdx > -1 && fallThroughIdx > -1 && escapeIdx < fallThroughIdx,
    'auth-group escape must run before the post-load `if (!profile) return;` fall-through');
}

// 2. Profile persistence: useUpdateProfile must verify every editable
//    field round-trips, not just business_type. A silent business_name
//    write failure used to show "Saved" success and leave the dashboard
//    rendering the default "My Business" subtitle.
{
  // (a) business_type verify branch still exists.
  expect('profile_verify_business_type',
    /business_type[\s\S]{0,400}normalizeTradeType[\s\S]{0,400}did not persist/.test(profileSrc),
    'business_type verify branch must remain (regression guard for trader-type pinning)');

  // (b) business_name verify branch was added.
  expect('profile_verify_business_name',
    /business_name[\s\S]{0,600}did not persist/.test(profileSrc),
    'business_name verify branch must throw on silent write failure');

  // (c) currency verify branch was added (cheap, same code path).
  expect('profile_verify_currency',
    /key === 'currency'|currency['\s\S]{0,300}did not persist/.test(profileSrc) ||
    /'business_name' \|\| key === 'currency'/.test(profileSrc),
    'currency verify branch must throw on silent write failure');
}

// 3. Forecast banner recovery: the "Couldn't load your trader profile"
//    banner must offer a retry that invalidates + refetches the profile
//    query. Without this the user has to sign out to recover from a
//    transient error (5-min staleTime pins the error).
{
  // (a) Retry button is wired up.
  expect('predict_card_has_retry_button',
    /RETRY/.test(predictSrc) && /retryProfile/.test(predictSrc),
    'prediction card must render a Retry button on the error banner');

  // (b) Retry actually invalidates AND refetches the profile query.
  expect('predict_card_retry_invalidates_and_refetches',
    /retryProfile[\s\S]{0,500}invalidateQueries[\s\S]{0,200}refetchQueries/.test(predictSrc),
    'retry must invalidateQueries + refetchQueries on profile');

  // (c) Banner copy no longer instructs sign-out as the only path.
  expect('predict_card_banner_offers_retry_not_signout_only',
    /Tap retry/.test(predictSrc),
    'banner must mention retry, not direct user to sign-out only');
}

// 4. Event detail pull-to-refresh must also invalidate the profile
//    query — otherwise the recovery banner stays sticky even after the
//    user pulls down to refresh.
{
  expect('event_refresh_invalidates_profile',
    /handleRefresh[\s\S]{0,800}invalidateQueries[\s\S]{0,200}\['profile'/.test(eventSrc),
    'event detail handleRefresh must invalidate the profile query');
}

// 5. COGS legacy reminder: the "Re-categorise reminder" must offer an
//    auto-fix CTA, not just an instruction to manually edit 30+ rows.
{
  // (a) Auto-fix handler exists.
  expect('cogs_has_auto_fix_handler',
    /handleAutoFixLegacy/.test(cogsSrc),
    'COGS screen must have handleAutoFixLegacy handler');

  // (b) Auto-fix button is rendered alongside the reminder.
  expect('cogs_renders_auto_fix_button',
    /AUTO-FIX ALL/.test(cogsSrc),
    'COGS screen must render an "Auto-fix all" button');

  // (c) Handler uses the trade-aware mapper.
  expect('cogs_uses_legacy_mapper',
    /mapLegacyCategoryForTrade/.test(cogsSrc),
    'COGS auto-fix must call mapLegacyCategoryForTrade per legacy product');

  // (d) Bulk mutation exists in productCatalog mutations file.
  expect('cogs_bulk_recategorize_mutation_exists',
    /useRecategorizeProducts/.test(prodMutSrc),
    'product mutations must export useRecategorizeProducts');
}

// 6. Pure-function tests for mapLegacyCategoryForTrade.
//    Trade-aware mapping: must not blindly funnel everything to 'other',
//    must respect each trade's category list.
{
  // (a) Coffee: food → bakes (Coffee traders sell pastries, not mains).
  expect('mapper_coffee_food_to_bakes',
    mapLegacyCategoryForTrade('food', 'Coffee') === 'bakes',
    'food + Coffee → bakes');

  // (b) Coffee: drinks → cold_drinks (Coffee has hot_drinks + cold_drinks,
  //     no generic 'drinks').
  expect('mapper_coffee_drinks_to_cold_drinks',
    mapLegacyCategoryForTrade('drinks', 'Coffee') === 'cold_drinks',
    'drinks + Coffee → cold_drinks');

  // (c) Burgers: food → mains.
  expect('mapper_burgers_food_to_mains',
    mapLegacyCategoryForTrade('food', 'Burgers') === 'mains',
    'food + Burgers → mains');

  // (d) Bakery: drinks → hot_drinks (Bakery has hot/cold drinks).
  expect('mapper_bakery_drinks_to_hot_drinks',
    mapLegacyCategoryForTrade('drinks', 'Bakery') === 'hot_drinks',
    'drinks + Bakery → hot_drinks');

  // (e) Cocktails: drinks → alcohol.
  expect('mapper_cocktails_drinks_to_alcohol',
    mapLegacyCategoryForTrade('drinks', 'Cocktails') === 'alcohol',
    'drinks + Cocktails → alcohol');

  // (f) Already-valid category is unchanged.
  expect('mapper_valid_unchanged_coffee_other',
    mapLegacyCategoryForTrade('other', 'Coffee') === 'other',
    'other + Coffee → other (no change)');

  expect('mapper_valid_unchanged_coffee_hot_drinks',
    mapLegacyCategoryForTrade('hot_drinks', 'Coffee') === 'hot_drinks',
    'hot_drinks + Coffee → hot_drinks (no change)');

  // (g) Unknown legacy key falls through to 'other'.
  expect('mapper_unknown_falls_through_to_other',
    mapLegacyCategoryForTrade('totally_made_up', 'Coffee') === 'other',
    'unknown legacy key + any trade → other');

  // (h) Unknown trade falls back to Other's mapping (food → mains).
  expect('mapper_unknown_trade_uses_other_mapping',
    mapLegacyCategoryForTrade('food', 'Some Future Trade') === 'mains',
    'food + unknown trade → mains (Other-table fallback)');

  // (i) Result is ALWAYS in the trade's TRADE_CATEGORIES list — this is
  //     the property the caller relies on (the auto-fix mutation only
  //     writes valid categories).
  const tradesToCheck = ['Coffee', 'Burgers', 'Pizza', 'Bakery', 'Ice Cream', 'Cocktails', 'Other'];
  const legacyValues = ['food', 'drinks', 'totally_made_up', ''];
  // Re-derive valid categories per trade for the property check.
  // Importing TRADE_CATEGORIES + DEFAULT_CATEGORIES from types/cogs.
  const { TRADE_CATEGORIES, DEFAULT_CATEGORIES } = require('../../types/cogs') as {
    TRADE_CATEGORIES: Record<string, string[]>;
    DEFAULT_CATEGORIES: string[];
  };
  let allValid = true;
  let firstBad: string | null = null;
  for (const trade of tradesToCheck) {
    const validKeys = TRADE_CATEGORIES[trade] ?? DEFAULT_CATEGORIES;
    for (const legacy of legacyValues) {
      const out = mapLegacyCategoryForTrade(legacy, trade);
      if (!validKeys.includes(out)) {
        allValid = false;
        firstBad = `${legacy} + ${trade} → ${out} (not in ${validKeys.join(',')})`;
        break;
      }
    }
    if (!allValid) break;
  }
  expect('mapper_always_returns_valid_category',
    allValid,
    firstBad ?? 'every (legacy, trade) pair maps to a category in that trade\'s TRADE_CATEGORIES list');
}

// ── Reporter ──────────────────────────────────────────────
let pass = 0, fail = 0;
for (const r of results) {
  const tag = r.pass ? 'PASS' : 'FAIL';
  // eslint-disable-next-line no-console
  console.log(`${tag}  ${r.name.padEnd(52)} ${r.detail}`);
  if (r.pass) pass++; else fail++;
}
// eslint-disable-next-line no-console
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
