// Phase 3 release-blocker fix invariants.
//
// Pins three deliverables:
//   1. Dashboard "Log today's sales" floating £ FAB is removed.
//   2. ProductCatalogScreen gates rendering on profile load — the picker
//      can never render with a stale tradeType='Other' fallback while
//      useProfile is in flight or errored.
//   3. Coffee TRADE_CATEGORIES still include hot_drinks AND cold_drinks
//      (the user-visible bug we're chasing — generic "drinks" must not
//      have replaced them).
//
// Run with:  npx tsx lib/__tests__/cogsAndFab.test.ts

import * as fs from 'fs';
import * as path from 'path';

interface Test { name: string; pass: boolean; detail: string }
const results: Test[] = [];
function expect(name: string, cond: boolean, detail: string) {
  results.push({ name, pass: cond, detail });
}

const ROOT = path.join(__dirname, '..', '..');
const dashboardSrc  = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'dashboard.tsx'),                           'utf8');
const catalogSrc    = fs.readFileSync(path.join(ROOT, 'components', 'cogs', 'ProductCatalogScreen.tsx'),           'utf8');
const cogsTypesSrc  = fs.readFileSync(path.join(ROOT, 'types', 'cogs.ts'),                                         'utf8');
const tradeCfgSrc   = fs.readFileSync(path.join(ROOT, 'lib', 'tradeTypeConfig.ts'),                                'utf8');
const predictSrc    = fs.readFileSync(path.join(ROOT, 'lib', 'predictionEngine.ts'),                               'utf8');

// ── 1. Dashboard FAB removal ─────────────────────────────────────
{
  // (a) No "Log today's sales" accessibilityLabel anywhere on the dashboard.
  expect('dashboard_no_log_today_sales_label',
    !/Log today['’]s sales/.test(dashboardSrc),
    'dashboard.tsx must not reference "Log today\'s sales" — FAB removed');

  // (b) No QuickSalesSheet import (was only used by the FAB).
  expect('dashboard_no_quicksales_import',
    !/QuickSalesSheet/.test(dashboardSrc),
    'dashboard.tsx must not import QuickSalesSheet — dead import after FAB removal');

  // (c) No quickSalesOpen state.
  expect('dashboard_no_quicksales_state',
    !/quickSalesOpen|setQuickSalesOpen/.test(dashboardSrc),
    'dashboard.tsx must not declare quickSalesOpen state — dead state after FAB removal');

  // (d) No bottom-right £ FAB pattern: an absolutely positioned button with
  //     a £ glyph. Use a tolerant regex that catches the visual signature
  //     even if future cleanups rename the variables.
  const hasAbsoluteButtonWithPoundsGlyph =
    /position:\s*['"]absolute['"][\s\S]{0,400}£/.test(dashboardSrc);
  expect('dashboard_no_floating_pounds_button',
    !hasAbsoluteButtonWithPoundsGlyph,
    'dashboard.tsx must not render an absolutely-positioned £ glyph button');
}

// ── 2. ProductCatalogScreen gates on profile load ─────────────────────
{
  // (a) The screen pulls isLoading/isError from useProfile so it can branch
  //     on the load state rather than silently using 'Other'.
  expect('catalog_pulls_profile_loading_state',
    /isLoading:\s*profileLoading[\s\S]{0,200}isError:\s*profileError/.test(catalogSrc),
    'ProductCatalogScreen must destructure isLoading/isError from useProfile');

  // (b) A profileReady predicate gates the body (early-return for
  //     loading + error, no fall-through to picker with 'Other').
  expect('catalog_uses_profileReady_predicate',
    /profileReady\s*=\s*!profileLoading\s*&&\s*!profileError\s*&&\s*!!profile/.test(catalogSrc),
    'ProductCatalogScreen must define profileReady = !profileLoading && !profileError && !!profile');

  // (c) Add/Edit views are gated by profileReady so ProductForm never
  //     receives tradeType='Other' from the loading fallback.
  expect('catalog_add_view_gated',
    /profileReady\s*&&\s*view\s*===\s*['"]add['"]/.test(catalogSrc),
    'ProductCatalogScreen add view must be gated by profileReady');
  expect('catalog_edit_view_gated',
    /profileReady\s*&&\s*view\s*===\s*['"]edit['"]/.test(catalogSrc),
    'ProductCatalogScreen edit view must be gated by profileReady');

  // (d) Profile-error banner with a RETRY action — so a transient
  //     network failure doesn't lock the user into wrong categories
  //     for five minutes (useProfile's staleTime).
  expect('catalog_profile_error_banner_with_retry',
    /Couldn.{1,3}t load your trader profile[\s\S]{0,800}RETRY/.test(catalogSrc),
    'ProductCatalogScreen must show a "Couldn\'t load your trader profile" banner with RETRY');
}

// ── 3. Coffee categories still include Hot Drinks AND Iced/Cold Drinks ──────
{
  // (a) TRADE_CATEGORIES.Coffee contains 'hot_drinks' and 'cold_drinks'.
  //     Regex matches the exact array spelling, including allowing trailing
  //     entries — the order may evolve but both keys must be present.
  const coffeeLineMatch = cogsTypesSrc.match(/Coffee:\s*\[([^\]]+)\]/);
  const coffeeKeys      = coffeeLineMatch ? coffeeLineMatch[1] : '';
  expect('coffee_trade_categories_include_hot_drinks',
    /['"]hot_drinks['"]/.test(coffeeKeys),
    'TRADE_CATEGORIES.Coffee must include hot_drinks');
  expect('coffee_trade_categories_include_cold_drinks',
    /['"]cold_drinks['"]/.test(coffeeKeys),
    'TRADE_CATEGORIES.Coffee must include cold_drinks');

  // (b) The bare 'drinks' key (generic) must NOT have replaced hot_drinks
  //     and cold_drinks in the Coffee array. If both hot+cold are present
  //     and 'drinks' is absent, this passes by construction — but pin it
  //     explicitly so future refactors don't silently collapse them.
  const coffeeHasGenericDrinks = /['"]drinks['"]/.test(coffeeKeys);
  expect('coffee_no_generic_drinks_collapse',
    !coffeeHasGenericDrinks,
    'TRADE_CATEGORIES.Coffee must not collapse hot/cold into generic "drinks"');

  // (c) CATEGORY_DEFINITIONS for hot_drinks / cold_drinks must exist with
  //     user-visible labels — otherwise the picker would render the snake_case
  //     key as the label.
  expect('hot_drinks_has_user_label',
    /hot_drinks:\s*\{[^}]*label:\s*['"]Hot Drinks['"]/.test(cogsTypesSrc),
    'CATEGORY_DEFINITIONS.hot_drinks must have label "Hot Drinks"');
  expect('cold_drinks_has_user_label',
    /cold_drinks:\s*\{[^}]*label:\s*['"]Cold Drinks['"]/.test(cogsTypesSrc),
    'CATEGORY_DEFINITIONS.cold_drinks must have label "Cold Drinks"');
}

// ── 4. Coffee trade config produces drink_split, not general_demand ─────────
{
  // (a) The Coffee CONFIG entry uses kind: 'drink_split' for its lens.
  //     Match within the Coffee block (delimited by the next trade key).
  const coffeeBlock = tradeCfgSrc.match(/COFFEE[\s\S]{0,800}?predictionLenses/);
  expect('coffee_trade_config_uses_drink_split_lens',
    coffeeBlock !== null && /kind:\s*['"]drink_split['"]/.test(tradeCfgSrc.slice(coffeeBlock!.index!, coffeeBlock!.index! + 1500)),
    'tradeTypeConfig COFFEE block must declare kind: "drink_split"');

  // (b) Coffee lens title is "Hot vs Iced Forecast".
  expect('coffee_lens_title_hot_vs_iced',
    /Hot vs Iced Forecast/.test(tradeCfgSrc),
    'tradeTypeConfig COFFEE block must declare title "Hot vs Iced Forecast"');

  // (c) The dispatcher in predictionEngine routes drink_split → predictForCoffee.
  expect('engine_routes_drink_split_to_coffee',
    /['"]drink_split['"][\s\S]{0,200}predictForCoffee/.test(predictSrc),
    'predict() must route drink_split lens to predictForCoffee');

  // (d) predictForCoffee returns Hot drinks % and Iced drinks % in its forecast lines.
  expect('coffee_forecast_emits_hot_iced_percent',
    /label:\s*['"]Hot drinks['"][\s\S]{0,200}label:\s*['"]Iced drinks['"]/.test(predictSrc),
    'predictForCoffee must emit "Hot drinks" % and "Iced drinks" % forecast lines');

  // (e) Coffee forecast never includes Mains/Sides/Extras lines.
  //     Scope the regex to predictForCoffee's body using the function header
  //     as anchor and the next function declaration as the end marker.
  const coffeeFnMatch = predictSrc.match(/function predictForCoffee[\s\S]*?\n\}\n/);
  const coffeeFnBody  = coffeeFnMatch ? coffeeFnMatch[0] : '';
  expect('coffee_forecast_no_mains',
    !/label:\s*['"]Mains/i.test(coffeeFnBody),
    'predictForCoffee body must not emit a "Mains" forecast line');
  expect('coffee_forecast_no_sides_attach',
    !/label:\s*['"]Sides attach/i.test(coffeeFnBody),
    'predictForCoffee body must not emit a "Sides attach" forecast line');
  expect('coffee_forecast_no_extras',
    !/label:\s*['"]Extras/i.test(coffeeFnBody),
    'predictForCoffee body must not emit an "Extras" forecast line');
}

// ── 5. Coffee forecast plan-stock chips exclude food categories ─────────────
{
  // PredictionInsightCard renders chips from DRINK_SPLIT_PLAN_CATEGORIES
  // for drink_split kinds — verify that list excludes mains/sides/extras.
  const predictCardSrc = fs.readFileSync(path.join(ROOT, 'components', 'events', 'PredictionInsightCard.tsx'), 'utf8');
  const arrMatch = predictCardSrc.match(/DRINK_SPLIT_PLAN_CATEGORIES\s*=\s*\[([^\]]+)\]/);
  const arrBody  = arrMatch ? arrMatch[1] : '';
  expect('drink_split_plan_chips_no_mains',
    !/['"]mains['"]/.test(arrBody),
    'DRINK_SPLIT_PLAN_CATEGORIES must not include mains');
  expect('drink_split_plan_chips_no_sides',
    !/['"]sides['"]/.test(arrBody),
    'DRINK_SPLIT_PLAN_CATEGORIES must not include sides');
  expect('drink_split_plan_chips_no_extras',
    !/['"]extras['"]/.test(arrBody),
    'DRINK_SPLIT_PLAN_CATEGORIES must not include extras');
  expect('drink_split_plan_chips_include_hot',
    /['"]hot_drinks['"]/.test(arrBody),
    'DRINK_SPLIT_PLAN_CATEGORIES must include hot_drinks');
  expect('drink_split_plan_chips_include_cold',
    /['"]cold_drinks['"]/.test(arrBody),
    'DRINK_SPLIT_PLAN_CATEGORIES must include cold_drinks');
}

// ── 6. Forecast does not touch COGS ─────────────────────────────────
{
  // The whole prediction engine file must contain the engine's promise
  // (don't read cost_of_goods, unit_cost, …). Use the documentation
  // banner as a regression sentinel.
  expect('engine_documents_no_cogs_promise',
    /do NOT read product unit_cost/.test(predictSrc),
    'predictionEngine.ts must document the no-COGS-touch invariant');
  // And the canonical revenue accessor must explicitly avoid cost_of_goods.
  expect('engine_revenue_avoids_cost_of_goods',
    /Never uses cost_of_goods/.test(predictSrc),
    'predictionEngine.ts must annotate that revenue calc never uses cost_of_goods');
}

// ── 7. Upcoming events excluded from history ────────────────────────────
{
  const obsSrc = fs.readFileSync(path.join(ROOT, 'lib', 'queries', 'eventObservations.ts'), 'utf8');
  expect('observations_filter_only_accepted',
    /\.eq\(['"]status['"],\s*['"]accepted['"]/.test(obsSrc),
    'eventObservations query must filter status=accepted only');
  expect('observations_exclude_future_events',
    /endISO\s*<\s*todayISO/.test(obsSrc),
    'eventObservations must filter out future / not-yet-completed events');
}

// ── 8. Event detail wires loading flags through to the card ──────────────
{
  const eventSrc = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'events', '[id]', 'index.tsx'), 'utf8');
  expect('event_detail_passes_profile_loading_flag',
    /isProfileLoading=\{profileLoading\}/.test(eventSrc),
    'event detail must pass isProfileLoading to PredictionInsightCard');
  expect('event_detail_passes_profile_error_flag',
    /isProfileError=\{profileError\}/.test(eventSrc),
    'event detail must pass isProfileError to PredictionInsightCard');
  expect('event_detail_passes_profile_loaded_flag',
    /isProfileLoaded=\{profileLoaded\}/.test(eventSrc),
    'event detail must pass isProfileLoaded to PredictionInsightCard');
}

// ── Reporter ─────────────────────────────────────────────────────
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
