import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MonthlyRevenue } from '@/types';
import { formatCurrencyCompact } from '@/lib/formatters';

const CHART_HEIGHT = 150;
const BAR_AREA_HEIGHT = CHART_HEIGHT - 24;

interface Props {
  data: MonthlyRevenue[];
}

export function RevenueBarChart({ data }: Props) {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const maxValue = Math.max(...data.map((d) => Math.max(d.grossSales, d.netProfit)), 1);
  const hasAnyData = data.some((d) => d.grossSales > 0 || d.netProfit !== 0);

  const selected = selectedMonth != null ? data[selectedMonth] : null;

  return (
    <View
      className="bg-white rounded-2xl p-4 border border-stone-100"
      style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}
    >
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

          {/* Tooltip card — floating, styled, with icon */}
          <View style={{ minHeight: 54, marginBottom: 6, justifyContent: 'center' }}>
            {selected ? (
              <View
                style={{
                  backgroundColor: '#1c1917',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  elevation: 3,
                  shadowColor: '#000',
                  shadowOpacity: 0.18,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                }}
              >
                <View
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    backgroundColor: '#78350f', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Ionicons name="stats-chart" size={14} color="#fbbf24" />
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>{selected.month}</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
                    <Text style={{ fontSize: 11, color: '#fbbf24', fontWeight: '600' }}>
                      Gross {formatCurrencyCompact(selected.grossSales)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: selected.netProfit >= 0 ? '#4ade80' : '#f87171',
                        fontWeight: '600',
                      }}
                    >
                      Net {formatCurrencyCompact(selected.netProfit)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="information-circle-outline" size={12} color="#a8a29e" />
                <Text style={{ fontSize: 11, color: '#a8a29e' }}>Tap a bar for details</Text>
              </View>
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
                  {/* Selected highlight behind bars */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      gap: 2,
                      height: BAR_AREA_HEIGHT,
                      width: '100%',
                      paddingHorizontal: 2,
                      paddingTop: 4,
                      borderRadius: 8,
                      backgroundColor: isSelected ? '#fef3c7' : 'transparent',
                      borderWidth: isSelected ? 1 : 0,
                      borderColor: '#fcd34d',
                      opacity: isDimmed ? 0.35 : 1,
                    }}
                  >
                    <View
                      style={{
                        width: '42%',
                        height: grossHeight,
                        backgroundColor: isSelected ? '#f59e0b' : '#fbbf24',
                        borderTopLeftRadius: 3,
                        borderTopRightRadius: 3,
                      }}
                    />
                    <View
                      style={{
                        width: '42%',
                        height: netHeight,
                        backgroundColor: isSelected ? '#16a34a' : '#22c55e',
                        borderTopLeftRadius: 3,
                        borderTopRightRadius: 3,
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 10,
                      color: isSelected ? '#b45309' : '#a8a29e',
                      marginTop: 4,
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
