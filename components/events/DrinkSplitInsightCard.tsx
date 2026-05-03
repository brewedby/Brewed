import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/lib/themeContext';
import { useAllHistoricalTakings } from '@/lib/queries/dailyTakings';
import { predictDrinkSplit, projectDayTakings, computePredictionAccuracy } from '@/lib/drinkSplitEngine';
import { formatCurrency } from '@/lib/formatters';
import { MIN_PREDICTION_DATA_POINTS as MIN_DATA_POINTS } from '@/constants';

interface Props {
  forecastTempC: number;
  expectedTakings?: number;
}

const BRACKET_LABELS: Record<string, string> = {
  cold: '❄️ Cold',
  cool: '🌤 Cool',
  warm: '☀️ Warm',
  hot:  '🔥 Hot',
};

export function DrinkSplitInsightCard({ forecastTempC, expectedTakings }: Props) {
  const { tokens, isDark } = useTheme();
  const p = tokens.palette;
  const { dailyTakings, eventFinancials, totalDataPoints } = useAllHistoricalTakings();

  const confidenceLabel = (key: 'high' | 'medium' | 'low') => {
    if (key === 'high') return { color: '#22c55e', label: 'High confidence' };
    if (key === 'medium') return { color: p.brand, label: 'Medium confidence' };
    return { color: p.textFaint, label: 'Low confidence — needs more data' };
  };

  if (totalDataPoints < MIN_DATA_POINTS) {
    return (
      <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <Text style={{ fontFamily: tokens.type.display, fontSize: 16, color: p.text }}>Drink Split Prediction</Text>
          <View style={{ borderWidth: 1, borderColor: p.border, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: p.textMuted, textTransform: 'uppercase' }}>Learning…</Text>
          </View>
        </View>
        <Text style={{ fontSize: 13, color: p.textMuted, lineHeight: 20, marginBottom: 8 }}>
          Not enough data yet — predictions will improve as you record more days.
        </Text>
        <View style={{ backgroundColor: p.surfaceAlt, padding: 10, borderWidth: 1, borderColor: p.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, color: p.textFaint }}>Data points collected</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: p.brand }}>{totalDataPoints} / {MIN_DATA_POINTS}</Text>
          </View>
          <View style={{ marginTop: 6, height: 4, backgroundColor: p.border, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(100, (totalDataPoints / MIN_DATA_POINTS) * 100)}%`, height: 4, backgroundColor: p.brand }} />
          </View>
          <Text style={{ fontSize: 10, color: p.textFaint, marginTop: 6 }}>
            Record daily takings or upload a sales CSV to start training the engine.
          </Text>
        </View>
      </View>
    );
  }

  const prediction = predictDrinkSplit(forecastTempC, dailyTakings, eventFinancials);
  const projection = expectedTakings ? projectDayTakings(expectedTakings, prediction) : null;
  const conf = confidenceLabel(prediction.confidence);
  const accuracy = computePredictionAccuracy(dailyTakings, eventFinancials);

  const hotColor = p.brand;
  const icedColor = isDark ? '#7dd3fc' : '#0369a1';
  const icedBarBg = isDark ? '#0ea5e9' : '#7dd3fc';

  return (
    <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 16, marginBottom: 12 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <View>
          <Text style={{ fontFamily: tokens.type.display, fontSize: 16, color: p.text }}>Drink Split Prediction</Text>
          <Text style={{ fontSize: 11, color: p.textMuted, marginTop: 1 }}>
            {prediction.tempBracket} · {forecastTempC.toFixed(0)}°C forecast
          </Text>
        </View>
        <View style={{ borderWidth: 1, borderColor: conf.color, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: conf.color, textTransform: 'uppercase' }}>{conf.label}</Text>
        </View>
      </View>

      {/* Split bar */}
      <View style={{ flexDirection: 'row', overflow: 'hidden', height: 20, marginBottom: 8, borderWidth: 1, borderColor: p.border }}>
        <View style={{ flex: prediction.hotPct, backgroundColor: hotColor, justifyContent: 'center', alignItems: 'center' }}>
          {prediction.hotPct > 20 && <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>☕ {prediction.hotPct}%</Text>}
        </View>
        <View style={{ flex: prediction.icedPct, backgroundColor: icedBarBg, justifyContent: 'center', alignItems: 'center' }}>
          {prediction.icedPct > 20 && <Text style={{ fontSize: 10, fontWeight: '700', color: '#0c4a6e' }}>🧊 {prediction.icedPct}%</Text>}
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 11, color: hotColor }}>☕ Hot: {prediction.hotPct}% (20% VAT)</Text>
        <Text style={{ fontSize: 11, color: icedColor }}>🧊 Iced: {prediction.icedPct}% (0% VAT)</Text>
      </View>

      <Text style={{ fontSize: 10, color: p.textFaint, marginBottom: projection ? 12 : 8 }}>
        {prediction.basedOnDays > 0
          ? `Based on ${prediction.basedOnDays} data point${prediction.basedOnDays !== 1 ? 's' : ''} in similar conditions` +
            (prediction.basedOnRealWeatherDays > 0 || prediction.basedOnHistoricalEvents > 0
              ? ` (${prediction.basedOnRealWeatherDays} real-weather day${prediction.basedOnRealWeatherDays !== 1 ? 's' : ''} + ${prediction.basedOnHistoricalEvents} historical)`
              : '')
          : 'Using default estimates — record more days to improve predictions'}
      </Text>

      {/* Projected takings breakdown */}
      {projection && (
        <View style={{ backgroundColor: p.surfaceAlt, padding: 10, gap: 3, marginBottom: 10, borderWidth: 1, borderColor: p.border }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: p.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Projected for {formatCurrency(expectedTakings ?? 0)} takings
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, color: p.textMuted }}>Hot drinks (inc VAT)</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: hotColor }}>{formatCurrency(projection.hotGross)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, color: p.textMuted }}>Iced drinks</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: icedColor }}>{formatCurrency(projection.icedGross)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, color: '#dc2626' }}>VAT to collect</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#dc2626' }}>{formatCurrency(projection.vatAmount)}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: p.border, marginVertical: 2 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: p.text }}>Net Revenue</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#22c55e' }}>{formatCurrency(projection.netSales)}</Text>
          </View>
        </View>
      )}

      {/* Engine metrics */}
      <View style={{ borderTopWidth: 1, borderTopColor: p.border, borderStyle: 'dashed', paddingTop: 10, gap: 6 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: p.textFaint, textTransform: 'uppercase', letterSpacing: 1 }}>
          Learning from {totalDataPoints} trading day{totalDataPoints !== 1 ? 's' : ''}
        </Text>

        {/* Bracket breakdown */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {(Object.entries(prediction.bracketBreakdown) as [string, number][])
            .filter(([, count]) => count > 0)
            .map(([bracket, count]) => (
              <View key={bracket} style={{ borderWidth: 1, borderColor: p.border, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: p.textMuted }}>{BRACKET_LABELS[bracket] ?? bracket}: {count}</Text>
              </View>
            ))}
        </View>

        {/* Accuracy metric */}
        {accuracy && (
          <Text style={{ fontSize: 10, color: p.textMuted }}>
            Avg prediction error:{' '}
            <Text style={{ fontWeight: '600', color: accuracy.avgErrorPct < 10 ? '#22c55e' : accuracy.avgErrorPct < 20 ? p.brand : '#dc2626' }}>
              ±{accuracy.avgErrorPct.toFixed(1)}%
            </Text>
            {' '}across {accuracy.sampleCount} day{accuracy.sampleCount !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
    </View>
  );
}
