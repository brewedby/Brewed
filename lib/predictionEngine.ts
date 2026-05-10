// Trade-aware demand prediction engine.
//
// Returns a *demand* forecast — not a revenue forecast. The headline output
// is a simple Low / Below average / Average / High / Very high band plus a
// preparation guidance label, with a category split where the user's history
// supports one. Revenue numbers are deliberately excluded from the primary
// surface so the user doesn't mistake forecasts for actuals.
//
// Hard rules:
//  • COGS is user-owned. We do NOT read product unit_cost, do NOT read or
//    compute event_financials.cost_of_goods, and do NOT suggest values for
//    either. The engine learns from quantities and revenue only.
//  • Predictions are computed locally. No external services see the user's
//    sales / product data. All learning uses that trader's own history.
//  • A prediction always returns a confidence + sample size so the UI can
//    surface "needs more data" states honestly.
//  • One unusual event does not dominate: IQR-based outlier removal is
//    applied before computing weighted averages when there are 5+ points.
//  • The engine is conservative by default. Multipliers are clamped to
//    [0.6, 1.4] so a few good days don't inflate the forecast.

import { differenceInDays } from 'date-fns';
import type { EventObservation } from '@/lib/queries/eventObservations';
import { predictDrinkSplit, type EventFinancialSummary } from '@/lib/drinkSplitEngine';
import { getTradeConfig, normalizeTradeType, type PredictionKind } from '@/lib/tradeTypeConfig';
import type { DailyTakings } from '@/types';
import type { ProductCategory } from '@/types/cogs';

export type Confidence = 'high' | 'medium' | 'low';

export type DemandLevel = 'low' | 'below_average' | 'average' | 'high' | 'very_high';
export type PrepLevel = 'conservative' | 'normal' | 'heavy';

export interface ForecastLine {
  /** Short label, e.g. "Hot drinks" / "Demand level" / "Sides attach". */
  label: string;
  /** Headline value — usually a percentage, demand band or count. */
  value: string;
  /** Optional secondary text. */
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
  /** Primary demand band for non-coffee trades (or null when not applicable). */
  demandLevel: DemandLevel | null;
  /** Prep guidance, used by both the headline and the UI badge. */
  prepLevel: PrepLevel | null;
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
// Conservative caps so a couple of strong/weak events can't dominate.
const MIN_MULTIPLIER = 0.6;
const MAX_MULTIPLIER = 1.4;

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
  const canonical = normalizeTradeType(tradeType);
  const config = getTradeConfig(canonical);
  const lens = config.predictionLenses[0];
  if (!lens) return null;

  switch (lens.kind) {
    case 'drink_split':
      return predictForCoffee(context, observations, dailyTakings ?? []);
    case 'food_attach':
      return predictForFood(context, observations, canonical);
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

// ── Recency weighting ─────────────────────────────────────────────

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

function similarityWeight(obs: EventObservation, context: PredictionContext): number {
  return recencyWeight(obs.date, context.eventDate) * tempSimilarity(context.forecastTempC, obs.avgTempC);
}

// ── Outlier detection ─────────────────────────────────────────────

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

function getFoodDefaults(tradeType: string | null): { sides: number; drinks: number; extras: number } {
  if (tradeType && tradeType in FOOD_ATTACH_DEFAULTS) return FOOD_ATTACH_DEFAULTS[tradeType];
  return { sides: 0.55, drinks: 0.50, extras: 0.30 };
}

// ── Demand level + prep guidance from a clamped multiplier ─────────────

/**
 * Map a (clamped) historical-vs-typical multiplier to a five-band demand
 * level. Bands are intentionally narrow at the extremes so the engine
 * doesn't shout "Very high" for a small uplift.
 */
function multiplierToDemandLevel(m: number): DemandLevel {
  if (m >= 1.30) return 'very_high';
  if (m >= 1.10) return 'high';
  if (m >= 0.90) return 'average';
  if (m >= 0.70) return 'below_average';
  return 'low';
}

function demandLevelLabel(level: DemandLevel): string {
  switch (level) {
    case 'very_high':     return 'Very high';
    case 'high':          return 'High';
    case 'average':       return 'About average';
    case 'below_average': return 'Below average';
    case 'low':           return 'Low';
  }
}

function prepLevelFor(level: DemandLevel): PrepLevel {
  if (level === 'very_high' || level === 'high') return 'heavy';
  if (level === 'low' || level === 'below_average') return 'conservative';
  return 'normal';
}

function prepLevelLabel(level: PrepLevel): string {
  switch (level) {
    case 'heavy':        return 'Prep heavy';
    case 'conservative': return 'Prep conservatively';
    case 'normal':       return 'Prep normally';
  }
}

/** Produce the clamped multiplier from the user's similarity-weighted
 *  history. Returns 1.0 when the user has no usable history yet — neutral. */
function clampedMultiplier(
  observations: EventObservation[],
  context: PredictionContext,
  getValue: (o: EventObservation) => number,
  weighter: (o: EventObservation, c: PredictionContext) => number,
): { multiplier: number; meanValue: number; expectedValue: number } {
  if (observations.length === 0) return { multiplier: 1, meanValue: 0, expectedValue: 0 };

  const meanValue = observations.reduce((s, o) => s + getValue(o), 0) / observations.length;
  let weightedValue = 0, totalWeight = 0;
  for (const obs of observations) {
    const w = weighter(obs, context);
    weightedValue += w * getValue(obs);
    totalWeight   += w;
  }
  const expectedValue = totalWeight > 0 ? weightedValue / totalWeight : meanValue;
  if (meanValue <= 0) return { multiplier: 1, meanValue, expectedValue };
  const raw = expectedValue / meanValue;
  return {
    multiplier: Math.min(MAX_MULTIPLIER, Math.max(MIN_MULTIPLIER, raw)),
    meanValue,
    expectedValue,
  };
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
    // Coffee headline IS the hot/iced split — we deliberately don't surface
    // a numeric demand level on top so the UI stays simple and focused.
    demandLevel: null,
    prepLevel: null,
  };
}

// ── Food trades — mains + attachment rates ─────────────────────────

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

  const { filtered: nonOutliers, outliersRemoved } = filterOutlierObservations(
    usable,
    (o) => sumCategories(o.qtyByCategory, MAIN_CATEGORIES),
  );

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
    weightedSidesPer     += w * (sides    / mains);
    weightedDrinksPer    += w * (drinks   / mains);
    weightedExtrasPer    += w * (extras   / mains);
    weightedSpecialsPer  += w * (specials / mains);
    if (obs.avgTempC !== null && Math.abs(obs.avgTempC - context.forecastTempC) <= 5) weatherMatched++;
  }

  const sample = usable.length;
  const { level, reason } = confidenceFromSampleSize(sample, weatherMatched, outliersRemoved);
  const defaults = getFoodDefaults(tradeType);

  // Demand level from clamped revenue multiplier.
  const { multiplier } = clampedMultiplier(nonOutliers.length > 0 ? nonOutliers : usable, context, totalRevenueOf, similarityWeight);
  const demandLevel = nonOutliers.length > 0 ? multiplierToDemandLevel(multiplier) : null;
  const prepLevel = demandLevel ? prepLevelFor(demandLevel) : null;

  const weatherImpact = context.forecastTempC >= 22
    ? 'Hot weather — drinks attach expected to push above baseline.'
    : context.forecastTempC < 12
      ? 'Cold weather — comfort food demand holds; cold drinks soften.'
      : 'Comfortable weather — meal-time peaks dominate.';

  const hasSpecials = weightedSpecialsPer > 0;

  const headline: ForecastLine[] = demandLevel ? [
    {
      label: 'Demand level',
      value: demandLevelLabel(demandLevel),
      detail: prepLevel ? prepLevelLabel(prepLevel) : undefined,
      emoji: tradeEmoji(tradeType),
    },
  ] : [];

  const splitLines: ForecastLine[] = totalWeight > 0
    ? [
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
          detail: 'Specials per main',
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
    forecast: [...headline, ...splitLines],
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
    demandLevel,
    prepLevel,
  };
}

// ── Cold-demand (Ice Cream / Juice) — strongly weather-led ─────────────

function predictForColdDemand(
  context: PredictionContext,
  observations: EventObservation[],
): PredictionResult {
  const usable = observations.filter((o) => totalRevenueOf(o) > 0);
  const { filtered: nonOutliers, outliersRemoved } = filterOutlierObservations(usable, totalRevenueOf);

  const sample = usable.length;
  const weatherMatched = nonOutliers.filter((o) =>
    o.avgTempC !== null && Math.abs(o.avgTempC - context.forecastTempC) <= 5,
  ).length;

  const { multiplier } = clampedMultiplier(nonOutliers, context, totalRevenueOf, similarityWeight);
  const demandLevel = nonOutliers.length > 0 ? multiplierToDemandLevel(multiplier) : null;
  const prepLevel = demandLevel ? prepLevelFor(demandLevel) : null;

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

  const forecast: ForecastLine[] = demandLevel
    ? [
        {
          label: 'Demand level',
          value: demandLevelLabel(demandLevel),
          detail: prepLevel ? prepLevelLabel(prepLevel) : undefined,
          emoji: tempEmoji(context.forecastTempC),
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
          label: 'Demand level',
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
    demandLevel,
    prepLevel,
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

  // Weather is secondary for bakery — recency-only weighting.
  const recencyOnly = (o: EventObservation, c: PredictionContext) => recencyWeight(o.date, c.eventDate);
  const { multiplier } = clampedMultiplier(nonOutliers, context, totalRevenueOf, recencyOnly);
  const demandLevel = nonOutliers.length > 0 ? multiplierToDemandLevel(multiplier) : null;
  const prepLevel = demandLevel ? prepLevelFor(demandLevel) : null;

  const hasDrinkData = nonOutliers.some(
    (o) => o.hotDrinksSales > 0 || (o.revenueByCategory.hot_drinks ?? 0) > 0,
  );
  let hotDrinksRev = 0, totalRevForDrinks = 0;
  if (hasDrinkData) {
    for (const o of nonOutliers) {
      hotDrinksRev      += o.hotDrinksSales + (o.revenueByCategory.hot_drinks ?? 0);
      totalRevForDrinks += totalRevenueOf(o);
    }
  }

  const { level, reason } = confidenceFromSampleSize(sample, sample, outliersRemoved);

  return {
    kind: 'morning_bake',
    forecast: demandLevel
      ? [
          {
            label: 'Morning prep',
            value: demandLevelLabel(demandLevel),
            detail: prepLevel ? prepLevelLabel(prepLevel) : undefined,
            emoji: '🥐',
          },
          ...(hasDrinkData && totalRevForDrinks > 0 ? [{
            label: 'Drinks share',
            value: `${Math.round((hotDrinksRev / totalRevForDrinks) * 100)}%`,
            detail: 'Hot drinks as share of bakery sales',
            emoji: '☕',
          }] : []),
        ]
      : [
          { label: 'Morning prep', value: 'Standard prep', detail: 'Log a completed event to start tuning', emoji: '🥐' },
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
    demandLevel,
    prepLevel,
  };
}

// ── Dessert / evening sweet ─────────────────────────────────────────

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

  let hotRev = 0, coldRev = 0;
  for (const o of nonOutliers) {
    hotRev  += sumRevenue(o, ['cakes', 'pastries', 'bakes']);
    coldRev += sumRevenue(o, ['ice_cream', 'desserts']);
  }
  const totalRev = hotRev + coldRev;
  const coldShare = totalRev > 0 ? coldRev / totalRev : weatherWarmthAsColdShare(context.forecastTempC);
  const hotShare = 1 - coldShare;

  const { multiplier } = clampedMultiplier(nonOutliers, context, totalRevenueOf, similarityWeight);
  const demandLevel = nonOutliers.length > 0 ? multiplierToDemandLevel(multiplier) : null;
  const prepLevel = demandLevel ? prepLevelFor(demandLevel) : null;

  return {
    kind: 'evening_sweet',
    forecast: [
      ...(demandLevel ? [{
        label: 'Demand level',
        value: demandLevelLabel(demandLevel),
        detail: prepLevel ? prepLevelLabel(prepLevel) : undefined,
        emoji: tempEmoji(context.forecastTempC),
      }] : []),
      { label: 'Cold desserts',      value: `${Math.round(coldShare * 100)}%`, emoji: '🍨' },
      { label: 'Hot / baked sweets', value: `${Math.round(hotShare * 100)}%`,  emoji: '🍰' },
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
    demandLevel,
    prepLevel,
  };
}

// ── Bar / drinks-only traders ─────────────────────────────────────

function predictForBar(
  context: PredictionContext,
  observations: EventObservation[],
): PredictionResult {
  const usable = observations.filter((o) => totalRevenueOf(o) > 0);
  const { filtered: nonOutliers, outliersRemoved } = filterOutlierObservations(usable, totalRevenueOf);
  const sample = usable.length;

  let weightedAlcohol = 0, totalWeight = 0;
  for (const obs of nonOutliers) {
    const alcRev  = sumRevenue(obs, ['alcohol', 'cocktails']);
    const softRev = sumRevenue(obs, ['cold_drinks', 'drinks', 'smoothies']);
    const tot = alcRev + softRev;
    if (tot <= 0) continue;
    const w = similarityWeight(obs, context);
    weightedAlcohol += w * (alcRev / tot);
    totalWeight     += w;
  }

  const defaultAlcohol = context.forecastTempC >= 22 ? 0.62 : 0.70;
  const alcoholShare = totalWeight > 0 ? weightedAlcohol / totalWeight : defaultAlcohol;
  const tempLift = Math.max(0, Math.min(0.12, (context.forecastTempC - 18) * 0.015));
  const adjustedSoft    = Math.min(0.95, (1 - alcoholShare) + tempLift);
  const adjustedAlcohol = 1 - adjustedSoft;

  const { multiplier } = clampedMultiplier(nonOutliers, context, totalRevenueOf, similarityWeight);
  const demandLevel = nonOutliers.length > 0 ? multiplierToDemandLevel(multiplier) : null;
  const prepLevel = demandLevel ? prepLevelFor(demandLevel) : null;

  const { level, reason } = confidenceFromSampleSize(sample, sample, outliersRemoved);

  return {
    kind: 'beverage_mix',
    forecast: [
      ...(demandLevel ? [{
        label: 'Demand level',
        value: demandLevelLabel(demandLevel),
        detail: prepLevel ? prepLevelLabel(prepLevel) : undefined,
        emoji: tempEmoji(context.forecastTempC),
      }] : []),
      { label: 'Alcoholic drinks',   value: `${Math.round(adjustedAlcohol * 100)}%`, emoji: '🍺' },
      { label: 'Soft / cold drinks', value: `${Math.round(adjustedSoft * 100)}%`,    emoji: '🥤' },
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
    demandLevel,
    prepLevel,
  };
}

// ── General / fallback ──────────────────────────────────────────

function predictForGeneral(
  context: PredictionContext,
  observations: EventObservation[],
): PredictionResult {
  const usable = observations.filter((o) => totalRevenueOf(o) > 0);
  const { filtered: nonOutliers, outliersRemoved } = filterOutlierObservations(usable, totalRevenueOf);
  const sample = usable.length;

  const { multiplier } = clampedMultiplier(nonOutliers, context, totalRevenueOf, similarityWeight);
  const demandLevel = nonOutliers.length > 0 ? multiplierToDemandLevel(multiplier) : null;
  const prepLevel = demandLevel ? prepLevelFor(demandLevel) : null;

  const { level, reason } = confidenceFromSampleSize(sample, sample, outliersRemoved);

  return {
    kind: 'general_demand',
    forecast: demandLevel
      ? [
          {
            label: 'Demand level',
            value: demandLevelLabel(demandLevel),
            detail: prepLevel ? prepLevelLabel(prepLevel) : undefined,
            emoji: tempEmoji(context.forecastTempC),
          },
        ]
      : [
          { label: 'Demand level', value: 'Standard', detail: 'Log a completed event to start learning', emoji: '📊' },
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
    demandLevel,
    prepLevel,
  };
}

// ── Shared helpers ────────────────────────────────────────────────

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

/** When no line-item data is available, infer cold-dessert share from temperature. */
function weatherWarmthAsColdShare(tempC: number): number {
  if (tempC < 12) return 0.30;
  if (tempC < 18) return 0.45;
  if (tempC < 23) return 0.65;
  return 0.80;
}
