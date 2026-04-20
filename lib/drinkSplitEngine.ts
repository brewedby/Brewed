import type { DailyTakings, DrinkSplitPrediction } from '@/types';

export interface EventFinancialSummary {
  standard_rated_sales: number;
  zero_rated_sales: number;
  avg_temp_c: number | null;
  month: number;
}

// UK average daily high temperatures (°C) by month, Jan–Dec
const UK_MONTHLY_AVG_TEMP = [5, 6, 8, 11, 14, 17, 19, 19, 16, 12, 8, 5];

interface DataPoint {
  tempC: number;
  hotPct: number;
}

function getTempBracket(tempC: number): string {
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

function avgOf(points: DataPoint[]): number {
  return points.reduce((s, p) => s + p.hotPct, 0) / points.length;
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

  // ── event_financials rows (infer temp from month if null) ─────────────
  const eventPoints: DataPoint[] = historicalEventFinancials
    .filter((f) => (f.standard_rated_sales + f.zero_rated_sales) > 0)
    .map((f) => ({
      tempC: f.avg_temp_c ?? UK_MONTHLY_AVG_TEMP[f.month - 1],
      hotPct: (f.standard_rated_sales / (f.standard_rated_sales + f.zero_rated_sales)) * 100,
    }));

  // daily_takings are duplicated (2× weight) because they have real weather data
  const dailyPoints: DataPoint[] = validDays.flatMap((d) => {
    const hotPct = (d.hot_drinks_sales / (d.hot_drinks_sales + d.iced_drinks_sales)) * 100;
    const point = { tempC: d.avg_temp_c!, hotPct };
    return [point, point];
  });

  const allPoints = [...dailyPoints, ...eventPoints];

  // unique source counts for labels & thresholds (not doubled)
  const realWeatherDaysInBracket = validDays.filter(
    (d) => getTempBracket(d.avg_temp_c!) === targetBracket,
  ).length;
  const eventPointsInBracket = eventPoints.filter(
    (p) => getTempBracket(p.tempC) === targetBracket,
  ).length;
  const uniqueInBracket = realWeatherDaysInBracket + eventPointsInBracket;

  // weighted points for the target bracket (daily = 2 entries, event = 1)
  const bracketPoints = allPoints.filter((p) => getTempBracket(p.tempC) === targetBracket);

  if (uniqueInBracket >= 3) {
    const avg = avgOf(bracketPoints);
    return {
      hotPct: Math.round(avg),
      icedPct: Math.round(100 - avg),
      confidence: uniqueInBracket >= 8 ? 'high' : 'medium',
      basedOnDays: uniqueInBracket,
      basedOnRealWeatherDays: realWeatherDaysInBracket,
      basedOnHistoricalEvents: eventPointsInBracket,
      tempBracket: getTempBracketLabel(targetBracket),
    };
  }

  if (bracketPoints.length > 0 && allPoints.length > 0) {
    const blended = avgOf(bracketPoints) * 0.7 + avgOf(allPoints) * 0.3;
    return {
      hotPct: Math.round(blended),
      icedPct: Math.round(100 - blended),
      confidence: 'low',
      basedOnDays: uniqueInBracket,
      basedOnRealWeatherDays: realWeatherDaysInBracket,
      basedOnHistoricalEvents: eventPointsInBracket,
      tempBracket: getTempBracketLabel(targetBracket),
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
