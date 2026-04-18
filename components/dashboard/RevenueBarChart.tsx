import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { MonthlyRevenue } from '@/types';
import { formatCurrencyCompact } from '@/lib/formatters';

const CHART_HEIGHT = 140;

interface Props {
  data: MonthlyRevenue[];
}

export function RevenueBarChart({ data }: Props) {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const maxValue = Math.max(...data.map((d) => Math.max(d.grossSales, d.netProfit)), 1);
  const hasAnyData = data.some((d) => d.grossSales > 0 || d.netProfit !== 0);

  const selected = selectedMonth != null ? data[selectedMonth] : null;

  return (
    <View className="bg-white rounded-2xl p-4 border border-stone-100">
      <Text className="font-bold text-stone-900 mb-2">Monthly Revenue {new Date().getFullYear()}</Text>

      {!hasAnyData ? (
        <View className="py-8 items-center justify-center">
          <Text className="text-3xl mb-2">📊</Text>
          <Text className="text-stone-500 text-sm text-center px-4">
            No revenue recorded for this year yet.
          </Text>
          <Text className="text-stone-400 text-xs text-center mt-1 px-4">
            Add financials to your events to see your monthly breakdown.
          </Text>
        </View>
      ) : (
        <>
          <View className="flex-row items-center gap-4 mb-3">
            <View className="flex-row items-center gap-1.5">
              <View className="w-3 h-3 rounded-sm bg-amber-400" />
              <Text className="text-stone-500 text-xs">Gross Sales</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-3 h-3 rounded-sm bg-green-500" />
              <Text className="text-stone-500 text-xs">Net Profit</Text>
            </View>
          </View>

          {/* Tooltip */}
          <View style={{ minHeight: 34, marginBottom: 4 }}>
            {selected ? (
              <View style={{ backgroundColor: '#fef3c7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#78350f' }}>{selected.month}</Text>
                <Text style={{ fontSize: 10, color: '#92400e' }}>
                  Gross {formatCurrencyCompact(selected.grossSales)} · Net {formatCurrencyCompact(selected.netProfit)}
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 10, color: '#a8a29e' }}>Tap a bar for details</Text>
            )}
          </View>

          <View style={{ height: CHART_HEIGHT, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
            {data.map((d, i) => {
              const grossHeight = maxValue > 0 ? (d.grossSales / maxValue) * (CHART_HEIGHT - 20) : 0;
              const netHeight = maxValue > 0 ? (Math.max(d.netProfit, 0) / maxValue) * (CHART_HEIGHT - 20) : 0;
              const isSelected = selectedMonth === i;
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.7}
                  onPress={() => setSelectedMonth(isSelected ? null : i)}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.month}: gross ${d.grossSales.toFixed(0)}, net ${d.netProfit.toFixed(0)}`}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: CHART_HEIGHT - 20, opacity: isSelected || selectedMonth == null ? 1 : 0.4 }}>
                    <View style={{ width: '45%', height: grossHeight, backgroundColor: '#fbbf24', borderRadius: 2 }} />
                    <View style={{ width: '45%', height: netHeight, backgroundColor: '#22c55e', borderRadius: 2 }} />
                  </View>
                  <Text style={{ fontSize: 9, color: isSelected ? '#b45309' : '#a8a29e', marginTop: 2, fontWeight: isSelected ? '700' : '500' }}>
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
