import React from 'react';
import { View, Text } from 'react-native';
import { STATUS_PIE_COLORS, STATUS_LABELS } from '@/constants';
import type { StatusCount } from '@/types';

interface Props {
  data: StatusCount[];
}

export function StatusPieChart({ data }: Props) {
  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <View className="bg-white rounded-2xl p-4 border border-stone-100">
      <Text className="font-bold text-stone-900 mb-3">Applications Breakdown</Text>

      {/* Horizontal stacked bar */}
      <View className="flex-row rounded-full overflow-hidden h-5 mb-4">
        {data.map((d) => (
          <View
            key={d.status}
            style={{
              flex: d.count / total,
              backgroundColor: STATUS_PIE_COLORS[d.status],
            }}
          />
        ))}
      </View>

      {/* Legend */}
      <View className="flex-row flex-wrap gap-x-4 gap-y-2">
        {data.map((d) => (
          <View key={d.status} className="flex-row items-center gap-1.5">
            <View style={{ backgroundColor: STATUS_PIE_COLORS[d.status], width: 10, height: 10, borderRadius: 5 }} />
            <Text className="text-stone-600 text-xs">
              {STATUS_LABELS[d.status]}{' '}
              <Text className="font-bold text-stone-900">{d.count}</Text>
              <Text className="text-stone-400"> ({((d.count / total) * 100).toFixed(0)}%)</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
