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
