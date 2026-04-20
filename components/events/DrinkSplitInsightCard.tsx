import React from 'react';
import { View, Text } from 'react-native';
import { useAllDailyTakings } from '@/lib/queries/dailyTakings';
import { predictDrinkSplit, projectDayTakings } from '@/lib/drinkSplitEngine';
import { formatCurrency } from '@/lib/formatters';

interface Props {
  forecastTempC: number;
  expectedTakings?: number;
}

const CONFIDENCE_STYLES = {
  high:   { bg: '#dcfce7', text: '#166534', label: 'High confidence' },
  medium: { bg: '#fef9c3', text: '#854d0e', label: 'Medium confidence' },
  low:    { bg: '#f1f5f9', text: '#475569', label: 'Low confidence — needs more data' },
};

export function DrinkSplitInsightCard({ forecastTempC, expectedTakings }: Props) {
  const { data: historicalDays = [] } = useAllDailyTakings();
  const prediction  = predictDrinkSplit(forecastTempC, historicalDays);
  const projection  = expectedTakings ? projectDayTakings(expectedTakings, prediction) : null;
  const confStyle   = CONFIDENCE_STYLES[prediction.confidence];

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f5f5f4', padding: 16, marginBottom: 12 }}>
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

      <Text style={{ fontSize: 10, color: '#a8a29e', marginBottom: projection ? 12 : 0 }}>
        {prediction.basedOnDays > 0
          ? `Based on ${prediction.basedOnDays} trading day${prediction.basedOnDays > 1 ? 's' : ''} in similar conditions`
          : 'Using default estimates — record your first days to improve predictions'}
      </Text>

      {projection && (
        <View style={{ backgroundColor: '#fafaf9', borderRadius: 10, padding: 10, gap: 3 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 2 }}>
            Projected for {formatCurrency(expectedTakings!)} takings:
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
    </View>
  );
}
