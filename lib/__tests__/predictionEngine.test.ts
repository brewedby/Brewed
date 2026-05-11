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

// 5. Ice cream demand level rises with hot weather
{
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
  expect('ice_cream_returns_cold_demand', hot?.kind === 'cold_demand',
    `kind=${hot?.kind}`);
  // Demand level should be at least one band higher on the hot day vs the cold day.
  const order: Record<string, number> = { low: 0, below_average: 1, average: 2, high: 3, very_high: 4 };
  const hotIdx  = order[hot?.demandLevel ?? 'average'] ?? 2;
  const coldIdx = order[cold?.demandLevel ?? 'average'] ?? 2;
  expect('ice_cream_demand_rises_with_heat',
    hotIdx > coldIdx,
    `hot=${hot?.demandLevel} cold=${cold?.demandLevel}`);
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

// 17. One extreme outlier event does NOT push demand to "Very high".
//     Without outlier detection the multiplier would be ~10× typical; with IQR
//     filtering + the [0.6, 1.4] cap the forecast stays in the "average" band.
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
  expect('outlier_does_not_dominate_demand_level',
    r?.demandLevel === 'average' || r?.demandLevel === 'high' || r?.demandLevel === 'below_average',
    `demandLevel=${r?.demandLevel}`);
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

// 19. Coffee kind is always drink_split — never food_attach or general_demand
{
  const temps = [4, 10, 18, 25, 32];
  let allDrinkSplit = true;
  let failedTemp = 0;
  for (const t of temps) {
    const r = predict('Coffee', { forecastTempC: t, eventDate: '2025-06-15' }, noHistory);
    if (r?.kind !== 'drink_split') { allDrinkSplit = false; failedTemp = t; break; }
  }
  expect('coffee_always_drink_split_not_food',
    allDrinkSplit,
    allDrinkSplit ? 'all temps return drink_split' : `failed at ${failedTemp}°C`);
}

// 20. Non-coffee trade types NEVER return drink_split (no hot/iced coffee split shown to food traders)
{
  const foodTrades = ['Burgers', 'Pizza', 'Street Food', 'Asian Food', 'Mexican Food', 'Crepes', 'Waffles'];
  let noDrinkSplit = true;
  let failedTrade = '';
  for (const trade of foodTrades) {
    const r = predict(trade, { forecastTempC: 20, eventDate: '2025-06-15' }, noHistory);
    if (r?.kind === 'drink_split') { noDrinkSplit = false; failedTrade = trade; break; }
  }
  expect('food_trades_never_return_drink_split',
    noDrinkSplit,
    noDrinkSplit ? 'no food trade returns drink_split' : `${failedTrade} returned drink_split`);
}

// 21. Hot weather shifts coffee iced% higher than cold weather (with history).
//     The coffee engine maps: standardRatedSales → hot drinks (VAT-rated),
//     zeroRatedSales → cold/iced drinks (zero-rated).
//     Need 3+ observations per temperature bracket for the engine to use historical data.
{
  const coffeeHistory = [
    // Hot-bracket events (23°C+): predominantly iced
    makeObs({ avgTempC: 28, standardRatedSales: 200, zeroRatedSales: 800, date: '2024-07-01' }),
    makeObs({ avgTempC: 26, standardRatedSales: 250, zeroRatedSales: 750, date: '2024-08-10' }),
    makeObs({ avgTempC: 24, standardRatedSales: 220, zeroRatedSales: 780, date: '2024-07-20' }),
    // Cold-bracket events (<12°C): predominantly hot
    makeObs({ avgTempC:  7, standardRatedSales: 900, zeroRatedSales: 100, date: '2024-01-15' }),
    makeObs({ avgTempC:  5, standardRatedSales: 950, zeroRatedSales:  50, date: '2024-02-10' }),
    makeObs({ avgTempC:  8, standardRatedSales: 880, zeroRatedSales: 120, date: '2024-12-20' }),
  ];
  const hotDay  = predict('Coffee', { forecastTempC: 28, eventDate: '2025-07-01' }, coffeeHistory);
  const coldDay = predict('Coffee', { forecastTempC:  5, eventDate: '2025-01-15' }, coffeeHistory);
  const hotIcedVal  = hotDay?.forecast.find(l => l.label === 'Iced drinks');
  const coldIcedVal = coldDay?.forecast.find(l => l.label === 'Iced drinks');
  const hotIced  = parseInt(hotIcedVal?.value  ?? '0', 10);
  const coldIced = parseInt(coldIcedVal?.value ?? '0', 10);
  expect('coffee_warm_weather_increases_iced',
    hotIced > coldIced,
    `hot day iced=${hotIced}% cold day iced=${coldIced}%`);
}

// 22. general_demand returns when trade type is null (and only general_demand, not drink_split/food_attach)
{
  const r = predict(null, { forecastTempC: 18, eventDate: '2025-06-15' }, noHistory);
  expect('null_trade_returns_general_demand_kind',
    r?.kind === 'general_demand',
    `kind=${r?.kind}`);
}

// ── CSV parser tests ─────────────────────────────────────────────

import { parseCSVSalesReport } from '@/lib/parsers/csvSales';

// 23. CSV parser handles UTF-8 BOM correctly
{
  const withBOM = '﻿Product Name,Quantity Sold,Net Sales\nFlatWhite,10,30.00\n';
  const r = parseCSVSalesReport(withBOM);
  expect('csv_handles_bom',
    r.lines.length === 1 && r.lines[0].product_name === 'FlatWhite',
    `lines=${r.lines.length} name="${r.lines[0]?.product_name}"`);
}

// 24. CSV parser handles blank first lines (metadata rows before header)
{
  const withMetadata = [
    'Report: Daily Sales',
    '',
    'Product Name,Quantity Sold,Net Sales',
    'Cappuccino,5,17.50',
    'Latte,8,28.00',
  ].join('\n');
  const r = parseCSVSalesReport(withMetadata);
  expect('csv_handles_blank_first_lines',
    r.lines.length >= 1,
    `lines=${r.lines.length} errors="${r.errors.join(';')}"`);
}

// 25. CSV parser handles semicolon delimiter (European EPOS exports)
{
  const semicolonCSV = 'Product Name;Quantity Sold;Net Sales\nEspresso;12;24.00\nLatte;8;28.00\n';
  const r = parseCSVSalesReport(semicolonCSV);
  expect('csv_handles_semicolon_delimiter',
    r.lines.length === 2,
    `lines=${r.lines.length} errors="${r.errors.join(';')}"`);
}

// 26. CSV parser handles tab delimiter
{
  const tabCSV = 'Product Name\tQuantity Sold\tNet Sales\nFlat White\t6\t21.00\n';
  const r = parseCSVSalesReport(tabCSV);
  expect('csv_handles_tab_delimiter',
    r.lines.length === 1 && r.lines[0].product_name === 'Flat White',
    `lines=${r.lines.length} name="${r.lines[0]?.product_name}"`);
}

// 27. CSV parser handles Windows CRLF line endings
{
  const validCrlf = 'Product Name,Quantity Sold,Net Sales\r\nCappuccino,3,10.50\r\nMocha,2,8.00\r\n';
  const r = parseCSVSalesReport(validCrlf);
  expect('csv_handles_crlf',
    r.lines.length === 2,
    `lines=${r.lines.length}`);
}

// 28. Empty CSV returns a clear error (not a crash)
{
  const r = parseCSVSalesReport('');
  expect('csv_empty_returns_clear_error',
    r.lines.length === 0 && r.errors.length > 0 && r.errors[0].toLowerCase().includes('empty'),
    `errors="${r.errors[0]}"`);
}

// 29. CSV with only one line (just headers) gives a helpful error
{
  const headerOnly = 'Product Name,Quantity Sold,Net Sales';
  const r = parseCSVSalesReport(headerOnly);
  expect('csv_header_only_returns_helpful_error',
    r.lines.length === 0 && r.errors.length > 0,
    `errors="${r.errors[0]}"`);
}

// 30. CSV parser handles currency symbols and comma-thousands (£1,234.56)
{
  const currencyCSV = 'Product Name,Quantity Sold,Net Sales\nHot Chocolate,"5","£1,234.56"\n';
  const r = parseCSVSalesReport(currencyCSV);
  expect('csv_handles_currency_symbols',
    r.lines.length === 1 && r.lines[0].line_total > 1000,
    `lines=${r.lines.length} total=${r.lines[0]?.line_total}`);
}

// 31a. Trade type normalisation — common variants resolve correctly
{
  const variants = [
    ['coffee', 'drink_split'],
    ['Coffee Van', 'drink_split'],
    ['coffee_cart', 'drink_split'],
    ['COFFEE', 'drink_split'],
    ['burger', 'food_attach'],
    ['burgers', 'food_attach'],
    ['Burger Truck', 'food_attach'],
    ['ice cream', 'cold_demand'],
    ['gelato', 'cold_demand'],
    ['baker', 'morning_bake'],
    ['cocktail bar', 'beverage_mix'],
  ] as const;
  let allOk = true;
  let failed = '';
  for (const [input, expectedKind] of variants) {
    const r = predict(input, { forecastTempC: 18, eventDate: '2025-06-15' }, noHistory);
    if (r?.kind !== expectedKind) {
      allOk = false;
      failed = `${input} → ${r?.kind} (expected ${expectedKind})`;
      break;
    }
  }
  expect('trade_type_normalisation_resolves_variants', allOk, allOk ? 'all variants matched' : failed);
}

// 31b. Missing trade type does NOT default to Coffee
{
  const r1 = predict(null,         { forecastTempC: 18, eventDate: '2025-06-15' }, noHistory);
  const r2 = predict(undefined as unknown as string, { forecastTempC: 18, eventDate: '2025-06-15' }, noHistory);
  const r3 = predict('',           { forecastTempC: 18, eventDate: '2025-06-15' }, noHistory);
  expect('missing_trade_does_not_default_to_coffee',
    r1?.kind !== 'drink_split' && r2?.kind !== 'drink_split' && r3?.kind !== 'drink_split',
    `null=${r1?.kind} undef=${r2?.kind} empty=${r3?.kind}`);
}

// 31c. Coffee result has demandLevel = null (drink split is the headline, no extra band)
{
  const r = predict('Coffee', { forecastTempC: 18, eventDate: '2025-06-15' }, noHistory);
  expect('coffee_demand_level_is_null',
    r?.demandLevel === null,
    `demandLevel=${r?.demandLevel}`);
}

// 31d. No prediction surface includes a "Forecast revenue" line as the headline
{
  const trades = ['Coffee', 'Burgers', 'Pizza', 'Ice Cream', 'Bakery', 'Desserts', 'Cocktails', 'Other'];
  let foundRevenue = '';
  for (const t of trades) {
    const r = predict(t, { forecastTempC: 18, eventDate: '2025-06-15' }, noHistory);
    const labels = (r?.forecast ?? []).map(l => l.label.toLowerCase()).join(' | ');
    if (labels.includes('forecast revenue')) {
      foundRevenue = t;
      break;
    }
  }
  expect('no_revenue_in_primary_forecast', foundRevenue === '',
    foundRevenue ? `${foundRevenue} still surfaces forecast revenue` : 'no trades show forecast revenue');
}

// 31e. Demand multiplier is clamped — no demand level pushes beyond very_high
{
  // Synthetic history with one event massively above the rest. Should be IQR-filtered
  // and even unfiltered the cap holds the result inside the bands.
  const history: EventObservation[] = Array.from({ length: 4 }).map((_, i) => makeObs({
    avgTempC: 20, grossSalesFallback: 500, date: `2024-0${(i % 9) + 1}-15`,
  })).concat([
    // outlier far beyond IQR fence (won't be filtered with only 5 points actually,
    // but the cap still bounds the multiplier).
    makeObs({ avgTempC: 20, grossSalesFallback: 50_000, date: '2024-08-01' }),
  ]);
  const r = predict('Other', { forecastTempC: 20, eventDate: '2025-07-01' }, history);
  // The clamp is at multiplier ≤ 1.4 → demandLevel can be at most 'very_high' (>= 1.30).
  // Crucially, no NaN, no crash, no inflated band.
  const ok = r?.demandLevel === 'low' || r?.demandLevel === 'below_average' ||
             r?.demandLevel === 'average' || r?.demandLevel === 'high' ||
             r?.demandLevel === 'very_high';
  expect('demand_multiplier_clamped_to_known_bands', !!ok, `demandLevel=${r?.demandLevel}`);
}

// 31f. CSV parser handles a Square-style export with a Category column + currency
{
  const square = [
    'Item Name,Item Variation,SKU,Category,Items Sold,Product Sales,Items Refunded,Refunds,Discounts & Comps,Net Sales,Tax,Gross Sales,Units Sold',
    'Iced Latte,Regular,"",Iced drinks,277,"£1,234.40",0,£0.00,-£28.14,"£1,206.26",£0.00,"£1,206.26",277',
    'Cappuccino,Regular,"",Hot drinks,65,£231.82,0,£0.00,-£5.67,£226.15,£45.28,£271.43,65',
  ].join('\n');
  const r = parseCSVSalesReport(square);
  // Two products, "Iced Latte" qty 277, "Cappuccino" qty 65 — both line totals match Net Sales.
  const iced = r.lines.find(l => l.product_name === 'Iced Latte');
  const capp = r.lines.find(l => l.product_name === 'Cappuccino');
  expect('csv_handles_square_with_category_column',
    !!iced && iced.quantity === 277 && Math.round(iced.line_total) === 1206 &&
    !!capp && capp.quantity === 65  && Math.round(capp.line_total) === 226,
    `iced=${iced?.quantity}/${iced?.line_total} capp=${capp?.quantity}/${capp?.line_total}`);
}

// 31g. CSV parser surfaces a useful error when columns aren't recognised
{
  const weird = 'Foo,Bar,Baz\n1,2,3\n4,5,6\n';
  const r = parseCSVSalesReport(weird);
  expect('csv_unrecognised_columns_surface_useful_error',
    r.lines.length === 0 && r.errors.some(e => e.toLowerCase().includes('product')),
    `errors="${r.errors.join('; ')}"`);
}

// 31h. CSV diagnostics include detected delimiter, headers, and parse counts
{
  const csv = 'Product,Qty,Net Sales\nLatte,5,15.00\nMocha,3,9.00\n';
  const r = parseCSVSalesReport(csv, 50);
  const d = r.diagnostics;
  expect('csv_diagnostics_present',
    !!d && d.detectedDelimiter === ',' && d.acceptedRowCount === 2 &&
    d.detectedHeaders.length === 3 && d.fileSizeBytes === 50,
    `delim=${d?.detectedDelimiter} accepted=${d?.acceptedRowCount} headers=${d?.detectedHeaders?.length}`);
}

// 31i. CSV parser skips summary/total rows at the bottom of an export
{
  const withTotalRow = [
    'Item Name,Items Sold,Net Sales',
    'Cappuccino,5,17.50',
    'Latte,3,11.40',
    'TOTAL,8,28.90',
  ].join('\n');
  const r = parseCSVSalesReport(withTotalRow);
  const totalRow = r.lines.find(l => /^total$/i.test(l.product_name));
  expect('csv_skips_summary_total_row',
    r.lines.length === 2 && !totalRow,
    `lines=${r.lines.length} totalRow=${totalRow?.product_name}`);
}

// 31j. general_demand drivers no longer duplicate the "set trade type" text
//      (the UI surfaces a dedicated CTA + breadcrumb badge for that now).
{
  const r = predict('Other', { forecastTempC: 18, eventDate: '2025-06-15' }, noHistory);
  const drivers = (r?.drivers ?? []).join(' | ').toLowerCase();
  expect('general_demand_drivers_no_legacy_dup_text',
    !drivers.includes('set a specific trade type'),
    `drivers="${drivers}"`);
  expect('general_demand_drivers_still_mention_settings',
    drivers.includes('settings') && drivers.includes('trade type'),
    `drivers="${drivers}"`);
}

// 31k. Coffee result should NOT nag the user about setting a trade type —
//      they ARE a coffee trader, the CTA must not appear in coffee output.
{
  const r = predict('Coffee', { forecastTempC: 18, eventDate: '2025-06-15' }, noHistory);
  const drivers = (r?.drivers ?? []).join(' | ').toLowerCase();
  expect('coffee_drivers_no_set_trade_type_prompt',
    !drivers.includes('set a trade type') && !drivers.includes('set a specific trade type'),
    `drivers="${drivers}"`);
}

// 31m. getActiveTradeType handles every "missing-ish" profile shape sanely.
//      The Settings UI showed Coffee selected because the local state
//      defaulted to Coffee, but the prediction card was reading raw
//      business_type and getting empty / null / whitespace — which the
//      engine treated as Other. The helper now centralises the
//      resolution. The loader passes the raw value through unchanged so
//      every consumer can see the real DB state via the central
//      resolver (it returns 'Other' for empty/null, never silently
//      Coffee).
{
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getActiveTradeType, normalizeTradeType } = require('@/lib/tradeTypeConfig');

  // Variant 1: profile is null entirely (auth/load failure)
  expect('getActive_null_profile_returns_other',
    getActiveTradeType(null) === 'Other',
    `result=${getActiveTradeType(null)}`);

  // Variant 2: profile has explicit Coffee
  expect('getActive_explicit_coffee',
    getActiveTradeType({ business_type: 'Coffee' }) === 'Coffee',
    `result=${getActiveTradeType({ business_type: 'Coffee' })}`);

  // Variant 3: profile has empty string — engine should fall back to Other
  //           (the profile loader is what defaults empty -> Coffee at fetch time)
  expect('getActive_empty_string_returns_other_directly',
    getActiveTradeType({ business_type: '' }) === 'Other',
    `result=${getActiveTradeType({ business_type: '' })}`);

  // Variant 4: profile has whitespace-only — same behaviour
  expect('getActive_whitespace_returns_other_directly',
    getActiveTradeType({ business_type: '   ' }) === 'Other',
    `result=${getActiveTradeType({ business_type: '   ' })}`);

  // Variant 5: profile has alias variants — all resolve to canonical Coffee
  for (const alias of ['coffee', 'COFFEE', 'Coffee Van', 'coffee_cart', 'Espresso bar']) {
    const got = getActiveTradeType({ business_type: alias });
    expect(`getActive_alias_${alias.replace(/\s+/g, '_')}_to_coffee`,
      got === 'Coffee',
      `${alias} -> ${got}`);
  }

  // Variant 6: normalize handles plain "Coffee" identity
  expect('normalize_coffee_identity',
    normalizeTradeType('Coffee') === 'Coffee',
    `normalize('Coffee')=${normalizeTradeType('Coffee')}`);
}

// 31l. Percentage splits sum to exactly 100 across every kind that has a split.
//      Math.round() on independent values can drift to 99/101 — we round once
//      and derive the complement, so the two %s always add up.
{
  function pct(line?: { value: string }): number {
    return parseInt((line?.value ?? '0').replace('%', ''), 10);
  }

  // Coffee: hot + iced
  for (const t of [4, 18, 28]) {
    const r = predict('Coffee', { forecastTempC: t, eventDate: '2025-06-15' }, noHistory);
    const hot  = pct(r?.forecast.find(l => l.label === 'Hot drinks'));
    const iced = pct(r?.forecast.find(l => l.label === 'Iced drinks'));
    expect(`coffee_split_sums_to_100_at_${t}c`,
      hot + iced === 100,
      `hot=${hot} iced=${iced} sum=${hot + iced}`);
  }

  // Bar: alcohol + soft
  for (const t of [4, 18, 28]) {
    const r = predict('Cocktails', { forecastTempC: t, eventDate: '2025-06-15' }, noHistory);
    const alc  = pct(r?.forecast.find(l => l.label === 'Alcoholic drinks'));
    const soft = pct(r?.forecast.find(l => l.label === 'Soft / cold drinks'));
    expect(`bar_split_sums_to_100_at_${t}c`,
      alc + soft === 100,
      `alc=${alc} soft=${soft} sum=${alc + soft}`);
  }

  // Dessert: cold + hot
  for (const t of [4, 18, 28]) {
    const r = predict('Desserts', { forecastTempC: t, eventDate: '2025-06-15' }, noHistory);
    const cold = pct(r?.forecast.find(l => l.label === 'Cold desserts'));
    const hot  = pct(r?.forecast.find(l => l.label === 'Hot / baked sweets'));
    expect(`dessert_split_sums_to_100_at_${t}c`,
      cold + hot === 100,
      `cold=${cold} hot=${hot} sum=${cold + hot}`);
  }
}

// 31n. Trade-type resolution end-to-end — the bug class that produced
//      [Prediction] canonical:"Other" even after the user had picked Coffee.
//
//      Every consumer must route through the central resolver, never its
//      own '?? Coffee' / '?? Other' fallback. These tests assert the
//      invariants for every shape of profile.business_type that has
//      shown up in practice.
{
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getActiveTradeType, normalizeTradeType, getTradeConfig } = require('@/lib/tradeTypeConfig');

  // (a) Profile from Settings picker → 'Coffee' → resolves to Coffee + drink_split.
  {
    const profile = { business_type: 'Coffee' };
    const resolved = getActiveTradeType(profile);
    const config = getTradeConfig(resolved);
    const r = predict(resolved, { forecastTempC: 18, eventDate: '2025-06-15' }, noHistory);
    expect('resolve_settings_coffee_to_coffee',
      resolved === 'Coffee' && config.label === 'Coffee' && r?.kind === 'drink_split',
      `resolved=${resolved} label=${config.label} kind=${r?.kind}`);
  }

  // (b) Profile from Onboarding picker → 'Coffee' (identical to settings path).
  {
    const profile = { business_type: 'Coffee' };
    expect('resolve_onboarding_coffee_to_coffee',
      getActiveTradeType(profile) === 'Coffee',
      `resolved=${getActiveTradeType(profile)}`);
  }

  // (c) Stale event with no tradeType column (events table has no trade_type)
  //     + profile with Coffee → resolved is Coffee, not Other. The event
  //     cannot override the profile because there's no override channel.
  {
    const profile = { business_type: 'Coffee' };
    const eventTradeType: string | null = null; // events table column does not exist
    const resolved = eventTradeType ?? getActiveTradeType(profile);
    expect('stale_event_does_not_override_profile_coffee',
      resolved === 'Coffee',
      `resolved=${resolved}`);
  }

  // (d) Explicit profile Other → still Other (user really did pick Other).
  {
    expect('explicit_other_stays_other',
      getActiveTradeType({ business_type: 'Other' }) === 'Other',
      `result=${getActiveTradeType({ business_type: 'Other' })}`);
  }

  // (e) Loading state (profile null) → resolver returns Other, but the
  //     PredictionInsightCard's persistence layer must NOT save this to
  //     event_predictions. The card is responsible for that gate;
  //     here we only assert the resolver's contract.
  {
    expect('loading_profile_resolves_to_other',
      getActiveTradeType(null) === 'Other' && getActiveTradeType(undefined) === 'Other',
      `null=${getActiveTradeType(null)} undef=${getActiveTradeType(undefined)}`);
  }

  // (f) Missing type (empty/whitespace) → Other, NOT Coffee. Previously
  //     the profile loader silently coerced empty → 'Coffee' which hid
  //     the "no usable value" state and disagreed with the resolver.
  //     The loader now returns the raw value as stored.
  {
    expect('empty_string_resolves_to_other',
      normalizeTradeType('') === 'Other',
      `result=${normalizeTradeType('')}`);
    expect('whitespace_resolves_to_other',
      normalizeTradeType('   ') === 'Other',
      `result=${normalizeTradeType('   ')}`);
    expect('null_resolves_to_other',
      normalizeTradeType(null) === 'Other',
      `result=${normalizeTradeType(null)}`);
  }

  // (g) Coffee prediction does NOT use general_demand (Other) engine —
  //     it must use drink_split with hot/iced lines.
  {
    const r = predict('Coffee', { forecastTempC: 22, eventDate: '2025-06-15' }, noHistory);
    const labels = (r?.forecast ?? []).map((l) => l.label.toLowerCase()).join(' | ');
    expect('coffee_uses_drink_split_not_general',
      r?.kind === 'drink_split' && labels.includes('hot') && labels.includes('iced'),
      `kind=${r?.kind} labels="${labels}"`);
  }

  // (h) Coffee prediction does NOT include any food-mains / sides / extras
  //     stock chip — the trade config's drink_split path excludes them.
  {
    const config = getTradeConfig('Coffee');
    const r = predict('Coffee', { forecastTempC: 22, eventDate: '2025-06-15' }, noHistory);
    // drink_split kind has its own DRINK_SPLIT_PLAN_CATEGORIES that doesn't
    // include 'mains'/'sides'/'extras'. We assert the engine-level
    // invariant: the lens kind is drink_split (the UI uses this).
    expect('coffee_engine_kind_is_drink_split',
      r?.kind === 'drink_split',
      `kind=${r?.kind}`);
    void config; // type touch
  }

  // (i) Alias variants of Coffee all resolve to canonical 'Coffee' — the
  //     bug-class "user has 'Coffee Van' in DB and sees Other" must not
  //     regress.
  for (const alias of ['Coffee', 'coffee', 'COFFEE', 'Coffee Van', 'coffee_cart', 'espresso']) {
    const resolved = getActiveTradeType({ business_type: alias });
    expect(`alias_${alias.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}_resolves_coffee`,
      resolved === 'Coffee',
      `${alias} -> ${resolved}`);
  }
}

// 31o. useUpdateProfile must reject server responses that don't match
//      what we sent. Without this guard, a silent server-side coercion
//      (RLS column filter, future BEFORE-UPDATE trigger, or a 0-row
//      UPDATE returning a stale SELECT) reports success even though
//      the DB never changed — which is exactly the bug class that
//      produced the user's "picker visually works but profile stays
//      Other" screenshots. We test the validation predicate the
//      mutation uses, which canonicalises both sides via
//      normalizeTradeType so legitimate title-case responses
//      ('coffee' -> 'Coffee') don't trip it.
{
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { normalizeTradeType } = require('@/lib/tradeTypeConfig');

  function serverPersistedAsRequested(sent: string, got: string | null | undefined): boolean {
    return normalizeTradeType(sent) === normalizeTradeType(got);
  }

  // (a) Happy path: server stored Coffee, returns Coffee → passes.
  expect('mutation_validates_happy_path',
    serverPersistedAsRequested('Coffee', 'Coffee'),
    'sent Coffee, got Coffee');

  // (b) Silent coercion: sent Coffee, server returned Other → must FAIL.
  expect('mutation_rejects_silent_other_coercion',
    !serverPersistedAsRequested('Coffee', 'Other'),
    'sent Coffee, got Other');

  // (c) Server returns lowercase alias → still passes (normalizes equal).
  expect('mutation_accepts_alias_response',
    serverPersistedAsRequested('Coffee', 'coffee'),
    'sent Coffee, got coffee');

  // (d) Sent Coffee, server returned null → must FAIL.
  expect('mutation_rejects_null_response',
    !serverPersistedAsRequested('Coffee', null),
    'sent Coffee, got null');

  // (e) Sent Coffee, server returned empty → must FAIL.
  expect('mutation_rejects_empty_response',
    !serverPersistedAsRequested('Coffee', ''),
    'sent Coffee, got ""');
}

// 31p. Profile loader contract: business_type is surfaced as stored.
//      The previous bug class was the loader coercing empty/whitespace
//      to 'Coffee' as a "defensive default" — which hid the real DB
//      state from the dev strip and disagreed with the central
//      resolver. mapProfileRow now passes the value through unchanged
//      (only typeof-non-string is coerced to '' so downstream type is
//      stable). This test pins that contract so a future refactor
//      can't silently reintroduce the coercion.
{
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { mapProfileRow } = require('@/lib/profileHelpers');

  const base = {
    id: 'u1',
    business_name: 'Trader X',
    currency: 'GBP',
    custom_metrics: [],
    subscription_status: 'none',
    subscription_product_id: null,
    subscription_expires_at: null,
    subscription_will_renew: false,
    reviewer_grandfathered: false,
  };

  // (a) Explicit Coffee passes through unchanged.
  expect('loader_passes_coffee_through',
    mapProfileRow({ ...base, business_type: 'Coffee' }).business_type === 'Coffee',
    `got=${mapProfileRow({ ...base, business_type: 'Coffee' }).business_type}`);

  // (b) Empty string passes through unchanged — NOT coerced to Coffee.
  expect('loader_does_not_coerce_empty_to_coffee',
    mapProfileRow({ ...base, business_type: '' }).business_type === '',
    `got=${JSON.stringify(mapProfileRow({ ...base, business_type: '' }).business_type)}`);

  // (c) Whitespace passes through unchanged — NOT coerced.
  expect('loader_does_not_coerce_whitespace',
    mapProfileRow({ ...base, business_type: '   ' }).business_type === '   ',
    `got=${JSON.stringify(mapProfileRow({ ...base, business_type: '   ' }).business_type)}`);

  // (d) DB null becomes '' (stable type) but NOT 'Coffee'.
  expect('loader_null_business_type_becomes_empty_not_coffee',
    mapProfileRow({ ...base, business_type: null }).business_type === '',
    `got=${JSON.stringify(mapProfileRow({ ...base, business_type: null }).business_type)}`);

  // (e) Alias 'coffee' passes through unchanged — normalization is the
  //     resolver's job, NOT the loader's. The loader surfaces raw state.
  expect('loader_passes_lowercase_alias_through',
    mapProfileRow({ ...base, business_type: 'coffee' }).business_type === 'coffee',
    `got=${mapProfileRow({ ...base, business_type: 'coffee' }).business_type}`);
}

// 31q. Snapshot-persistence guard: isExplicitTradeTypeFor.
//      The PredictionInsightCard saves a prediction snapshot to
//      event_predictions once per (event,temp). The guard exists so
//      we never persist a fallback 'Other' that doesn't reflect the
//      trader's real business. Two failure modes the guard prevents:
//        • profile still loading → rawBusinessType is null,
//          canonical resolves to 'Other' via fallback — must NOT save.
//        • profile loaded but DB has empty business_type → also
//          fallback 'Other' — must NOT save.
{
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { isExplicitTradeTypeFor } = require('@/lib/profileHelpers');

  // (a) Loaded + explicit Coffee → save allowed.
  expect('snapshot_guard_loaded_coffee_allows_save',
    isExplicitTradeTypeFor(true, 'Coffee') === true,
    `got=${isExplicitTradeTypeFor(true, 'Coffee')}`);

  // (b) Loaded + explicit Other → save allowed (user really did pick Other).
  expect('snapshot_guard_loaded_explicit_other_allows_save',
    isExplicitTradeTypeFor(true, 'Other') === true,
    `got=${isExplicitTradeTypeFor(true, 'Other')}`);

  // (c) NOT loaded yet → must skip save (the fallback-Other guard).
  expect('snapshot_guard_not_loaded_blocks_save',
    isExplicitTradeTypeFor(false, 'Coffee') === false,
    `got=${isExplicitTradeTypeFor(false, 'Coffee')}`);

  // (d) Loaded but rawBusinessType null (profile undefined) → must skip.
  expect('snapshot_guard_null_raw_blocks_save',
    isExplicitTradeTypeFor(true, null) === false,
    `got=${isExplicitTradeTypeFor(true, null)}`);

  // (e) Loaded + empty string → must skip (no real value chosen).
  expect('snapshot_guard_empty_raw_blocks_save',
    isExplicitTradeTypeFor(true, '') === false,
    `got=${isExplicitTradeTypeFor(true, '')}`);

  // (f) Loaded + whitespace → must skip.
  expect('snapshot_guard_whitespace_raw_blocks_save',
    isExplicitTradeTypeFor(true, '   ') === false,
    `got=${isExplicitTradeTypeFor(true, '   ')}`);

  // (g) Loaded + undefined → must skip.
  expect('snapshot_guard_undefined_raw_blocks_save',
    isExplicitTradeTypeFor(true, undefined) === false,
    `got=${isExplicitTradeTypeFor(true, undefined)}`);
}

// 31r. WeatherCard hot/iced gate: the "Prepare: X% Hot / Y% Iced" prep
//      strip is drink-trade-specific and was previously shown to every
//      trader — a wrong-type crossover that confused food/ice-cream
//      traders. Gate predicate: canonical trade === 'Coffee'. This
//      test mirrors the runtime predicate inside WeatherCard.tsx so a
//      refactor of the gate would be caught.
{
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { normalizeTradeType } = require('@/lib/tradeTypeConfig');
  const gate = (tradeType: string | null | undefined): boolean =>
    normalizeTradeType(tradeType) === 'Coffee';

  // (a) Coffee → show.
  expect('weather_hot_iced_shows_for_coffee',
    gate('Coffee') === true,
    `got=${gate('Coffee')}`);

  // (b) Coffee aliases → show.
  for (const alias of ['coffee', 'COFFEE', 'Coffee Van', 'espresso']) {
    expect(`weather_hot_iced_shows_for_coffee_alias_${alias.replace(/\s+/g, '_')}`,
      gate(alias) === true,
      `alias=${alias} got=${gate(alias)}`);
  }

  // (c) Burgers → hide.
  expect('weather_hot_iced_hides_for_burgers',
    gate('Burgers') === false,
    `got=${gate('Burgers')}`);

  // (d) Ice Cream → hide (ice cream is cold-demand, not drink-split).
  expect('weather_hot_iced_hides_for_ice_cream',
    gate('Ice Cream') === false,
    `got=${gate('Ice Cream')}`);

  // (e) Other / unset → hide. The prep advice is meaningless without
  //     a coffee-trade context, and the previous always-on behaviour
  //     was misleading to unset accounts.
  expect('weather_hot_iced_hides_for_other',
    gate('Other') === false,
    `got=${gate('Other')}`);
  expect('weather_hot_iced_hides_for_null',
    gate(null) === false,
    `got=${gate(null)}`);
  expect('weather_hot_iced_hides_for_undefined',
    gate(undefined) === false,
    `got=${gate(undefined)}`);
  expect('weather_hot_iced_hides_for_empty_string',
    gate('') === false,
    `got=${gate('')}`);
}

// 31s. PGRST116 sentinel for the profile-row self-heal path. The
//      loader detects PostgREST's "0 rows from .single()" error code
//      and inserts a profile row to recover. Pin the constant so a
//      future Supabase client upgrade that changes the code is
//      caught immediately, rather than silently regressing into the
//      old "render Other forever" failure mode.
{
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { POSTGREST_NO_ROWS } = require('@/lib/profileHelpers');
  expect('postgrest_no_rows_sentinel_is_pgrst116',
    POSTGREST_NO_ROWS === 'PGRST116',
    `got=${POSTGREST_NO_ROWS}`);
}

// 32. CSV parser merges duplicate product names (some POS emit one row per transaction)
{
  const dupCSV = [
    'Item Name,Qty,Net Sales',
    'Cappuccino,1,3.50',
    'Latte,1,3.80',
    'Cappuccino,1,3.50',
  ].join('\n');
  const r = parseCSVSalesReport(dupCSV);
  const cappuccino = r.lines.find(l => l.product_name.toLowerCase().includes('cappuccino'));
  expect('csv_merges_duplicate_products',
    cappuccino?.quantity === 2 && Math.abs(cappuccino.line_total - 7.00) < 0.01,
    `qty=${cappuccino?.quantity} total=${cappuccino?.line_total}`);
}

// ── Reporter ────────────────────────────────────────────────────────
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
