// Event-screen crash hardening — the "LIV Golf" force-close.
//
// Root cause (verified empirically against date-fns 3.6.0 in this repo):
// events.end_date is persisted with no relationship validation against
// events.date. DailyTakingsCard and WeatherCard both expanded the raw
// date..end_date interval with eachDayOfInterval and rendered / requested
// one entry per day. date-fns v3 does NOT throw on reversed or absurd
// intervals — a typo'd end-date year (e.g. 2062 for 2026) silently
// returns ~13,000 Date objects, the screen mounts thousands of rows
// (many containing TextInputs), and the OS watchdog force-closes the app
// with no JS error. LIV Golf was the only multi-day event, so it was the
// only event that rendered DailyTakingsCard and hit the expansion.
//
// The fix: all event day-range expansion goes through safeEventDays()
// (bounded, total, flag-carrying), the event form now rejects bad end
// dates at entry, and the weather/forecast/daily-takings sections sit
// behind SectionErrorBoundary as secondary protection.
//
// Run with: npx tsx lib/__tests__/eventCrash.test.ts

import * as fs from 'fs';
import * as path from 'path';
import { safeEventDays } from '../dates';
import { predictDrinkSplit } from '../drinkSplitEngine';
import { eventSchema } from '../validations/event.schema';

interface Test { name: string; pass: boolean; detail: string }
const results: Test[] = [];
function expect(name: string, cond: boolean, detail: string) {
  results.push({ name, pass: cond, detail });
}

const ROOT = path.join(__dirname, '..', '..');
const read = (...p: string[]) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

// ── 1. safeEventDays: normal shapes ──────────────────────────────────

{
  const r = safeEventDays('2026-07-17', '2026-07-19');
  expect('range_normal_three_days',
    r.days.length === 3 && r.days[0] === '2026-07-17' && r.days[2] === '2026-07-19'
      && !r.clamped && !r.invalid && !r.reversed,
    `3-day event expands to exactly 3 days, no flags (got ${r.days.length})`);
}

{
  const r = safeEventDays('2026-07-17', undefined);
  expect('range_no_end_date_single_day',
    r.days.length === 1 && r.days[0] === '2026-07-17' && !r.invalid,
    'missing end_date → single day, not an error');
}

{
  const r = safeEventDays('2026-07-17', '2026-07-17');
  expect('range_same_day_single_day',
    r.days.length === 1 && r.days[0] === '2026-07-17',
    'end_date === date → single day');
}

// ── 2. safeEventDays: hostile shapes (the crash class) ───────────────

{
  // THE LIV GOLF SCENARIO: a multi-day event whose end_date carries a
  // typo'd year (2062 instead of 2026). Before the fix this expanded to
  // 13,153 days and the event screen rendered thousands of rows until
  // iOS killed the app. It must now clamp to the 31-day ceiling and
  // flag the clamp so the UI can tell the user to fix the dates.
  const r = safeEventDays('2026-07-17', '2062-07-19', 31);
  expect('LIV_GOLF_regression_typo_year_clamped',
    r.days.length === 31 && r.clamped && r.requestedSpanDays > 13000,
    `typo-year end date clamps to 31 days (got ${r.days.length}, requested span ${r.requestedSpanDays})`);
  expect('LIV_GOLF_regression_starts_at_event_start',
    r.days[0] === '2026-07-17',
    'clamped range still starts on the real event start date');
}

{
  // Same scenario at the WeatherCard bound (14 days).
  const r = safeEventDays('2026-07-17', '2062-07-19', 14);
  expect('LIV_GOLF_regression_weather_window_bounded',
    r.days.length === 14 && r.clamped,
    `weather API window is at most 14 days even with a typo'd end year (got ${r.days.length})`);
}

{
  const r = safeEventDays('2026-07-19', '2026-07-17');
  expect('range_reversed_swapped',
    r.days.length === 3 && r.reversed && r.days[0] === '2026-07-17',
    'end before start → swapped and flagged, never an exception or empty render');
}

{
  const r = safeEventDays('not-a-date', '2026-07-19');
  expect('range_invalid_start_empty_and_flagged',
    r.days.length === 0 && r.invalid,
    'unparseable start → empty day list + invalid flag (nothing to render, no crash)');
}

{
  const r = safeEventDays('2026-07-17', 'garbage');
  expect('range_invalid_end_falls_back_to_start',
    r.days.length === 1 && r.days[0] === '2026-07-17' && r.invalid,
    'unparseable end → single-day fallback + invalid flag');
}

{
  const r31 = safeEventDays('2026-07-01', '2026-07-31', 31);
  const r32 = safeEventDays('2026-07-01', '2026-08-01', 31);
  expect('range_boundary_31_not_clamped_32_clamped',
    r31.days.length === 31 && !r31.clamped && r32.days.length === 31 && r32.clamped,
    'exactly maxDays passes untouched; maxDays+1 clamps');
}

{
  const r = safeEventDays(null, null);
  expect('range_null_inputs_safe',
    r.days.length === 0 && r.invalid,
    'null/null → empty + invalid, no throw');
}

// ── 3. Prediction engine: NaN / hostile forecast temperature ─────────

{
  // A weather fetch that produced no finite temps used to be able to hand
  // NaN downstream. The engine must still return finite Hot/Iced values
  // that sum to 100.
  const pred = predictDrinkSplit(NaN, [], []);
  expect('prediction_nan_temp_finite_split',
    Number.isFinite(pred.hotPct) && Number.isFinite(pred.icedPct),
    `NaN forecast temp → finite hot/iced (got hot=${pred.hotPct}, iced=${pred.icedPct})`);
  expect('prediction_nan_temp_sums_100',
    pred.hotPct + pred.icedPct === 100 && pred.hotPct >= 0 && pred.hotPct <= 100,
    'hot + iced = 100 and both within 0..100 even on NaN input');
}

{
  const cold = predictDrinkSplit(-5, [], []);
  const hot = predictDrinkSplit(35, [], []);
  expect('prediction_extreme_temps_clamped',
    cold.hotPct + cold.icedPct === 100 && hot.hotPct + hot.icedPct === 100
      && cold.hotPct > hot.hotPct,
    'extreme temps stay valid and directionally sane (colder → more hot drinks)');
}

// ── 4. Event form schema: bad end dates rejected at entry ────────────

const BASE_EVENT = {
  name: 'LIV Golf', date: '2026-07-17', location: 'JCB Golf & Country Club',
  status: 'accepted' as const,
  gross_sales: 0, zero_rated_sales: 0, standard_rated_sales: 0,
  concessions_commission_pct: 0, pitch_fee_refund_pct: 0,
  cost_of_goods: 0, pitch_fee: 0, power_fee: 0, travel_costs: 0,
  camping_costs: 0, equipment_costs: 0, other_costs: 0, staffing_costs: 0,
  fresh_milk_litres: 0, alt_milk_litres: 0,
};

{
  const ok = eventSchema.safeParse({ ...BASE_EVENT, end_date: '2026-07-19' });
  expect('schema_accepts_valid_multiday',
    ok.success, 'a normal 3-day event passes validation');
}

{
  const typo = eventSchema.safeParse({ ...BASE_EVENT, end_date: '2062-07-19' });
  expect('schema_rejects_typo_year_span',
    !typo.success
      && typo.error!.issues.some((i) => i.path.includes('end_date') && /at most/.test(i.message)),
    'the LIV Golf typo-year end date is now rejected at the form with a span message');
}

{
  const reversed = eventSchema.safeParse({ ...BASE_EVENT, end_date: '2026-07-10' });
  expect('schema_rejects_end_before_start',
    !reversed.success
      && reversed.error!.issues.some((i) => i.path.includes('end_date') && /on or after/.test(i.message)),
    'end date before start date is rejected with a clear message');
}

{
  const uk = eventSchema.safeParse({ ...BASE_EVENT, date: '17/07/2026', end_date: '19/07/2026' });
  expect('schema_accepts_uk_format_dates',
    uk.success, 'dd/mm/yyyy form values (pre-ukToIso) still validate correctly');
  const ukBad = eventSchema.safeParse({ ...BASE_EVENT, date: '17/07/2026', end_date: '19/07/2062' });
  expect('schema_rejects_uk_format_typo_year',
    !ukBad.success, 'dd/mm/yyyy typo-year end date is also rejected');
}

{
  const noEnd = eventSchema.safeParse({ ...BASE_EVENT });
  expect('schema_end_date_still_optional',
    noEnd.success, 'single-day events (no end_date) remain valid');
}

// ── 5. Source invariants: the fix stays wired in ─────────────────────

const dailySrc = read('components', 'events', 'DailyTakingsCard.tsx');
const weatherSrc = read('components', 'events', 'WeatherCard.tsx');
const detailSrc = read('app', '(tabs)', 'events', '[id]', 'index.tsx');
const boundarySrc = read('components', 'shared', 'SectionErrorBoundary.tsx');
const datesSrc = read('lib', 'dates.ts');

expect('daily_takings_uses_bounded_expansion',
  /safeEventDays\(startDate, endDate/.test(dailySrc) && !/eachDayOfInterval/.test(dailySrc),
  'DailyTakingsCard expands days via safeEventDays, never raw eachDayOfInterval');

expect('daily_takings_surfaces_clamp_notice',
  /range\.clamped \|\| range\.invalid/.test(dailySrc),
  'DailyTakingsCard tells the user when the range was clamped or invalid');

expect('weather_uses_bounded_expansion',
  /safeEventDays\(startDate, endDate \?\? startDate, 14\)/.test(weatherSrc)
    && !/eachDayOfInterval/.test(weatherSrc),
  'WeatherCard builds its day list and API window via safeEventDays(…, 14)');

expect('weather_filters_non_finite_temps',
  /filter\(\(t\) => Number\.isFinite\(t\)\)/.test(weatherSrc),
  'WeatherCard drops non-finite temps before averaging (NaN cannot reach the forecast)');

expect('weather_has_finite_fallback_avg',
  /temps\.length > 0 \? [^:]+ : 15/.test(weatherSrc),
  'average temperature falls back to a finite default when no temps survive');

expect('event_detail_boundary_weather',
  /<SectionErrorBoundary section="weather-forecast"/.test(detailSrc),
  'event detail wraps WeatherCard in SectionErrorBoundary');

expect('event_detail_boundary_forecast',
  /<SectionErrorBoundary section="demand-forecast"/.test(detailSrc),
  'event detail wraps PredictionInsightCard in SectionErrorBoundary');

expect('event_detail_boundary_daily_takings',
  /<SectionErrorBoundary section="daily-takings"/.test(detailSrc),
  'event detail wraps DailyTakingsCard in SectionErrorBoundary');

expect('boundary_logging_dev_gated_and_sanitised',
  /__DEV__/.test(boundarySrc) && /error\.name/.test(boundarySrc)
    && !/JSON\.stringify/.test(boundarySrc),
  'boundary logs only error type/message, only in dev — never event or financial data');

expect('safe_event_days_documents_root_cause',
  /LIV Golf/.test(datesSrc) && /watchdog/.test(datesSrc),
  'lib/dates.ts records why the bound exists so it is not refactored away');

// ── Reporter ──────────────────────────────────
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
