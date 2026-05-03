import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/themeContext';
import type { MonthlyRevenue } from '@/types';
import { formatCurrencyCompact } from '@/lib/formatters';

const CHART_HEIGHT = 150;
const BAR_AREA_HEIGHT = CHART_HEIGHT - 24;

interface Props {
  data: MonthlyRevenue[];
}

export function RevenueBarChart({ data }: Props) {
  const { tokens, isDark } = useTheme();
  const p = tokens.palette;
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const maxValue = Math.max(...data.map((d) => Math.max(d.grossSales, d.netProfit)), 1);
  const hasAnyData = data.some((d) => d.grossSales > 0 || d.netProfit !== 0);

  const selected = selectedMonth != null ? data[selectedMonth] : null;

  const grossBarColor = p.brand;
  const grossActiveColor = isDark ? '#fbbf24' : '#d97706';
  const netBarColor = isDark ? '#4ade80' : '#22c55e';
  const netActiveColor = isDark ? '#22c55e' : '#16a34a';

  return (
    <View style={{ backgroundColor: p.surface, padding: 14, borderWidth: 1, borderColor: p.border }}>
      <Text style={{ fontFamily: tokens.type.display, fontSize: 16, color: p.text, marginBottom: 8 }}>
        Monthly Revenue {new Date().getFullYear()}
      </Text>

      {!hasAnyData ? (
        <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: p.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 16 }}>
            No revenue recorded for this year yet.
          </Text>
          <Text style={{ color: p.textFaint, fontSize: 11, textAlign: 'center', marginTop: 4, paddingHorizontal: 16 }}>
            Add financials to your events to see your monthly breakdown.
          </Text>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, backgroundColor: grossBarColor }} />
              <Text style={{ color: p.textMuted, fontSize: 11 }}>Gross Sales</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, backgroundColor: netBarColor }} />
              <Text style={{ color: p.textMuted, fontSize: 11 }}>Net Profit</Text>
            </View>
          </View>

          {/* Tooltip card */}
          <View style={{ minHeight: 54, marginBottom: 6, justifyContent: 'center' }}>
            {selected ? (
              <View
                style={{
                  backgroundColor: p.text, paddingHorizontal: 12, paddingVertical: 8,
                  alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 10,
                }}
              >
                <View>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: p.bg, letterSpacing: 0.5, textTransform: 'uppercase' }}>{selected.month}</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
                    <Text style={{ fontSize: 11, color: '#fbbf24', fontWeight: '600' }}>
                      Gross {formatCurrencyCompact(selected.grossSales)}
                    </Text>
                    <Text style={{ fontSize: 11, color: selected.netProfit >= 0 ? '#4ade80' : '#f87171', fontWeight: '600' }}>
                      Net {formatCurrencyCompact(selected.netProfit)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <Text style={{ fontSize: 11, color: p.textFaint }}>Tap a bar for details</Text>
            )}
          </View>

          <View style={{ height: CHART_HEIGHT, flexDirection: 'row', alignItems: 'flex-end', gap: 5 }}>
            {data.map((d, i) => {
              const grossHeight = maxValue > 0 ? (d.grossSales / maxValue) * BAR_AREA_HEIGHT : 0;
              const netHeight = maxValue > 0 ? (Math.max(d.netProfit, 0) / maxValue) * BAR_AREA_HEIGHT : 0;
              const isSelected = selectedMonth === i;
              const isDimmed = selectedMonth != null && !isSelected;
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.7}
                  onPress={() => setSelectedMonth(isSelected ? null : i)}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.month}: gross ${d.grossSales.toFixed(0)}, net ${d.netProfit.toFixed(0)}`}
                  accessibilityState={{ selected: isSelected }}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}
                >
                  <View
                    style={{
                      flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
                      gap: 2, height: BAR_AREA_HEIGHT, width: '100%',
                      paddingHorizontal: 2, paddingTop: 4,
                      backgroundColor: isSelected ? p.brandSoft : 'transparent',
                      borderWidth: isSelected ? 1 : 0,
                      borderColor: p.brand,
                      opacity: isDimmed ? 0.35 : 1,
                    }}
                  >
                    <View style={{ width: '42%', height: grossHeight, backgroundColor: isSelected ? grossActiveColor : grossBarColor }} />
                    <View style={{ width: '42%', height: netHeight, backgroundColor: isSelected ? netActiveColor : netBarColor }} />
                  </View>
                  <Text
                    style={{
                      fontSize: 10, marginTop: 4,
                      color: isSelected ? p.brand : p.textFaint,
                      fontWeight: isSelected ? '700' : '500',
                    }}
                  >
                    {d.month.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}
