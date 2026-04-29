import React from 'react';
import { View, Text } from 'react-native';
import { useAllHistoricalTakings } from '@/lib/queries/dailyTakings';
import { predictDrinkSplit, projectDayTakings, computePredictionAccuracy } from '@/lib/drinkSplitEngine';
import { formatCurrency } from '@/lib/formatters';

const MIN_DATA_POINTS = 5;

interface Props {
  forecastTempC: number;
  expectedTakings?: number;
}

const CONFIDENCE_STYLES = {
  high:   { bg: '#dcfce7', text: '#166534', label: 'High confidence' },
  medium: { bg: '#fef9c3', text: '#854d0e', label: 'Medium confidence' },
  low:    { bg: '#f1f5f9', text: '#475569', label: 'Low confidence — needs more data' },
};

const BRACKET_LABELS: Record<string, string> = {
  cold: '❄️ Cold',
  cool: '🌤 Cool',
  warm: '☀️ Warm',
  hot:  '🔥 Hot',
};

export function DrinkSplitInsightCard({ forecastTempC, expectedTakings }: Props) {
  const { dailyTakings, eventFinancials, totalDataPoints } = useAllHistoricalTakings();

  // Not enough data yet — show guidance instead of low-confidence defaults
  if (totalDataPoints < MIN_DATA_POINTS) {
    return (
      <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f5f5f4', padding: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <Text style={{ fontWeight: '700', fontSize: 14, color: '#1c1917' }}>🧠 Drink Split Prediction</Text>
          <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: '#475569' }}>Learning…</Text>
          </View>
        </View>
        <Text style={{ fontSize: 13, color: '#78716c', lineHeight: 20, marginBottom: 8 }}>
          Not enough data yet — predictions will improve as you record more days.
        </Text>
        <View style={{ backgroundColor: '#fafaf9', borderRadius: 10, padding: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, color: '#a8a29e' }}>Data points collected</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#78350f' }}>{totalDataPoints} / {MIN_DATA_POINTS}</Text>
          </View>
          <View style={{ marginTop: 6, height: 4, backgroundColor: '#f5f5f4', borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(100, (totalDataPoints / MIN_DATA_POINTS) * 100)}%`, height: 4, backgroundColor: '#b45309', borderRadius: 2 }} />
          </View>
          <Text style={{ fontSize: 10, color: '#a8a29e', marginTop: 6 }}>
            Record daily takings or upload a sales CSV to start training the engine.
          </Text>
        </View>
      </View>
    );
  }

  const prediction = predictDrinkSplit(forecastTempC, dailyTakings, eventFinancials);
  const projection = expectedTakings ? projectDayTakings(expectedTakings, prediction) : null;
  const confStyle  = CONFIDENCE_STYLES[prediction.confidence];
  const accuracy   = computePredictionAccuracy(dailyTakings, eventFinancials);

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f5f5f4', padding: 16, marginBottom: 12 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 14, color: '#1c1917' }}>🧠 Drink Split Prediction</Text>
          <Text style={{ fontSize: 11, color: '#78716c', marginTop: 1 }}>{prediction.tempBracket} · {forecastTempC.toFixed(0)}°C forecast</Text>
        </View>
        <View style={{ backgroundColor: confStyle.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
          <Text style={{ fontSize: 10, fontWeight: '600', color: confStyle.text }}>{confStyle.label}</Text>
        </View>
      </View>

      {/* Split bar */}
      <View style={{ flexDirection: 'row', borderRadius: 999, overflow: 'hidden', height: 20, marginBottom: 8 }}>
        <View style={{ flex: prediction.hotPct, backgroundColor: '#b45309', justifyContent: 'center', alignItems: 'center' }}>
          {prediction.hotPct > 20 && <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>☕ {prediction.hotPct}%</Text>}
        </View>
        <View style={{ flex: prediction.icedPct, backgroundColor: '#7dd3fc', justifyContent: 'center', alignItems: 'center' }}>
          {prediction.icedPct > 20 && <Text style={{ fontSize: 10, fontWeight: '700', color: '#0c4a6e' }}>🧊 {prediction.icedPct}%</Text>}
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 11, color: '#92400e' }}>☕ Hot: {prediction.hotPct}% (20% VAT)</Text>
        <Text style={{ fontSize: 11, color: '#0369a1' }}>🧊 Iced: {prediction.icedPct}% (0% VAT)</Text>
      </View>

      <Text style={{ fontSize: 10, color: '#a8a29e', marginBottom: projection ? 12 : 8 }}>
        {prediction.basedOnDays > 0
          ? `Based on ${prediction.basedOnDays} data point${prediction.basedOnDays !== 1 ? 's' : ''} in similar conditions` +
            (prediction.basedOnRealWeatherDays > 0 || prediction.basedOnHistoricalEvents > 0
              ? ` (${prediction.basedOnRealWeatherDays} real-weather day${prediction.basedOnRealWeatherDays !== 1 ? 's' : ''} + ${prediction.basedOnHistoricalEvents} historical)`
              : '')
          : 'Using default estimates — record more days to improve predictions'}
      </Text>

      {/* Projected takings breakdown */}
      {projection && (
        <View style={{ backgroundColor: '#fafaf9', borderRadius: 10, padding: 10, gap: 3, marginBottom: 10 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 2 }}>
            Projected for {formatCurrency(expectedTakings ?? 0)} takings:
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, color: '#78716c' }}>Hot drinks (inc VAT)</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#92400e' }}>{formatCurrency(projection.hotGross)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, color: '#78716c' }}>Iced drinks</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#0369a1' }}>{formatCurrency(projection.icedGross)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, color: '#dc2626' }}>VAT to collect</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#dc2626' }}>{formatCurrency(projection.vatAmount)}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: '#e2e8f0', marginVertical: 2 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1c1917' }}>Net Revenue</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>{formatCurrency(projection.netSales)}</Text>
          </View>
        </View>
      )}

      {/* Engine metrics */}
      <View style={{ borderTopWidth: 1, borderTopColor: '#f5f5f4', paddingTop: 10, gap: 6 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: '#a8a29e', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Learning from {totalDataPoints} trading day{totalDataPoints !== 1 ? 's' : ''}
        </Text>

        {/* Bracket breakdown */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {(Object.entries(prediction.bracketBreakdown) as [string, number][])
            .filter(([, count]) => count > 0)
            .map(([bracket, count]) => (
              <View key={bracket} style={{ backgroundColor: '#f5f5f4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ fontSize: 10, color: '#57534e' }}>{BRACKET_LABELS[bracket] ?? bracket}: {count}</Text>
              </View>
            ))}
        </View>

        {/* Accuracy metric */}
        {accuracy && (
          <Text style={{ fontSize: 10, color: '#78716c' }}>
            Avg prediction error: <Text style={{ fontWeight: '600', color: accuracy.avgErrorPct < 10 ? '#16a34a' : accuracy.avgErrorPct < 20 ? '#b45309' : '#dc2626' }}>
              ±{accuracy.avgErrorPct.toFixed(1)}%
            </Text>
            {' '}across {accuracy.sampleCount} day{accuracy.sampleCount !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
    </View>
  );
}
