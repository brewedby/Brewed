import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import type { MonthlyRevenue } from '@/types';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;
const CHART_HEIGHT = 140;

interface Props {
  data: MonthlyRevenue[];
}

export function RevenueBarChart({ data }: Props) {
  const maxValue = Math.max(...data.map((d) => Math.max(d.grossSales, d.netProfit)), 1);

  return (
    <View className="bg-white rounded-2xl p-4 border border-stone-100">
      <Text className="font-bold text-stone-900 mb-2">Monthly Revenue {new Date().getFullYear()}</Text>
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

      <View style={{ height: CHART_HEIGHT, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
        {data.map((d, i) => {
          const grossHeight = maxValue > 0 ? (d.grossSales / maxValue) * (CHART_HEIGHT - 20) : 0;
          const netHeight = maxValue > 0 ? (Math.max(d.netProfit, 0) / maxValue) * (CHART_HEIGHT - 20) : 0;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: CHART_HEIGHT - 20 }}>
                <View style={{ width: '45%', height: grossHeight, backgroundColor: '#fbbf24', borderRadius: 2 }} />
                <View style={{ width: '45%', height: netHeight, backgroundColor: '#22c55e', borderRadius: 2 }} />
              </View>
              <Text style={{ fontSize: 8, color: '#a8a29e', marginTop: 2 }}>
                {d.month.slice(0, 1)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
