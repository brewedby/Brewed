import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  title: string;
  value: string;
  subtext?: string;
  icon?: string;
  trendValue?: number;
  colorScheme?: 'default' | 'green' | 'amber' | 'red';
}

export function StatCard({ title, value, subtext, icon, trendValue, colorScheme = 'default' }: Props) {
  const bgColors = {
    default: 'bg-white',
    green: 'bg-green-50',
    amber: 'bg-amber-50',
    red: 'bg-red-50',
  };
  const valueColors = {
    default: 'text-stone-900',
    green: 'text-green-700',
    amber: 'text-amber-700',
    red: 'text-red-600',
  };

  return (
    <View className={`${bgColors[colorScheme]} rounded-2xl p-4 border border-stone-100 flex-1`}>
      <View className="flex-row items-center justify-between mb-2">
        {icon && <Text className="text-xl">{icon}</Text>}
        {trendValue !== undefined && (
          <View className={`flex-row items-center px-1.5 py-0.5 rounded-full ${trendValue >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
            <Text className={`text-xs font-medium ${trendValue >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {trendValue >= 0 ? '↑' : '↓'} {Math.abs(trendValue).toFixed(0)}%
            </Text>
          </View>
        )}
      </View>
      <Text className={`text-xl font-bold ${valueColors[colorScheme]}`} numberOfLines={1}>{value}</Text>
      <Text className="text-stone-500 text-xs mt-0.5">{title}</Text>
      {subtext && <Text className="text-stone-400 text-xs mt-1">{subtext}</Text>}
    </View>
  );
}
