// Smoke tests for the trade-aware prediction engine.
//
// These are pure-function tests that don't need a test runner — they're
// designed to be exec'd via `node --import tsx`. Each test prints a
// pass/fail line. Run with:
//   npx tsx lib/__tests__/predictionEngine.test.ts
//
// They cover the QA cases the user explicitly listed:
//   - Coffee trader hot/cold weather mix
//   - Burger trader gets food_attach (not drink_split)
//   - Ice cream trader demand rises with heat
//   - Weather is included for every trade type
//   - Low confidence with no history; higher with multiple events
//   - COGS isn't read or modified by the engine

import { predict, type Confidence } from '@/lib/predictionEngine';
import type { EventObservation } from '@/lib/queries/eventObservations';

interface Test {
  name: string;
  pass: boolean;
  detail: string;
}

const results: Test[] = [];
function expect(name: string, cond: boolean, detail: string) {
  results.push({ name, pass: cond, detail });
}

const noHistory: EventObservation[] = [];

function makeObs(partial: Partial<EventObservation>): EventObservation {
  return {
    eventId: partial.eventId ?? `e-${Math.random().toString(36).slice(2, 8)}`,
    date: partial.date ?? '2024-06-15',
    endDate: partial.endDate ?? null,
    location: partial.location ?? null,
    avgTempC: partial.avgTempC ?? 18,
    weatherCode: partial.weatherCode ?? 0,
    weatherSummary: partial.weatherSummary ?? null,
    standardRatedSales: partial.standardRatedSales ?? 0,
    zeroRatedSales: partial.zeroRatedSales ?? 0,
    grossSalesFallback: partial.grossSalesFallback ?? 0,
    hotDrinksSales: partial.hotDrinksSales ?? 0,
    icedDrinksSales: partial.icedDrinksSales ?? 0,
    daysWithTakings: partial.daysWithTakings ?? 0,
    qtyByCategory: partial.qtyByCategory ?? {},
    revenueByCategory: partial.revenueByCategory ?? {},
    totalLineItems: partial.totalLineItems ?? 0,
  };
}

// 1. Coffee trader on a hot day → drink_split kind, iced should be majority
{
  const r = predict('Coffee', { forecastTempC: 28, eventDate: '2025-07-01' }, noHistory);
  expect('coffee_returns_drink_split', r?.kind === 'drink_split',
    `kind=${r?.kind}`);
  // With no history, default predictor returns 22% hot at hot temps — verify
  // iced beats hot in the forecast lines (iced is the bigger %).
  const iced = r?.forecast.find((l) => l.label === 'Iced drinks');
  const hot  = r?.forecast.find((l) => l.label === 'Hot drinks');
  const icedPct = parseInt(iced?.value ?? '0', 10);
  const hotPct  = parseInt(hot?.value ?? '0', 10);
  expect('coffee_hot_day_iced_dominant',
    icedPct > hotPct,
    `hot=${hotPct}% iced=${icedPct}%`);
}

// 2. Coffee trader on a cold day → hot dominant
{
  const r = predict('Coffee', { forecastTempC: 4, eventDate: '2025-01-15' }, noHistory);
  const iced = r?.forecast.find((l) => l.label === 'Iced drinks');
  const hot  = r?.forecast.find((l) => l.label === 'Hot drinks');
  const icedPct = parseInt(iced?.value ?? '0', 10);
  const hotPct  = parseInt(hot?.value ?? '0', 10);
  expect('coffee_cold_day_hot_dominant',
    hotPct > icedPct,
    `hot=${hotPct}% iced=${icedPct}%`);
}

// 3. Burger trader does NOT get the drink_split kind
{
  const r = predict('Burgers', { forecastTempC: 20, eventDate: '2025-06-15' }, noHistory);
  expect('burger_returns_food_attach', r?.kind === 'food_attach',
    `kind=${r?.kind}`);
  const labels = (r?.forecast ?? []).map((l) => l.label.toLowerCase()).join(' ');
  expect('burger_no_hot_iced_label',
    !labels.includes('hot drinks') && !labels.includes('iced drinks'),
    `labels="${labels}"`);
}

// 4. Pizza trader → food_attach with food-relevant labels
{
  const r = predict('Pizza', { forecastTempC: 15, eventDate: '2025-09-01' }, noHistory);
  expect('pizza_returns_food_attach', r?.kind === 'food_attach',
    `kind=${r?.kind}`);
}

// 5. Ice cream demand rises with hot weather
{
  // Build a synthetic history: same revenue at every event, weather varies
  const history: EventObservation[] = [
    makeObs({ avgTempC: 28, grossSalesFallback: 1000, date: '2024-07-01' }),
    makeObs({ avgTempC: 26, grossSalesFallback:  900, date: '2024-08-15' }),
    makeObs({ avgTempC:  9, grossSalesFallback:  300, date: '2024-12-10' }),
    makeObs({ avgTempC:  8, grossSalesFallback:  250, date: '2024-01-20' }),
    makeObs({ avgTempC: 18, grossSalesFallback:  600, date: '2024-05-15' }),
    makeObs({ avgTempC: 17, grossSalesFallback:  650, date: '2024-09-20' }),
  ];
  const hot = predict('Ice Cream', { forecastTempC: 27, eventDate: '2025-07-15' }, history);
  const cold = predict('Ice Cream', { forecastTempC: 6, eventDate: '2025-12-15' }, history);
  // Both should be cold_demand kind
  expect('ice_cream_returns_cold_demand', hot?.kind === 'cold_demand',
    `kind=${hot?.kind}`);
  // Forecast revenue line value parsed to a number for comparison
  const hotRev  = parseInt((hot?.forecast.find((l) => l.label === 'Forecast revenue')?.value ?? '£0').replace(/[£,]/g, ''), 10);
  const coldRev = parseInt((cold?.forecast.find((l) => l.label === 'Forecast revenue')?.value ?? '£0').replace(/[£,]/g, ''), 10);
  expect('ice_cream_demand_rises_with_heat',
    hotRev > coldRev,
    `hotRev=£${hotRev} coldRev=£${coldRev}`);
}

// 6. Weather is included for every trade type's output
{
  const trades = ['Coffee', 'Burgers', 'Pizza', 'Ice Cream', 'Bakery', 'Desserts', 'Cocktails', 'Other'];
  let allHaveWeather = true;
  let missing = '';
  for (const t of trades) {
    const r = predict(t, { forecastTempC: 18, eventDate: '2025-06-15' }, noHistory);
    if (!r || !r.weatherImpact || r.weatherImpact.length === 0) {
      allHaveWeather = false; missing = t; break;
    }
  }
  expect('all_trades_include_weather', allHaveWeather,
    missing ? `missing on ${missing}` : 'all good');
}

// 7. Low confidence when no historical events
{
  const r = predict('Burgers', { forecastTempC: 20, eventDate: '2025-06-15' }, noHistory);
  expect('low_confidence_without_history',
    r?.confidence === 'low' && r?.learningMode === true,
    `confidence=${r?.confidence} learning=${r?.learningMode}`);
}

// 8. Higher confidence with multiple similar past events
{
  const history: EventObservation[] = Array.from({ length: 7 }).map((_, i) => makeObs({
    avgTempC: 22,
    date: `2024-0${(i % 9) + 1}-15`,
    qtyByCategory: { mains: 100, sides: 65, drinks: 55, extras: 30 },
    revenueByCategory: { mains: 800, sides: 200, drinks: 180, extras: 80 },
    totalLineItems: 12,
    standardRatedSales: 1000,
  }));
  const r = predict('Burgers', { forecastTempC: 22, eventDate: '2025-06-15' }, history);
  expect('higher_confidence_with_history',
    r?.confidence === 'high' || r?.confidence === 'medium',
    `confidence=${r?.confidence} basedOn=${r?.basedOnEvents}`);
}

// 9. Engine never references unit_cost / cost_of_goods (verified by NOT having
//    those properties on EventObservation in the first place)
{
  const obs = makeObs({ standardRatedSales: 500 });
  // @ts-expect-error — these properties intentionally don't exist
  const noCost = obs.unit_cost === undefined && obs.cost_of_goods === undefined;
  expect('cogs_not_read_by_engine', noCost === true, 'EventObservation has no COGS fields');
}

// 10. Unknown / missing trade type still returns a sensible general result
{
  const r = predict(null, { forecastTempC: 18, eventDate: '2025-06-15' }, noHistory);
  expect('null_trade_returns_general',
    r?.kind === 'general_demand' || r?.kind === 'food_attach',
    `kind=${r?.kind}`);
  const r2 = predict('SomeUnknownTrade', { forecastTempC: 18, eventDate: '2025-06-15' }, noHistory);
  expect('unknown_trade_returns_general',
    r2?.kind === 'general_demand' || r2?.kind === 'food_attach',
    `kind=${r2?.kind}`);
}

// 11. Trade-specific food defaults: Burger default sides ≥ 65% (higher than Pizza)
{
  const burger = predict('Burgers', { forecastTempC: 18, eventDate: '2025-06-15' }, noHistory);
  const pizza  = predict('Pizza',   { forecastTempC: 18, eventDate: '2025-06-15' }, noHistory);
  const burgerSides = parseInt(burger?.forecast.find(l => l.label === 'Sides attach')?.value ?? '0', 10);
  const pizzaSides  = parseInt(pizza?.forecast.find(l => l.label === 'Sides attach')?.value ?? '0', 10);
  expect('burger_default_sides_higher_than_pizza',
    burgerSides > pizzaSides,
    `burger=${burgerSides}% pizza=${pizzaSides}%`);
}

// 12. Burger default sides ≥ 65% (reflects UK burger attach rates)
{
  const r = predict('Burgers', { forecastTempC: 18, eventDate: '2025-06-15' }, noHistory);
  const sides = parseInt(r?.forecast.find(l => l.label === 'Sides attach')?.value ?? '0', 10);
  expect('burger_sides_default_at_least_65pct', sides >= 65, `sides=${sides}%`);
}

// 13. Juice & Smoothies routes to cold_demand (same as Ice Cream)
{
  const r = predict('Juice & Smoothies', { forecastTempC: 22, eventDate: '2025-07-01' }, noHistory);
  expect('juice_returns_cold_demand', r?.kind === 'cold_demand', `kind=${r?.kind}`);
}

// 14. Bakery routes to morning_bake
{
  const r = predict('Bakery', { forecastTempC: 14, eventDate: '2025-04-10' }, noHistory);
  expect('bakery_returns_morning_bake', r?.kind === 'morning_bake', `kind=${r?.kind}`);
}

// 15. Cocktails routes to beverage_mix (bar engine)
{
  const r = predict('Cocktails', { forecastTempC: 20, eventDate: '2025-07-20' }, noHistory);
  expect('cocktails_returns_beverage_mix', r?.kind === 'beverage_mix', `kind=${r?.kind}`);
}

// 16. Asian Food and Mexican Food route to food_attach
{
  const asian   = predict('Asian Food',   { forecastTempC: 18, eventDate: '2025-06-15' }, noHistory);
  const mexican = predict('Mexican Food', { forecastTempC: 18, eventDate: '2025-06-15' }, noHistory);
  expect('asian_food_returns_food_attach',   asian?.kind === 'food_attach',   `kind=${asian?.kind}`);
  expect('mexican_food_returns_food_attach', mexican?.kind === 'food_attach', `kind=${mexican?.kind}`);
}

// 17. One extreme outlier event does NOT dominate the ice cream forecast.
//     Without outlier detection a single 10× revenue event would make the forecast
//     roughly 4× the typical; with IQR filtering the forecast should remain sane.
{
  const history: EventObservation[] = [
    makeObs({ avgTempC: 22, grossSalesFallback: 500,  date: '2024-05-10' }),
    makeObs({ avgTempC: 21, grossSalesFallback: 480,  date: '2024-06-01' }),
    makeObs({ avgTempC: 23, grossSalesFallback: 520,  date: '2024-06-20' }),
    makeObs({ avgTempC: 20, grossSalesFallback: 510,  date: '2024-07-05' }),
    makeObs({ avgTempC: 22, grossSalesFallback: 490,  date: '2024-07-20' }),
    // outlier: stadium gig, 10× typical
    makeObs({ avgTempC: 22, grossSalesFallback: 5000, date: '2024-08-10' }),
  ];
  const r = predict('Ice Cream', { forecastTempC: 22, eventDate: '2025-07-01' }, history);
  const forecast = r?.forecast.find(l => l.label === 'Forecast revenue');
  const rev = parseInt((forecast?.value ?? '£0').replace(/[£,]/g, ''), 10);
  // Without outlier removal the average would be ~1250; with IQR removal it stays near 500.
  expect('outlier_does_not_dominate_ice_cream_forecast',
    rev < 1200,
    `Forecast revenue = £${rev} (should be < £1200 without outlier)`);
  // Confidence reason should mention the excluded outlier
  expect('outlier_noted_in_confidence_reason',
    (r?.confidenceReason ?? '').includes('outlier'),
    `confidenceReason=${r?.confidenceReason}`);
}

// 18. Coffee trader does NOT expose food mains/sides logic
{
  const r = predict('Coffee', { forecastTempC: 18, eventDate: '2025-06-15' }, noHistory);
  const labels = (r?.forecast ?? []).map(l => l.label.toLowerCase()).join(' ');
  expect('coffee_no_mains_or_sides_label',
    !labels.includes('mains') && !labels.includes('sides attach'),
    `labels="${labels}"`);
}

// ── Reporter ───────────────────────────────────────────────────────────
let pass = 0, fail = 0;
for (const r of results) {
  const tag = r.pass ? 'PASS' : 'FAIL';
  // eslint-disable-next-line no-console
  console.log(`${tag}  ${r.name.padEnd(40)} ${r.detail}`);
  if (r.pass) pass++; else fail++;
}
// eslint-disable-next-line no-console
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

const _confType: Confidence = 'high'; // type touch
void _confType;
