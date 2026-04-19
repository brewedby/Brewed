import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  title: string;
  value: string;
  subtext?: string;
  subtitle?: string;
  icon?: string;
  trendValue?: number;
  colorScheme?: 'default' | 'green' | 'amber' | 'red';
}

const ACCENT_HEX = {
  default: '#d6d3d1',
  green: '#16a34a',
  amber: '#d97706',
  red: '#dc2626',
};

export const StatCard = React.memo(function StatCard({
  title, value, subtext, subtitle, icon, trendValue, colorScheme = 'default',
}: Props) {
  const valueColors = {
    default: 'text-stone-900',
    green: 'text-green-700',
    amber: 'text-amber-700',
    red: 'text-red-600',
  };

  return (
    <View
      className="bg-white rounded-2xl border border-stone-100 flex-1 overflow-hidden"
      style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}
    >
      <View style={{ height: 3, backgroundColor: ACCENT_HEX[colorScheme] }} />
      <View className="p-4">
        <View className="flex-row items-center justify-between mb-2 min-h-[20px]">
          {icon ? <Text className="text-xl">{icon}</Text> : <View />}
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
        {subtitle && <Text className="text-stone-400 text-xs mt-1">{subtitle}</Text>}
      </View>
    </View>
  );
});
