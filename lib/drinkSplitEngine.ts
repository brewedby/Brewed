import type { DailyTakings, DrinkSplitPrediction } from '@/types';

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

export function predictDrinkSplit(
  forecastTempC: number,
  historicalDays: DailyTakings[],
): DrinkSplitPrediction {
  const validDays = historicalDays.filter(
    (d) => d.avg_temp_c !== null && d.total_takings > 0 && (d.hot_drinks_sales + d.iced_drinks_sales) > 0,
  );

  const targetBracket = getTempBracket(forecastTempC);
  const bracketDays = validDays.filter((d) => getTempBracket(d.avg_temp_c!) === targetBracket);

  if (bracketDays.length >= 3) {
    const avgHotPct = bracketDays.reduce((sum, d) => {
      const total = d.hot_drinks_sales + d.iced_drinks_sales;
      return sum + (d.hot_drinks_sales / total) * 100;
    }, 0) / bracketDays.length;

    return {
      hotPct: Math.round(avgHotPct),
      icedPct: Math.round(100 - avgHotPct),
      confidence: bracketDays.length >= 8 ? 'high' : 'medium',
      basedOnDays: bracketDays.length,
      tempBracket: getTempBracketLabel(targetBracket),
    };
  }

  if (bracketDays.length > 0 && validDays.length > 0) {
    const bracketAvg = bracketDays.reduce((sum, d) => {
      const total = d.hot_drinks_sales + d.iced_drinks_sales;
      return sum + (d.hot_drinks_sales / total) * 100;
    }, 0) / bracketDays.length;

    const overallAvg = validDays.reduce((sum, d) => {
      const total = d.hot_drinks_sales + d.iced_drinks_sales;
      return sum + (d.hot_drinks_sales / total) * 100;
    }, 0) / validDays.length;

    const blended = bracketAvg * 0.7 + overallAvg * 0.3;

    return {
      hotPct: Math.round(blended),
      icedPct: Math.round(100 - blended),
      confidence: 'low',
      basedOnDays: bracketDays.length,
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
