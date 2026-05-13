// Phase 2 fix invariants.
//
// File-content tests for the profile persistence fixes, forecast
// customisation wiring, and Settings initial-state corrections.
// Run with:
//   npx tsx lib/__tests__/profileFixes.test.ts

import * as fs from 'fs';
import * as path from 'path';

interface Test { name: string; pass: boolean; detail: string }
const results: Test[] = [];
function expect(name: string, cond: boolean, detail: string) {
  results.push({ name, pass: cond, detail });
}

const ROOT = path.join(__dirname, '..', '..');

const profileSrc   = fs.readFileSync(path.join(ROOT, 'lib', 'queries', 'profile.ts'),                           'utf8');
const settingsSrc  = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'settings.tsx'),                          'utf8');
const eventSrc     = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'events', '[id]', 'index.tsx'),           'utf8');
const predictSrc   = fs.readFileSync(path.join(ROOT, 'components', 'events', 'PredictionInsightCard.tsx'),      'utf8');

// ── 1. Self-heal uses UPSERT, not INSERT ─────────────────────────────────────
// The self-heal path must use upsert (ON CONFLICT DO UPDATE) so a race condition
// — the profile row created between our SELECT and the write — doesn't produce
// a duplicate-key error and leave the user stranded on an error state.
{
  // (a) upsert is called in the self-heal block
  expect('profile_selfheal_uses_upsert',
    /PGRST116[\s\S]{0,400}upsert/.test(profileSrc),
    'self-heal must call upsert when PGRST116 (no rows) is returned');

  // (b) 'insert' (without 'upsert') must not appear in the PGRST116 block.
  //     We look for the pattern "PGRST116 ... insert" but NOT "upsert",
  //     confirming that 'insert' was replaced with 'upsert'.
  const noRawInsertInHeal =
    !/PGRST116[\s\S]{0,400}\.insert\(/.test(profileSrc);
  expect('profile_selfheal_no_raw_insert',
    noRawInsertInHeal,
    'self-heal must not use .insert() — replaced by .upsert() to handle race conditions');
}

// ── 2. Settings initial businessType state is not hard-coded to Coffee ────────
// Previously useState('Coffee') showed Coffee as selected even when the profile
// was erroring and hadn't loaded — misleading the user into thinking their trade
// type was persisted. Changed to useState('') so no chip is pre-selected.
{
  expect('settings_no_coffee_initial_state',
    !/useState\(['"]Coffee['"]\)/.test(settingsSrc),
    'Settings initial businessType useState must not default to "Coffee" — use ""');

  // The empty string initial state must be present.
  expect('settings_empty_string_initial_businessType',
    /const \[businessType, setBusinessType\] = useState\(['"]['"]\)/.test(settingsSrc),
    'Settings must initialise businessType state with empty string ""');
}

// ── 3. Settings validates businessType before save ────────────────────────────
// Without this check, a user who hits Save without selecting a trade type would
// write businessType='' to the DB, collapsing all downstream consumers to 'Other'.
{
  expect('settings_validates_business_type',
    /!businessType[\s\S]{0,200}Alert/.test(settingsSrc),
    'handleSave must guard against empty businessType with an Alert');
}

// ── 4. Settings handleRefresh resets hydratedRef ─────────────────────────────
// A pull-to-refresh is an explicit request for fresh server data. Resetting
// hydratedRef before the refetch ensures the form re-hydrates from the new
// profile values (critical for recovering from a profile error state).
{
  expect('settings_refresh_resets_hydratedRef',
    /handleRefresh[\s\S]{0,200}hydratedRef\.current\s*=\s*false/.test(settingsSrc),
    'handleRefresh must reset hydratedRef.current before refetching');
}

// ── 5. Settings has FORECAST PREFERENCES section ─────────────────────────────
// Part 5: per-trader forecast customisation. Must be rendered in Settings and
// stored in custom_metrics (forecast_* prefix) alongside dashboard metrics.
{
  expect('settings_has_forecast_prefs_section',
    /FORECAST PREFERENCES/.test(settingsSrc),
    'Settings must render a FORECAST PREFERENCES section');

  expect('settings_has_default_forecast_prefs',
    /DEFAULT_FORECAST_PREFS/.test(settingsSrc),
    'Settings must define DEFAULT_FORECAST_PREFS for first-time users');

  expect('settings_forecast_prefs_stored_with_dashboard',
    /forecastMetrics[\s\S]{0,200}metrics/.test(settingsSrc),
    'handleSave must combine dashboard metrics and forecastMetrics into custom_metrics');

  // The actual merge must appear in handleSave.
  expect('settings_forecast_prefs_merged_on_save',
    /custom_metrics.*metrics.*forecastMetrics|forecastMetrics.*metrics/.test(settingsSrc.replace(/\s+/g, ' ')),
    'custom_metrics array in handleSave must include both metrics and forecastMetrics');
}

// ── 6. Forecast prefs threaded from event detail to PredictionInsightCard ─────
{
  expect('event_detail_extracts_forecast_prefs',
    /forecastPrefs[\s\S]{0,300}forecast_weather/.test(eventSrc),
    'event detail must extract forecastPrefs from profile.custom_metrics');

  expect('event_detail_passes_forecast_prefs_to_card',
    /forecastPrefs=\{forecastPrefs\}/.test(eventSrc),
    'event detail must pass forecastPrefs prop to PredictionInsightCard');
}

// ── 7. PredictionInsightCard accepts and forwards forecast prefs ──────────────
{
  expect('predict_card_accepts_forecast_prefs_prop',
    /forecastPrefs\?:\s*\{/.test(predictSrc),
    'PredictionInsightCard must declare forecastPrefs prop');

  expect('predict_card_forwards_show_weather',
    /showWeather=\{forecastPrefs/.test(predictSrc),
    'PredictionInsightCard must forward showWeather to ForecastCard');

  expect('predict_card_forwards_show_drivers',
    /showDrivers=\{forecastPrefs/.test(predictSrc),
    'PredictionInsightCard must forward showDrivers to ForecastCard');

  expect('predict_card_forwards_show_plan_stock',
    /showPlanStock=\{forecastPrefs/.test(predictSrc),
    'PredictionInsightCard must forward showPlanStock to ForecastCard');
}

// ── 8. ForecastCard conditionally renders sections ────────────────────────────
{
  expect('forecast_card_conditional_weather',
    /showWeather[\s\S]{0,200}Weather impact/.test(predictSrc),
    'ForecastCard must gate weather impact strip on showWeather prop');

  expect('forecast_card_conditional_drivers',
    /showDrivers[\s\S]{0,200}result\.drivers/.test(predictSrc),
    'ForecastCard must gate drivers list on showDrivers prop');

  expect('forecast_card_conditional_plan_stock',
    /showPlanStock[\s\S]{0,300}PLAN STOCK FOR/.test(predictSrc),
    'ForecastCard must gate plan-stock strip on showPlanStock prop');
}

// ── Reporter ────────────────────────────────────────────────────────────────
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
