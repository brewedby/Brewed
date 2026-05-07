// Trade-aware prediction engine.
//
// Learns from the user's own historical events (via EventObservation) and
// produces a forecast tailored to the trader's trade type. Coffee gets the
// hot/iced drink split engine that already existed; every other trade
// type gets a category-attachment / cold-demand / morning-bake engine
// implemented here.
//
// Hard rules:
//  • COGS is user-owned. We do NOT read product unit_cost, do NOT read or
//    compute event_financials.cost_of_goods, and do NOT suggest values
//    for either. The engine learns from quantities and revenue only.
//  • Predictions are computed locally. No external services see the
//    user's sales / product data. All learning uses that trader's own data.
//  • A prediction always returns a confidence + sample size so the UI
//    can surface "needs more data" states honestly.
//  • One unusual event does not dominate: IQR-based outlier detection
//    removes extreme observations before computing weighted averages when
//    there are 5+ data points.

import { differenceInDays } from 'date-fns';
import type { EventObservation } from '@/lib/queries/eventObservations';
import { predictDrinkSplit, type EventFinancialSummary } from '@/lib/drinkSplitEngine';
import { getTradeConfig, type PredictionKind } from '@/lib/tradeTypeConfig';
import type { DailyTakings } from '@/types';
import type { ProductCategory } from '@/types/cogs';

export type Confidence = 'high' | 'medium' | 'low';

export interface ForecastLine {
  /** Headline label, e.g. "Hot drinks" / "Mains" / "Sides attach" */
  label: string;
  /** Headline value for the user — usually a percentage or ratio. */
  value: string;
  /** Optional secondary value, e.g. "(£212 of £530 forecast)". */
  detail?: string;
  /** Optional emoji for trade-aware UI. */
  emoji?: string;
}

export interface PredictionResult {
  kind: PredictionKind;
  forecast: ForecastLine[];
  drivers: string[];
  weatherImpact: string;
  confidence: Confidence;
  confidenceReason: string;
  basedOnEvents: number;
  /** True when there isn't enough history yet — UI should show
   *  encouragement to log more events rather than a forecast. */
  learningMode: boolean;
}

export interface PredictionContext {
  forecastTempC: number;
  /** ISO date of the upcoming event. Used for similarity weighting. */
  eventDate: string;
}

const MIN_OBSERVATIONS_FOR_HIGH = 6;
const MIN_OBSERVATIONS_FOR_MEDIUM = 3;
// Minimum sample needed to run IQR outlier detection reliably.
const MIN_OUTLIER_SAMPLE = 5;

// Trade-specific default attachment rates used before the user has enough
// history. Values reflect typical UK street-food and market-trader norms.
const FOOD_ATTACH_DEFAULTS: Record<string, { sides: number; drinks: number; extras: number }> = {
  Burgers:        { sides: 0.70, drinks: 0.55, extras: 0.35 },
  Pizza:          { sides: 0.40, drinks: 0.45, extras: 0.20 },
  'Street Food':  { sides: 0.50, drinks: 0.50, extras: 0.25 },
  'Asian Food':   { sides: 0.45, drinks: 0.40, extras: 0.30 },
  'Mexican Food': { sides: 0.55, drinks: 0.50, extras: 0.35 },
  Crepes:         { sides: 0.20, drinks: 0.45, extras: 0.60 },
  Waffles:        { sides: 0.20, drinks: 0.40, extras: 0.65 },
};

/** Top-level entry point. Returns the prediction shaped for the trader's
 *  trade type, or `null` if the trade has no engine wired up. */
export function predict(
  tradeType: string | null,
  context: PredictionContext,
  observations: EventObservation[],
  dailyTakings?: DailyTakings[],
): PredictionResult | null {
  const config = getTradeConfig(tradeType);
  const lens = config.predictionLenses[0];
  if (!lens) return null;

  switch (lens.kind) {
    case 'drink_split':
      return predictForCoffee(context, observations, dailyTakings ?? []);
    case 'food_attach':
      return predictForFood(context, observations, tradeType);
    case 'cold_demand':
      return predictForColdDemand(context, observations);
    case 'morning_bake':
      return predictForBakery(context, observations);
    case 'evening_sweet':
      return predictForDessert(context, observations);
    case 'beverage_mix':
      return predictForBar(context, observations);
    case 'general_demand':
    default:
      return predictForGeneral(context, observations);
  }
}

// ── Recency weighting ──────────────────────────────────────────────────

/** Linear-ish decay: 1.0 today, 0.5 around 9 months old, floor at 0.2. */
function recencyWeight(eventDate: string, refDate: string): number {
  const ageDays = Math.abs(differenceInDays(new Date(refDate), new Date(eventDate)));
  return Math.max(0.2, 1 - (ageDays / 270));
}

/** Temperature similarity: 1.0 at 0°C apart, falls to 0.2 at >12°C apart. */
function tempSimilarity(targetC: number, observedC: number | null): number {
  if (observedC === null) return 0.5;
  const delta = Math.abs(targetC - observedC);
  if (delta <= 2) return 1.0;
  if (delta <= 5) return 0.85;
  if (delta <= 8) return 0.65;
  if (delta <= 12) return 0.4;
  return 0.2;
}

/** Combined weight — recency × temperature similarity. */
function similarityWeight(
  obs: EventObservation,
  context: PredictionContext,
): number {
  return recencyWeight(obs.date, context.eventDate) * tempSimilarity(context.forecastTempC, obs.avgTempC);
}

// ── Outlier detection ──────────────────────────────────────────────────

/**
 * Removes observations whose value falls outside the IQR fence (Q1 − 1.5×IQR,
 * Q3 + 1.5×IQR). Only activates when sample ≥ MIN_OUTLIER_SAMPLE — below that
 * we can't reliably compute IQR and the user needs every data point.
 */
function filterOutlierObservations(
  observations: EventObservation[],
  getValue: (o: EventObservation) => number,
): { filtered: EventObservation[]; outliersRemoved: number } {
  if (observations.length < MIN_OUTLIER_SAMPLE) {
    return { filtered: observations, outliersRemoved: 0 };
  }
  const values = observations.map(getValue);
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  // If IQR is 0 (all identical values), skip outlier removal.
  if (iqr === 0) return { filtered: observations, outliersRemoved: 0 };
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  const filtered = observations.filter((o) => {
    const v = getValue(o);
    return v >= lo && v <= hi;
  });
  return { filtered, outliersRemoved: observations.length - filtered.length };
}

function confidenceFromSampleSize(
  n: number,
  weatherMatched: number,
  outliersRemoved = 0,
): { level: Confidence; reason: string } {
  const outlierNote = outliersRemoved > 0
    ? ` (${outliersRemoved} outlier event${outliersRemoved === 1 ? '' : 's'} excluded)`
    : '';
  if (n >= MIN_OBSERVATIONS_FOR_HIGH && weatherMatched >= MIN_OBSERVATIONS_FOR_MEDIUM) {
    return {
      level: 'high',
      reason: `Based on ${n} similar past events (${weatherMatched} with comparable weather)${outlierNote}.`,
    };
  }
  if (n >= MIN_OBSERVATIONS_FOR_MEDIUM) {
    return {
      level: 'medium',
      reason: `Based on ${n} past event${n === 1 ? '' : 's'} — confidence will rise as you log more${outlierNote}.`,
    };
  }
  if (n > 0) {
    return {
      level: 'low',
      reason: `Only ${n} past event${n === 1 ? '' : 's'} on file — using defaults for the rest${outlierNote}.`,
    };
  }
  return {
    level: 'low',
    reason: 'No completed events with sales recorded yet — log some and predictions will sharpen.',
  };
}

function tempBucketLabel(tempC: number): string {
  if (tempC < 12) return 'Cold (<12°C)';
  if (tempC < 18) return 'Cool (12–17°C)';
  if (tempC < 23) return 'Warm (18–22°C)';
  return 'Hot (23°C+)';
}

function tempEmoji(tempC: number): string {
  if (tempC < 12) return '❄️';
  if (tempC < 18) return '🌤';
  if (tempC < 23) return '☀️';
  return '🔥';
}

/** Return a sensible mains emoji for the trade type. */
function tradeEmoji(tradeType: string | null): string {
  const map: Record<string, string> = {
    Burgers: '🍔',
    Pizza: '🍕',
    'Street Food': '🌮',
    'Asian Food': '🍜',
    'Mexican Food': '🌯',
    Crepes: '🥞',
    Waffles: '🧇',
  };
  return tradeType ? (map[tradeType] ?? '🍽️') : '🍽️';
}

/** Defaults for when a food trader has no line-item history yet. */
function getFoodDefaults(tradeType: string | null): { sides: number; drinks: number; extras: number } {
  if (tradeType && tradeType in FOOD_ATTACH_DEFAULTS) return FOOD_ATTACH_DEFAULTS[tradeType];
  return { sides: 0.55, drinks: 0.50, extras: 0.30 };
}

// ── Coffee — drink split (delegates to existing engine) ────────────────

function predictForCoffee(
  context: PredictionContext,
  observations: EventObservation[],
  dailyTakings: DailyTakings[],
): PredictionResult {
  const eventFinancials: EventFinancialSummary[] = observations
    .filter((o) => o.standardRatedSales + o.zeroRatedSales > 0)
    .map((o) => ({
      standard_rated_sales: o.standardRatedSales,
      zero_rated_sales: o.zeroRatedSales,
      avg_temp_c: o.avgTempC,
      month: parseInt(o.date.split('-')[1] ?? '6', 10),
      date: o.date,
    }));

  const split = predictDrinkSplit(context.forecastTempC, dailyTakings, eventFinancials);
  const sampleSize = split.totalDataPoints;
  const weatherMatched = split.basedOnDays;
  const { level, reason } = confidenceFromSampleSize(sampleSize, weatherMatched);

  const weatherImpact =
    context.forecastTempC < 12
      ? 'Cold weather — hot drinks should dominate.'
      : context.forecastTempC < 18
        ? 'Cool weather — leaning hot, but some iced demand still likely.'
        : context.forecastTempC < 23
          ? 'Warm weather — iced drinks moving up, hot drinks softer.'
          : 'Hot weather — iced should lead the day.';

  return {
    kind: 'drink_split',
    forecast: [
      { label: 'Hot drinks', value: `${split.hotPct}%`, emoji: '☕' },
      { label: 'Iced drinks', value: `${split.icedPct}%`, emoji: '🧊' },
    ],
    drivers: [
      `${tempBucketLabel(context.forecastTempC)} forecast`,
      sampleSize > 0
        ? `${sampleSize} historical day${sampleSize === 1 ? '' : 's'} of takings on file`
        : 'No completed days on file yet',
      'Engine weights recent events more heavily',
    ],
    weatherImpact,
    confidence: level,
    confidenceReason: reason,
    basedOnEvents: sampleSize,
    learningMode: sampleSize === 0,
  };
}

// ── Food trades — mains + attachment rates ─────────────────────────────

const MAIN_CATEGORIES: ProductCategory[]    = ['mains'];
const SIDE_CATEGORIES: ProductCategory[]    = ['sides'];
const DRINK_CATEGORIES: ProductCategory[]   = ['drinks', 'cold_drinks', 'hot_drinks'];
const EXTRA_CATEGORIES: ProductCategory[]   = ['extras', 'toppings', 'sauces'];
const SPECIAL_CATEGORIES: ProductCategory[] = ['specials'];

function sumCategories(
  by: Partial<Record<ProductCategory, number>>,
  cats: ProductCategory[],
): number {
  let total = 0;
  for (const c of cats) total += by[c] ?? 0;
  return total;
}

function predictForFood(
  context: PredictionContext,
  observations: EventObservation[],
  tradeType: string | null,
): PredictionResult {
  const usable = observations.filter((o) => o.totalLineItems > 0);

  // Remove outlier events (e.g. an unusually large festival vs. a typical market).
  const { filtered: nonOutliers, outliersRemoved } = filterOutlierObservations(
    usable,
    (o) => sumCategories(o.qtyByCategory, MAIN_CATEGORIES),
  );

  let weightedMains = 0;
  let weightedSidesPer = 0;
  let weightedDrinksPer = 0;
  let weightedExtrasPer = 0;
  let weightedSpecialsPer = 0;
  let totalWeight = 0;
  let weatherMatched = 0;

  for (const obs of nonOutliers) {
    const mains = sumCategories(obs.qtyByCategory, MAIN_CATEGORIES);
    if (mains <= 0) continue;
    const sides    = sumCategories(obs.qtyByCategory, SIDE_CATEGORIES);
    const drinks   = sumCategories(obs.qtyByCategory, DRINK_CATEGORIES);
    const extras   = sumCategories(obs.qtyByCategory, EXTRA_CATEGORIES);
    const specials = sumCategories(obs.qtyByCategory, SPECIAL_CATEGORIES);
    const w = similarityWeight(obs, context);
    totalWeight          += w;
    weightedMains        += w * mains;
    weightedSidesPer     += w * (sides    / mains);
    weightedDrinksPer    += w * (drinks   / mains);
    weightedExtrasPer    += w * (extras   / mains);
    weightedSpecialsPer  += w * (specials / mains);
    if (obs.avgTempC !== null && Math.abs(obs.avgTempC - context.forecastTempC) <= 5) weatherMatched++;
  }

  const sample = usable.length;
  const { level, reason } = confidenceFromSampleSize(sample, weatherMatched, outliersRemoved);
  const defaults = getFoodDefaults(tradeType);

  const weatherImpact = context.forecastTempC >= 22
    ? 'Hot weather — drinks attach expected to push above baseline.'
    : context.forecastTempC < 12
      ? 'Cold weather — comfort food demand holds; cold drinks soften.'
      : 'Comfortable weather — meal-time peaks dominate.';

  const hasSpecials = weightedSpecialsPer > 0;

  const forecast: ForecastLine[] = totalWeight > 0
    ? [
        {
          label: 'Mains forecast',
          value: `${Math.round(weightedMains / totalWeight)} units`,
          detail: outliersRemoved > 0
            ? `Avg from ${nonOutliers.length} events (${outliersRemoved} outlier${outliersRemoved === 1 ? '' : 's'} removed)`
            : 'Weather- and recency-weighted average',
          emoji: tradeEmoji(tradeType),
        },
        {
          label: 'Sides attach',
          value: `${Math.round((weightedSidesPer / totalWeight) * 100)}%`,
          detail: 'Per main sold',
          emoji: '🍟',
        },
        {
          label: 'Drinks attach',
          value: `${Math.round((weightedDrinksPer / totalWeight) * 100)}%`,
          detail: 'Per main sold',
          emoji: '🥤',
        },
        {
          label: 'Extras / toppings',
          value: `${Math.round((weightedExtrasPer / totalWeight) * 100)}%`,
          detail: 'Per main sold',
          emoji: '➕',
        },
        ...(hasSpecials ? [{
          label: 'Specials attach',
          value: `${Math.round((weightedSpecialsPer / totalWeight) * 100)}%`,
          detail: 'Specials per main — trial demand highest in first hour',
          emoji: '⭐',
        }] : []),
      ]
    : [
        {
          label: 'Sides attach',
          value: `${Math.round(defaults.sides * 100)}%`,
          detail: `${tradeType ?? 'Food'} default — improves as you log events`,
          emoji: '🍟',
        },
        {
          label: 'Drinks attach',
          value: `${Math.round(defaults.drinks * 100)}%`,
          detail: `${tradeType ?? 'Food'} default — improves as you log events`,
          emoji: '🥤',
        },
        {
          label: 'Extras / toppings',
          value: `${Math.round(defaults.extras * 100)}%`,
          detail: `${tradeType ?? 'Food'} default — improves as you log events`,
          emoji: '➕',
        },
      ];

  return {
    kind: 'food_attach',
    forecast,
    drivers: [
      `${tempBucketLabel(context.forecastTempC)} forecast ${tempEmoji(context.forecastTempC)}`,
      sample > 0 ? `${sample} past event${sample === 1 ? '' : 's'} with line-item data` : 'No event line-item data yet',
      'Recency- and weather-weighted — recent similar days matter most',
    ],
    weatherImpact,
    confidence: level,
    confidenceReason: reason,
    basedOnEvents: sample,
    learningMode: sample === 0,
  };
}

// ── Cold-demand (Ice Cream / Juice) — strongly weather-led ─────────────

function predictForColdDemand(
  context: PredictionContext,
  observations: EventObservation[],
): PredictionResult {
  const usable = observations.filter((o) => totalRevenueOf(o) > 0);

  // Remove revenue outliers so one record-breaking day doesn't skew prep guidance.
  const { filtered: nonOutliers, outliersRemoved } = filterOutlierObservations(
    usable,
    totalRevenueOf,
  );

  const sample = usable.length;
  const weatherMatched = nonOutliers.filter((o) =>
    o.avgTempC !== null && Math.abs(o.avgTempC - context.forecastTempC) <= 5,
  ).length;

  // Demand multiplier anchored at the user's historical mean.
  const meanRevenue = nonOutliers.length > 0
    ? nonOutliers.reduce((s, o) => s + totalRevenueOf(o), 0) / nonOutliers.length
    : 0;
  let weightedRevenue = 0, totalWeight = 0;
  for (const obs of nonOutliers) {
    const w = similarityWeight(obs, context);
    weightedRevenue += w * totalRevenueOf(obs);
    totalWeight     += w;
  }
  const expectedRevenue = totalWeight > 0 ? weightedRevenue / totalWeight : 0;
  const multiplier = meanRevenue > 0 ? expectedRevenue / meanRevenue : 1;
  const headline = describeMultiplier(multiplier, context.forecastTempC);

  // Topping/extra attach rate when category revenue data is available.
  let toppingRev = 0, mainTreatRev = 0;
  const hasCategories = nonOutliers.some((o) => Object.keys(o.revenueByCategory).length > 0);
  if (hasCategories) {
    for (const o of nonOutliers) {
      toppingRev   += sumRevenue(o, ['toppings', 'extras']);
      mainTreatRev += sumRevenue(o, ['ice_cream', 'desserts', 'specials']);
    }
  }
  const toppingTotal = toppingRev + mainTreatRev;
  const toppingAttach = toppingTotal > 0 ? toppingRev / toppingTotal : null;

  const { level, reason } = confidenceFromSampleSize(sample, weatherMatched, outliersRemoved);

  const weatherImpact = context.forecastTempC >= 23
    ? 'Hot, sunny day — strong cold-treat demand. Prep generously.'
    : context.forecastTempC >= 18
      ? 'Warm — solid demand. Plan close to your average.'
      : context.forecastTempC >= 12
        ? 'Cool — demand softer. Tighten perishable prep.'
        : 'Cold — demand likely well below average. Cut perishable orders.';

  const revenueDetail = outliersRemoved > 0
    ? `${outliersRemoved} outlier event${outliersRemoved === 1 ? '' : 's'} excluded`
    : 'Recency- and weather-weighted';

  const forecast: ForecastLine[] = expectedRevenue > 0
    ? [
        {
          label: 'Demand vs your average',
          value: headline.label,
          detail: headline.detail,
          emoji: tempEmoji(context.forecastTempC),
        },
        {
          label: 'Forecast revenue',
          value: `£${Math.round(expectedRevenue)}`,
          detail: revenueDetail,
          emoji: '💷',
        },
        ...(toppingAttach !== null ? [{
          label: 'Toppings / extras attach',
          value: `${Math.round(toppingAttach * 100)}%`,
          detail: 'Of treat revenue — upsell opportunity',
          emoji: '🍫',
        }] : []),
      ]
    : [
        {
          label: 'Demand vs your average',
          value: 'Unknown',
          detail: 'Log a completed event to start learning',
          emoji: tempEmoji(context.forecastTempC),
        },
      ];

  return {
    kind: 'cold_demand',
    forecast,
    drivers: [
      `${tempBucketLabel(context.forecastTempC)} forecast ${tempEmoji(context.forecastTempC)}`,
      sample > 0 ? `${sample} past event${sample === 1 ? '' : 's'} on record` : 'No completed events yet',
      'Highly weather-led — temperature similarity weighted strongly',
    ],
    weatherImpact,
    confidence: level,
    confidenceReason: reason,
    basedOnEvents: sample,
    learningMode: sample === 0,
  };
}

// ── Morning bake — front-loaded, weather mostly secondary ──────────────

function predictForBakery(
  context: PredictionContext,
  observations: EventObservation[],
): PredictionResult {
  const usable = observations.filter((o) => o.totalLineItems > 0 || totalRevenueOf(o) > 0);
  const { filtered: nonOutliers, outliersRemoved } = filterOutlierObservations(usable, totalRevenueOf);
  const sample = usable.length;

  // Recency-only weighting (weather is secondary for bakery).
  const meanRevenue = nonOutliers.length > 0
    ? nonOutliers.reduce((s, o) => s + totalRevenueOf(o), 0) / nonOutliers.length
    : 0;
  let weighted = 0, w = 0;
  for (const o of nonOutliers) {
    const wt = recencyWeight(o.date, context.eventDate);
    weighted += wt * totalRevenueOf(o);
    w        += wt;
  }
  const expectedRevenue = w > 0 ? weighted / w : 0;
  const multiplier = meanRevenue > 0 ? expectedRevenue / meanRevenue : 1;
  const headline = describeMultiplier(multiplier, context.forecastTempC, /* isBakery */ true);

  // If the bakery also sells hot drinks, show that share.
  const hasDrinkData = nonOutliers.some(
    (o) => o.hotDrinksSales > 0 || (o.revenueByCategory.hot_drinks ?? 0) > 0,
  );
  let hotDrinksRev = 0, totalRevForDrinks = 0;
  if (hasDrinkData) {
    for (const o of nonOutliers) {
      hotDrinksRev     += o.hotDrinksSales + (o.revenueByCategory.hot_drinks ?? 0);
      totalRevForDrinks += totalRevenueOf(o);
    }
  }

  const { level, reason } = confidenceFromSampleSize(sample, sample, outliersRemoved);

  const revenueDetail = outliersRemoved > 0
    ? `${outliersRemoved} outlier event${outliersRemoved === 1 ? '' : 's'} excluded`
    : 'Recency-weighted from your history';

  return {
    kind: 'morning_bake',
    forecast: expectedRevenue > 0
      ? [
          { label: 'Morning prep guidance', value: headline.label, detail: headline.detail, emoji: '🥐' },
          { label: 'Forecast revenue', value: `£${Math.round(expectedRevenue)}`, detail: revenueDetail, emoji: '💷' },
          ...(hasDrinkData && totalRevForDrinks > 0 ? [{
            label: 'Drinks proportion',
            value: `${Math.round((hotDrinksRev / totalRevForDrinks) * 100)}%`,
            detail: 'Hot drinks as share of bakery revenue',
            emoji: '☕',
          }] : []),
        ]
      : [
          { label: 'Morning prep guidance', value: 'Standard prep', detail: 'Log a completed event to start tuning', emoji: '🥐' },
        ],
    drivers: [
      'Front-loaded service — morning peak dominates',
      sample > 0 ? `${sample} past event${sample === 1 ? '' : 's'} on record` : 'No completed events yet',
      'Weather is secondary for bakery — footfall and prep timing lead',
    ],
    weatherImpact: context.forecastTempC < 5
      ? 'Cold snap — slight lift on hot items and hot drinks if you sell them.'
      : context.forecastTempC >= 22
        ? 'Hot day — cold drinks and lighter bakes move faster. Warm items slow.'
        : 'Weather mild — focus on prep timing and stock depth.',
    confidence: level,
    confidenceReason: reason,
    basedOnEvents: sample,
    learningMode: sample === 0,
  };
}

// ── Dessert / evening sweet ────────────────────────────────────────────

function predictForDessert(
  context: PredictionContext,
  observations: EventObservation[],
): PredictionResult {
  const usable = observations.filter((o) => totalRevenueOf(o) > 0);
  const { filtered: nonOutliers, outliersRemoved } = filterOutlierObservations(usable, totalRevenueOf);
  const sample = usable.length;
  const weatherMatched = nonOutliers.filter((o) =>
    o.avgTempC !== null && Math.abs(o.avgTempC - context.forecastTempC) <= 5,
  ).length;
  const { level, reason } = confidenceFromSampleSize(sample, weatherMatched, outliersRemoved);

  // Split desserts hot vs cold via category revenue when available.
  let hotRev = 0, coldRev = 0;
  for (const o of nonOutliers) {
    hotRev  += sumRevenue(o, ['cakes', 'pastries', 'bakes']);
    coldRev += sumRevenue(o, ['ice_cream', 'desserts']);
  }
  const totalRev = hotRev + coldRev;
  const coldShare = totalRev > 0 ? coldRev / totalRev : weatherWarmthAsColdShare(context.forecastTempC);
  const hotShare = 1 - coldShare;

  return {
    kind: 'evening_sweet',
    forecast: [
      { label: 'Cold desserts',       value: `${Math.round(coldShare * 100)}%`, emoji: '🍨' },
      { label: 'Hot / baked sweets',  value: `${Math.round(hotShare * 100)}%`,  emoji: '🍰' },
    ],
    drivers: [
      `${tempBucketLabel(context.forecastTempC)} forecast`,
      'Evening peak typical — family events lift overall volume',
      sample > 0 ? `${sample} past event${sample === 1 ? '' : 's'} with revenue data` : 'No completed events yet',
    ],
    weatherImpact: context.forecastTempC >= 22
      ? 'Warm — cold desserts and ice cream move ahead of hot options.'
      : context.forecastTempC < 12
        ? 'Cold — hot desserts and baked sweets outperform.'
        : 'Mild — close-to-baseline hot/cold mix.',
    confidence: level,
    confidenceReason: reason,
    basedOnEvents: sample,
    learningMode: sample === 0,
  };
}

// ── Bar / drinks-only traders ──────────────────────────────────────────

function predictForBar(
  context: PredictionContext,
  observations: EventObservation[],
): PredictionResult {
  const usable = observations.filter((o) => totalRevenueOf(o) > 0);
  const { filtered: nonOutliers, outliersRemoved } = filterOutlierObservations(usable, totalRevenueOf);
  const sample = usable.length;

  // Use similarity-weighted split when we have line-item category revenue.
  let weightedAlcohol = 0, weightedSoft = 0, totalWeight = 0;
  for (const obs of nonOutliers) {
    const alcRev  = sumRevenue(obs, ['alcohol', 'cocktails']);
    const softRev = sumRevenue(obs, ['cold_drinks', 'drinks', 'smoothies']);
    const tot = alcRev + softRev;
    if (tot <= 0) continue;
    const w = similarityWeight(obs, context);
    weightedAlcohol += w * (alcRev / tot);
    weightedSoft    += w * (softRev / tot);
    totalWeight     += w;
  }

  // Default split is temperature-adjusted when no history exists.
  const defaultAlcohol = context.forecastTempC >= 22 ? 0.62 : 0.70;
  const alcoholShare = totalWeight > 0 ? weightedAlcohol / totalWeight : defaultAlcohol;

  // Warm weather nudges cold/soft drinks up slightly from the observed baseline.
  const tempLift = Math.max(0, Math.min(0.12, (context.forecastTempC - 18) * 0.015));
  const adjustedSoft    = Math.min(0.95, (1 - alcoholShare) + tempLift);
  const adjustedAlcohol = 1 - adjustedSoft;

  const { level, reason } = confidenceFromSampleSize(sample, sample, outliersRemoved);

  return {
    kind: 'beverage_mix',
    forecast: [
      { label: 'Alcoholic drinks',    value: `${Math.round(adjustedAlcohol * 100)}%`, emoji: '🍺' },
      { label: 'Soft / cold drinks',  value: `${Math.round(adjustedSoft * 100)}%`,    emoji: '🥤' },
    ],
    drivers: [
      `${tempBucketLabel(context.forecastTempC)} forecast`,
      'Evening peak typical — event duration drives baseline volume',
      sample > 0 ? `${sample} past event${sample === 1 ? '' : 's'} on record` : 'No completed events yet',
    ],
    weatherImpact: context.forecastTempC >= 22
      ? 'Hot — soft/cold drinks attach harder alongside alcoholic serves.'
      : context.forecastTempC < 12
        ? 'Cold — alcoholic serves dominant; soft-drink attach softens.'
        : 'Steady weather — typical mix expected.',
    confidence: level,
    confidenceReason: reason,
    basedOnEvents: sample,
    learningMode: sample === 0,
  };
}

// ── General / fallback ─────────────────────────────────────────────────

function predictForGeneral(
  context: PredictionContext,
  observations: EventObservation[],
): PredictionResult {
  const usable = observations.filter((o) => totalRevenueOf(o) > 0);
  const { filtered: nonOutliers, outliersRemoved } = filterOutlierObservations(usable, totalRevenueOf);
  const sample = usable.length;

  const meanRevenue = nonOutliers.length > 0
    ? nonOutliers.reduce((s, o) => s + totalRevenueOf(o), 0) / nonOutliers.length
    : 0;
  let weighted = 0, w = 0;
  for (const o of nonOutliers) {
    const wt = similarityWeight(o, context);
    weighted += wt * totalRevenueOf(o);
    w        += wt;
  }
  const expectedRevenue = w > 0 ? weighted / w : 0;
  const multiplier = meanRevenue > 0 ? expectedRevenue / meanRevenue : 1;
  const headline = describeMultiplier(multiplier, context.forecastTempC);
  const { level, reason } = confidenceFromSampleSize(sample, sample, outliersRemoved);

  return {
    kind: 'general_demand',
    forecast: expectedRevenue > 0
      ? [
          {
            label: 'Demand vs your average',
            value: headline.label,
            detail: outliersRemoved > 0
              ? `${outliersRemoved} outlier event${outliersRemoved === 1 ? '' : 's'} excluded`
              : headline.detail,
            emoji: tempEmoji(context.forecastTempC),
          },
          { label: 'Forecast revenue', value: `£${Math.round(expectedRevenue)}`, detail: 'Weather and recency weighted', emoji: '💷' },
        ]
      : [
          { label: 'Demand', value: 'Standard', detail: 'Log a completed event to start learning', emoji: '📊' },
        ],
    drivers: [
      `${tempBucketLabel(context.forecastTempC)} forecast`,
      sample > 0 ? `${sample} past event${sample === 1 ? '' : 's'} on record` : 'No completed events yet',
      'Set a specific trade type in Settings for a sharper forecast',
    ],
    weatherImpact: context.forecastTempC >= 22
      ? 'Warm — drinks and outdoor food demand lift.'
      : context.forecastTempC < 12
        ? 'Cold — hot food holds; footfall and cold items soften.'
        : 'Comfortable — close to your typical day.',
    confidence: level,
    confidenceReason: reason,
    basedOnEvents: sample,
    learningMode: sample === 0,
  };
}

// ── Shared helpers ─────────────────────────────────────────────────────

function totalRevenueOf(o: EventObservation): number {
  // Prefer VAT-split totals; fall back to gross_sales. Never uses cost_of_goods.
  const split = o.standardRatedSales + o.zeroRatedSales;
  return split > 0 ? split : o.grossSalesFallback;
}

function sumRevenue(o: EventObservation, cats: ProductCategory[]): number {
  let s = 0;
  for (const c of cats) s += o.revenueByCategory[c] ?? 0;
  return s;
}

function describeMultiplier(
  multiplier: number,
  tempC: number,
  isBakery = false,
): { label: string; detail: string } {
  if (multiplier >= 1.4) {
    return {
      label: '+40% vs typical',
      detail: isBakery
        ? 'Push prep harder than a normal day.'
        : 'Order more perishables than your usual.',
    };
  }
  if (multiplier >= 1.15) {
    return {
      label: '+15% vs typical',
      detail: 'Slight uplift expected — prep modestly more.',
    };
  }
  if (multiplier >= 0.85) {
    return {
      label: 'About average',
      detail: 'Plan to your typical event volume.',
    };
  }
  if (multiplier >= 0.6) {
    return {
      label: '−25% vs typical',
      detail: tempC < 12
        ? 'Cold day softens demand — tighten perishables.'
        : 'Below-average day expected — tighten prep.',
    };
  }
  return {
    label: '−40% vs typical',
    detail: 'Plan a quieter day — reduce perishable orders.',
  };
}

/** When no line-item data is available, infer cold-dessert share from temperature. */
function weatherWarmthAsColdShare(tempC: number): number {
  if (tempC < 12) return 0.30;
  if (tempC < 18) return 0.45;
  if (tempC < 23) return 0.65;
  return 0.80;
}
