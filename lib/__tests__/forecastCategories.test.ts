/**
 * Tests for forecast category customisation (Settings → Forecast categories).
 *
 * The user can hide individual plan-stock categories; prefs live in
 * profile.custom_metrics as forecast_cat_<category> entries. Hiding is
 * render-time only — the prediction engine's output is untouched.
 *
 * Run with:  npx tsx lib/__tests__/forecastCategories.test.ts
 */
import * as fs from 'fs';
import * as path from 'path';

interface Test { name: string; pass: boolean; detail: string }
const results: Test[] = [];
function expect(name: string, cond: boolean, detail: string = '') {
  results.push({ name, pass: cond, detail });
}

import { TRADE_CATEGORIES } from '../../types/cogs';

// ── 1. Trade defaults match the launch spec ──────────────────────────────────
expect('coffee_defaults',
  JSON.stringify(TRADE_CATEGORIES.Coffee) === JSON.stringify(['hot_drinks', 'cold_drinks', 'specials', 'bakes', 'other']),
  TRADE_CATEGORIES.Coffee.join(','));
expect('burgers_defaults',
  JSON.stringify(TRADE_CATEGORIES.Burgers) === JSON.stringify(['mains', 'sides', 'drinks', 'specials', 'extras', 'other']),
  TRADE_CATEGORIES.Burgers.join(','));
expect('pizza_defaults',
  JSON.stringify(TRADE_CATEGORIES.Pizza) === JSON.stringify(['mains', 'sides', 'drinks', 'specials', 'extras', 'other']),
  TRADE_CATEGORIES.Pizza.join(','));
expect('ice_cream_has_toppings_and_desserts',
  TRADE_CATEGORIES['Ice Cream'].includes('ice_cream')
  && TRADE_CATEGORIES['Ice Cream'].includes('desserts')
  && TRADE_CATEGORIES['Ice Cream'].includes('toppings'),
  TRADE_CATEGORIES['Ice Cream'].join(','));
expect('bakery_has_bakes',
  TRADE_CATEGORIES.Bakery.includes('bakes'),
  TRADE_CATEGORIES.Bakery.join(','));
expect('general_other_defaults',
  JSON.stringify(TRADE_CATEGORIES.Other) === JSON.stringify(['mains', 'sides', 'drinks', 'specials', 'extras', 'other']),
  TRADE_CATEGORIES.Other.join(','));

// ── 2. File-content invariants ────────────────────────────────────────────────
const ROOT = path.join(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const settingsSrc = read('app/(tabs)/settings.tsx');
const eventSrc    = read('app/(tabs)/events/[id]/index.tsx');
const cardSrc     = read('components/events/PredictionInsightCard.tsx');

expect('settings_builds_category_prefs_from_trade',
  settingsSrc.includes('forecastCategoryPrefs') && settingsSrc.includes('TRADE_CATEGORIES[businessType]'),
  'Settings must derive the category list from the CURRENT trade type');

expect('settings_category_ids_namespaced',
  settingsSrc.includes('forecast_cat_'),
  'category prefs must use the forecast_cat_ id prefix');

expect('settings_saves_category_prefs',
  settingsSrc.includes('...forecastCategoryPrefs,'),
  'handleSave must persist category prefs into custom_metrics');

expect('settings_hydration_separates_cat_prefs',
  settingsSrc.includes("!m.id.startsWith('forecast_cat_')"),
  'display prefs and category prefs must not mix in the toggles list');

expect('settings_categories_default_visible',
  settingsSrc.includes('saved?.enabled ?? true'),
  'categories with no saved pref must default to visible');

expect('settings_renders_category_section',
  settingsSrc.includes('FORECAST CATEGORIES'),
  'Settings must render the category toggle section');

expect('event_detail_extracts_hidden_categories',
  eventSrc.includes('hiddenCategories') && eventSrc.includes("m.enabled === false"),
  'event detail must extract only explicitly-disabled categories');

expect('card_filters_at_render_time_only',
  cardSrc.includes('basePlanCategories.filter((cat) => !hiddenCategories.includes(cat))'),
  'hiding must filter the render list, never the engine output');

expect('card_defaults_to_no_hidden',
  cardSrc.includes('forecastPrefs?.hiddenCategories ?? []'),
  'missing prefs must mean nothing hidden');

expect('engine_untouched_by_prefs',
  !read('lib/predictionEngine.ts').includes('forecast_cat_'),
  'the prediction engine must know nothing about display prefs');

// ── Report ────────────────────────────────────────────────────────────────────
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass);
const width = Math.max(...results.map(r => r.name.length));
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name.padEnd(width + 2)}${r.detail ? ' ' + r.detail : ''}`);
}
console.log(`\n${passed} passed, ${failed.length} failed`);
if (failed.length > 0) process.exit(1);
