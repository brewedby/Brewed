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
//    user's sales / product data.
//  • A prediction always returns a confidence + sample size so the UI
//    can surface "needs more data" states honestly.

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

/** Top-level entry point. Returns the prediction shaped for the trader's
 *  trade type, or `null` if the trade has no engine wired up. */
export function predict(
  tradeType: string | null,
  context: PredictionContext,
  observations: EventObservation[],
  dailyTakings?: DailyTakings[],
): PredictionResult | null {
  const config = getTradeConfig(tradeType);
  // We assume a single primary lens — if a trade type ever needs more
  // than one we can iterate.
  const lens = config.predictionLenses[0];
  if (!lens) return null;

  switch (lens.kind) {
    case 'drink_split':
      return predictForCoffee(context, observations, dailyTakings ?? []);
    case 'food_attach':
      return predictForFood(context, observations);
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

function confidenceFromSampleSize(n: number, weatherMatched: number): {
  level: Confidence;
  reason: string;
} {
  if (n >= MIN_OBSERVATIONS_FOR_HIGH && weatherMatched >= MIN_OBSERVATIONS_FOR_MEDIUM) {
    return {
      level: 'high',
      reason: `Based on ${n} similar past events (${weatherMatched} with comparable weather).`,
    };
  }
  if (n >= MIN_OBSERVATIONS_FOR_MEDIUM) {
    return {
      level: 'medium',
      reason: `Based on ${n} past event${n === 1 ? '' : 's'} — confidence will rise as you log more.`,
    };
  }
  if (n > 0) {
    return {
      level: 'low',
      reason: `Only ${n} past event${n === 1 ? '' : 's'} on file — using generic baselines for the rest.`,
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

// ── Coffee — drink split (delegates to existing engine) ────────────────

function predictForCoffee(
  context: PredictionContext,
  observations: EventObservation[],
  dailyTakings: DailyTakings[],
): PredictionResult {
  // Map observations into the legacy drinkSplitEngine input format. We
  // include only events with some hot/iced data and weather, plus any
  // event_financials with VAT split (engine derives an avg temp from the
  // month if avg_temp_c is missing).
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

const MAIN_CATEGORIES: ProductCategory[]  = ['mains'];
const SIDE_CATEGORIES: ProductCategory[]  = ['sides'];
const DRINK_CATEGORIES: ProductCategory[] = ['drinks', 'cold_drinks', 'hot_drinks'];
const EXTRA_CATEGORIES: ProductCategory[] = ['extras', 'toppings', 'sauces'];
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
): PredictionResult {
  // Only events that have any line items at all are useful here.
  const usable = observations.filter((o) => o.totalLineItems > 0);
  let weightedMains = 0;
  let weightedSidesPer = 0;
  let weightedDrinksPer = 0;
  let weightedExtrasPer = 0;
  let totalWeight = 0;
  let weatherMatched = 0;

  for (const obs of usable) {
    const mains = sumCategories(obs.qtyByCategory, MAIN_CATEGORIES);
    if (mains <= 0) continue;
    const sides  = sumCategories(obs.qtyByCategory, SIDE_CATEGORIES);
    const drinks = sumCategories(obs.qtyByCategory, DRINK_CATEGORIES);
    const extras = sumCategories(obs.qtyByCategory, EXTRA_CATEGORIES);
    const w = similarityWeight(obs, context);
    totalWeight       += w;
    weightedMains     += w * mains;
    weightedSidesPer  += w * (sides  / mains);
    weightedDrinksPer += w * (drinks / mains);
    weightedExtrasPer += w * (extras / mains);
    if (obs.avgTempC !== null && Math.abs(obs.avgTempC - context.forecastTempC) <= 5) weatherMatched++;
  }

  const sample = usable.length;
  const { level, reason } = confidenceFromSampleSize(sample, weatherMatched);

  // Defaults when we have no data — sensible category attachment rates
  // for a UK food trader. These exist so the UI never says 0% before
  // we've seen any history.
  const defaults = { sides: 0.65, drinks: 0.55, extras: 0.30 };

  const forecast: ForecastLine[] = totalWeight > 0
    ? [
        {
          label: 'Mains forecast',
          value: `${Math.round(weightedMains / totalWeight)} units`,
          detail: 'Weighted average from comparable past events',
          emoji: '🍔',
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
          detail: 'Per main sold — topping/extra add-ons',
          emoji: '➕',
        },
      ]
    : [
        { label: 'Sides attach',     value: `${Math.round(defaults.sides * 100)}%`,   detail: 'Default — no history yet', emoji: '🍟' },
        { label: 'Drinks attach',    value: `${Math.round(defaults.drinks * 100)}%`,  detail: 'Default — no history yet', emoji: '🥤' },
        { label: 'Extras / toppings', value: `${Math.round(defaults.extras * 100)}%`, detail: 'Default — no history yet', emoji: '➕' },
      ];

  const weatherImpact = context.forecastTempC >= 22
    ? 'Hot weather — expect drinks attach to push higher than baseline.'
    : context.forecastTempC < 12
      ? 'Cold weather — hot food + warm drink combos lift; cold drinks soften.'
      : 'Comfortable weather — meal-time peaks dominate over weather effects.';

  return {
    kind: 'food_attach',
    forecast,
    drivers: [
      `${tempBucketLabel(context.forecastTempC)} forecast ${tempEmoji(context.forecastTempC)}`,
      sample > 0 ? `${sample} past event${sample === 1 ? '' : 's'} with line-item data` : 'No event line-item data yet',
      'Recency-weighted — recent events matter more',
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
  // Aggregate by event: total revenue (anything sold) versus temp.
  const usable = observations.filter((o) => totalRevenueOf(o) > 0);
  const sample = usable.length;
  const weatherMatched = usable.filter((o) =>
    o.avgTempC !== null && Math.abs(o.avgTempC - context.forecastTempC) <= 5,
  ).length;

  // Demand multiplier vs your average — anchored at 1.0 for the user's
  // historical mean revenue, scaled by temperature similarity.
  const meanRevenue = sample > 0
    ? usable.reduce((s, o) => s + totalRevenueOf(o), 0) / sample
    : 0;
  let weightedRevenue = 0, totalWeight = 0;
  for (const obs of usable) {
    const w = similarityWeight(obs, context);
    weightedRevenue += w * totalRevenueOf(obs);
    totalWeight     += w;
  }
  const expectedRevenue = totalWeight > 0 ? weightedRevenue / totalWeight : 0;
  const multiplier = meanRevenue > 0 ? expectedRevenue / meanRevenue : 1;

  // Temperature-led headline: how much should they prep for, vs a
  // typical day. We bucket the multiplier into qualitative bands so the
  // copy reads naturally.
  const headline = describeMultiplier(multiplier, context.forecastTempC);

  const { level, reason } = confidenceFromSampleSize(sample, weatherMatched);

  const weatherImpact = context.forecastTempC >= 23
    ? 'Hot, sunny days drive strong cold-treat demand — prep generously.'
    : context.forecastTempC >= 18
      ? 'Warm weather — solid demand, plan close to your average.'
      : context.forecastTempC >= 12
        ? 'Cool weather — demand softer, tighten perishable prep.'
        : 'Cold weather — demand likely well below average. Cut perishable orders.';

  const forecast: ForecastLine[] = expectedRevenue > 0
    ? [
        { label: 'Demand vs your average', value: headline.label, detail: headline.detail, emoji: tempEmoji(context.forecastTempC) },
        { label: 'Forecast revenue', value: `£${Math.round(expectedRevenue)}`, detail: 'Recency- and weather-weighted', emoji: '💷' },
      ]
    : [
        { label: 'Demand vs your average', value: 'Unknown', detail: 'Log a completed event to start learning', emoji: tempEmoji(context.forecastTempC) },
      ];

  return {
    kind: 'cold_demand',
    forecast,
    drivers: [
      `${tempBucketLabel(context.forecastTempC)} forecast ${tempEmoji(context.forecastTempC)}`,
      sample > 0 ? `${sample} past event${sample === 1 ? '' : 's'} on record` : 'No completed events yet',
      'Highly weather-led — recent hot events weighted strongly',
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
  const sample = usable.length;

  // For bakery we predict prep volume vs the user's average; we don't
  // have time-of-day per line item so this is event-day total.
  const meanRevenue = sample > 0
    ? usable.reduce((s, o) => s + totalRevenueOf(o), 0) / sample
    : 0;
  let weighted = 0, w = 0;
  for (const o of usable) {
    const wt = recencyWeight(o.date, context.eventDate); // weather doesn't drive bakery
    weighted += wt * totalRevenueOf(o);
    w        += wt;
  }
  const expectedRevenue = w > 0 ? weighted / w : 0;
  const multiplier = meanRevenue > 0 ? expectedRevenue / meanRevenue : 1;
  const headline = describeMultiplier(multiplier, context.forecastTempC, /* isBakery */ true);

  const { level, reason } = confidenceFromSampleSize(sample, sample);

  return {
    kind: 'morning_bake',
    forecast: expectedRevenue > 0
      ? [
          { label: 'Morning prep guidance', value: headline.label, detail: headline.detail, emoji: '🥐' },
          { label: 'Forecast revenue',      value: `£${Math.round(expectedRevenue)}`, detail: 'Recency-weighted from your history', emoji: '💷' },
        ]
      : [
          { label: 'Morning prep guidance', value: 'Standard prep', detail: 'Log a completed event to start tuning', emoji: '🥐' },
        ],
    drivers: [
      'Front-loaded service — morning peak dominates',
      sample > 0 ? `${sample} past event${sample === 1 ? '' : 's'} on record` : 'No completed events yet',
      'Weather has a secondary effect for bakery — mostly footfall-led',
    ],
    weatherImpact: context.forecastTempC < 5
      ? 'Cold snap — slight lift on hot bakes/coffees if you sell them.'
      : 'Weather effect on bakery is mild — focus on prep timing.',
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
  const sample = usable.length;
  const weatherMatched = usable.filter((o) =>
    o.avgTempC !== null && Math.abs(o.avgTempC - context.forecastTempC) <= 5,
  ).length;
  const { level, reason } = confidenceFromSampleSize(sample, weatherMatched);

  // We split desserts into hot vs cold via category revenue when
  // possible — falls back to a heuristic when we have no line items.
  let hotRev = 0, coldRev = 0;
  for (const o of usable) {
    hotRev  += sumRevenue(o, ['cakes', 'pastries']);
    coldRev += sumRevenue(o, ['ice_cream', 'desserts']);
  }
  const totalRev = hotRev + coldRev;
  const coldShare = totalRev > 0 ? coldRev / totalRev : weatherWarmthAsColdShare(context.forecastTempC);
  const hotShare = 1 - coldShare;

  return {
    kind: 'evening_sweet',
    forecast: [
      { label: 'Cold desserts',  value: `${Math.round(coldShare * 100)}%`, emoji: '🍨' },
      { label: 'Hot / baked sweets', value: `${Math.round(hotShare * 100)}%`, emoji: '🍰' },
    ],
    drivers: [
      `${tempBucketLabel(context.forecastTempC)} forecast`,
      'Evening peak typical — family events lift volume',
      sample > 0 ? `${sample} past event${sample === 1 ? '' : 's'} with revenue data` : 'No completed events yet',
    ],
    weatherImpact: context.forecastTempC >= 22
      ? 'Warm — cold desserts (ice cream, fruit) move ahead.'
      : context.forecastTempC < 12
        ? 'Cold — hot desserts and baked sweets do better.'
        : 'Mild — close-to-baseline mix.',
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
  const sample = usable.length;
  let alcoholRev = 0, softRev = 0;
  for (const o of usable) {
    alcoholRev += sumRevenue(o, ['alcohol', 'cocktails']);
    softRev    += sumRevenue(o, ['cold_drinks', 'drinks', 'smoothies']);
  }
  const total = alcoholRev + softRev;
  // If the user only has revenue (no line items), default to 70/30.
  const alcoholShare = total > 0 ? alcoholRev / total : 0.70;
  const softShare = 1 - alcoholShare;
  // Hot weather gently lifts soft / cold drinks share.
  const tempLift = Math.max(0, Math.min(0.15, (context.forecastTempC - 18) * 0.02));
  const adjustedSoft = Math.min(0.95, softShare + tempLift);
  const adjustedAlcohol = 1 - adjustedSoft;

  const { level, reason } = confidenceFromSampleSize(sample, sample);

  return {
    kind: 'beverage_mix',
    forecast: [
      { label: 'Alcoholic drinks', value: `${Math.round(adjustedAlcohol * 100)}%`, emoji: '🍺' },
      { label: 'Soft / cold drinks', value: `${Math.round(adjustedSoft * 100)}%`, emoji: '🥤' },
    ],
    drivers: [
      `${tempBucketLabel(context.forecastTempC)} forecast`,
      'Evening peak typical — event duration drives baseline volume',
      sample > 0 ? `${sample} past event${sample === 1 ? '' : 's'} on record` : 'No completed events yet',
    ],
    weatherImpact: context.forecastTempC >= 22
      ? 'Warm weather — soft/cold drinks attach harder.'
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
  const sample = usable.length;
  const meanRevenue = sample > 0
    ? usable.reduce((s, o) => s + totalRevenueOf(o), 0) / sample
    : 0;
  let weighted = 0, w = 0;
  for (const o of usable) {
    const wt = similarityWeight(o, context);
    weighted += wt * totalRevenueOf(o);
    w        += wt;
  }
  const expectedRevenue = w > 0 ? weighted / w : 0;
  const multiplier = meanRevenue > 0 ? expectedRevenue / meanRevenue : 1;
  const headline = describeMultiplier(multiplier, context.forecastTempC);
  const { level, reason } = confidenceFromSampleSize(sample, sample);

  return {
    kind: 'general_demand',
    forecast: expectedRevenue > 0
      ? [
          { label: 'Demand vs your average', value: headline.label, detail: headline.detail, emoji: tempEmoji(context.forecastTempC) },
          { label: 'Forecast revenue', value: `£${Math.round(expectedRevenue)}`, detail: 'Weather and recency weighted', emoji: '💷' },
        ]
      : [
          { label: 'Demand', value: 'Standard', detail: 'Log a completed event to start learning', emoji: '📊' },
        ],
    drivers: [
      `${tempBucketLabel(context.forecastTempC)} forecast`,
      sample > 0 ? `${sample} past event${sample === 1 ? '' : 's'} on record` : 'No completed events yet',
      'Generic engine — set a more specific trade type for sharper forecasts',
    ],
    weatherImpact: context.forecastTempC >= 22
      ? 'Warm — drinks and outdoor demand lift.'
      : context.forecastTempC < 12
        ? 'Cold — hot food and footfall both soften.'
        : 'Comfortable — close to your typical day.',
    confidence: level,
    confidenceReason: reason,
    basedOnEvents: sample,
    learningMode: sample === 0,
  };
}

// ── Shared helpers ─────────────────────────────────────────────────────

function totalRevenueOf(o: EventObservation): number {
  // Sales total: prefer VAT-split, fall back to gross_sales (for events
  // that haven't been split). We never use cost_of_goods.
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
      detail: tempC < 12 ? 'Cold day softens demand — tighten perishables.' : 'Below-average day expected — tighten prep.',
    };
  }
  return {
    label: '−40% vs typical',
    detail: 'Plan a quieter day — reduce perishable orders.',
  };
}

/** When we have no line-item data, fall back to a temp-led cold-share
 *  heuristic for desserts. */
function weatherWarmthAsColdShare(tempC: number): number {
  if (tempC < 12) return 0.30;
  if (tempC < 18) return 0.45;
  if (tempC < 23) return 0.65;
  return 0.80;
}
