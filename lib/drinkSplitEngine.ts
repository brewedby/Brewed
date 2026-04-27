import type { DailyTakings, DrinkSplitPrediction } from '@/types';

export interface EventFinancialSummary {
  standard_rated_sales: number;
  zero_rated_sales: number;
  avg_temp_c: number | null;
  month: number;
  date?: string; // ISO date — used for recency weighting
}

// UK average daily high temperatures (°C) by month, Jan–Dec
const UK_MONTHLY_AVG_TEMP = [5, 6, 8, 11, 14, 17, 19, 19, 16, 12, 8, 5];

interface DataPoint {
  tempC: number;
  hotPct: number;
  date?: string;
}

function getTempBracket(tempC: number): 'cold' | 'cool' | 'warm' | 'hot' {
  if (tempC < 12) return 'cold';
  if (tempC < 18) return 'cool';
  if (tempC < 23) return 'warm';
  return 'hot';
}

function getTempBracketLabel(bracket: string): string {
  const labels: Record<string, string> = {
    cold: 'Cold (< 12°C)',
    cool: 'Cool (12–17°C)',
    warm: 'Warm (18–22°C)',
    hot:  'Hot (23°C+)',
  };
  return labels[bracket] ?? bracket;
}

// Continuous recency decay: 10% per 90 days of age, floored at 20%
function recencyWeight(dateStr: string | undefined): number {
  if (!dateStr) return 1;
  const ageDays = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0.2, 1 - (ageDays / 90) * 0.1);
}

function weightedAvgOf(points: DataPoint[]): number {
  if (points.length === 0) return 0;
  const totalW = points.reduce((s, p) => s + recencyWeight(p.date), 0);
  if (totalW === 0) return points.reduce((s, p) => s + p.hotPct, 0) / points.length;
  return points.reduce((s, p) => s + p.hotPct * recencyWeight(p.date), 0) / totalW;
}

export function predictDrinkSplit(
  forecastTempC: number,
  historicalDays: DailyTakings[],
  historicalEventFinancials: EventFinancialSummary[] = [],
): DrinkSplitPrediction {
  const targetBracket = getTempBracket(forecastTempC);

  // ── daily_takings rows (must have temp + split data) ──────────────────
  const validDays = historicalDays.filter(
    (d) => d.avg_temp_c !== null && d.total_takings > 0 && (d.hot_drinks_sales + d.iced_drinks_sales) > 0,
  );

  // ── event_financials + COGS CSV rows (infer temp from month if null) ──
  const eventPoints: DataPoint[] = historicalEventFinancials
    .filter((f) => (f.standard_rated_sales + f.zero_rated_sales) > 0)
    .map((f) => ({
      tempC:  f.avg_temp_c ?? UK_MONTHLY_AVG_TEMP[f.month - 1],
      hotPct: (f.standard_rated_sales / (f.standard_rated_sales + f.zero_rated_sales)) * 100,
      date:   f.date,
    }));

  // daily_takings duplicated (2× weight) because they have real weather data;
  // recency weighting applied within weightedAvgOf
  const dailyPoints: DataPoint[] = validDays.flatMap((d) => {
    const point: DataPoint = {
      tempC:  d.avg_temp_c!,
      hotPct: (d.hot_drinks_sales / (d.hot_drinks_sales + d.iced_drinks_sales)) * 100,
      date:   d.day_date,
    };
    return [point, point];
  });

  const allPoints = [...dailyPoints, ...eventPoints];

  // ── Bracket breakdown (unique source counts, not doubled) ─────────────
  const bracketBreakdown = { cold: 0, cool: 0, warm: 0, hot: 0 };
  validDays.forEach((d) => { bracketBreakdown[getTempBracket(d.avg_temp_c!)]++; });
  eventPoints.forEach((p) => { bracketBreakdown[getTempBracket(p.tempC)]++; });

  const totalDataPoints = validDays.length + eventPoints.length;

  const realWeatherDaysInBracket = validDays.filter((d) => getTempBracket(d.avg_temp_c!) === targetBracket).length;
  const eventPointsInBracket    = eventPoints.filter((p) => getTempBracket(p.tempC) === targetBracket).length;
  const uniqueInBracket = realWeatherDaysInBracket + eventPointsInBracket;

  const bracketPoints = allPoints.filter((p) => getTempBracket(p.tempC) === targetBracket);

  if (uniqueInBracket >= 3) {
    const avg = weightedAvgOf(bracketPoints);
    return {
      hotPct: Math.round(avg),
      icedPct: Math.round(100 - avg),
      confidence: uniqueInBracket >= 8 ? 'high' : 'medium',
      basedOnDays: uniqueInBracket,
      basedOnRealWeatherDays: realWeatherDaysInBracket,
      basedOnHistoricalEvents: eventPointsInBracket,
      tempBracket: getTempBracketLabel(targetBracket),
      totalDataPoints,
      bracketBreakdown,
    };
  }

  if (bracketPoints.length > 0 && allPoints.length > 0) {
    const blended = weightedAvgOf(bracketPoints) * 0.7 + weightedAvgOf(allPoints) * 0.3;
    return {
      hotPct: Math.round(blended),
      icedPct: Math.round(100 - blended),
      confidence: 'low',
      basedOnDays: uniqueInBracket,
      basedOnRealWeatherDays: realWeatherDaysInBracket,
      basedOnHistoricalEvents: eventPointsInBracket,
      tempBracket: getTempBracketLabel(targetBracket),
      totalDataPoints,
      bracketBreakdown,
    };
  }

  const defaults: Record<string, { hot: number; iced: number }> = {
    cold: { hot: 82, iced: 18 },
    cool: { hot: 65, iced: 35 },
    warm: { hot: 45, iced: 55 },
    hot:  { hot: 22, iced: 78 },
  };
  const d = defaults[targetBracket];
  return {
    hotPct: d.hot,
    icedPct: d.iced,
    confidence: 'low',
    basedOnDays: 0,
    basedOnRealWeatherDays: 0,
    basedOnHistoricalEvents: 0,
    tempBracket: getTempBracketLabel(targetBracket),
    totalDataPoints,
    bracketBreakdown,
  };
}

// Leave-one-out accuracy: predicts each saved day using all other data, compares to actual.
// Returns null if any bracket being tested has fewer than 2 data points (insufficient
// for a meaningful in-bracket prediction once the held-out day is removed).
export function computePredictionAccuracy(
  historicalDays: DailyTakings[],
  historicalEventFinancials: EventFinancialSummary[],
): { avgErrorPct: number; sampleCount: number } | null {
  const validDays = historicalDays.filter(
    (d) => d.avg_temp_c !== null && d.total_takings > 0 && (d.hot_drinks_sales + d.iced_drinks_sales) > 0,
  );
  if (validDays.length === 0) return null;

  // Count points per bracket from BOTH sources (daily_takings + event financials)
  const bracketCounts: Record<string, number> = { cold: 0, cool: 0, warm: 0, hot: 0 };
  validDays.forEach((d) => { bracketCounts[getTempBracket(d.avg_temp_c!)]++; });
  historicalEventFinancials
    .filter((f) => (f.standard_rated_sales + f.zero_rated_sales) > 0)
    .forEach((f) => {
      const tempC = f.avg_temp_c ?? UK_MONTHLY_AVG_TEMP[f.month - 1];
      bracketCounts[getTempBracket(tempC)]++;
    });

  // Only test days whose bracket has >= 2 points (so leave-one-out still has 1+ point left)
  const testableDays = validDays.filter((d) => bracketCounts[getTempBracket(d.avg_temp_c!)] >= 2);
  if (testableDays.length === 0) return null;

  const errors: number[] = [];
  for (const day of testableDays) {
    const otherDays = historicalDays.filter((d) => d.id !== day.id);
    const pred = predictDrinkSplit(day.avg_temp_c!, otherDays, historicalEventFinancials);
    const actualHotPct = (day.hot_drinks_sales / (day.hot_drinks_sales + day.iced_drinks_sales)) * 100;
    errors.push(Math.abs(pred.hotPct - actualHotPct));
  }

  if (errors.length === 0) return null;
  return {
    avgErrorPct: errors.reduce((a, b) => a + b, 0) / errors.length,
    sampleCount: errors.length,
  };
}

export function projectDayTakings(totalTakings: number, prediction: DrinkSplitPrediction) {
  const hotGross = totalTakings * (prediction.hotPct / 100);
  const icedGross = totalTakings * (prediction.icedPct / 100);
  const hotNet = hotGross / 1.2;
  const vatAmount = hotGross - hotNet;
  const netSales = hotNet + icedGross;
  return { hotGross, icedGross, hotNet, vatAmount, netSales };
}
