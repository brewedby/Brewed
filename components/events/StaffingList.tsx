import React from 'react';
import { View, Text } from 'react-native';
import { formatCurrency } from '@/lib/formatters';
import type { StaffingEntry } from '@/types';

interface Props {
  entries: StaffingEntry[];
}

export function StaffingList({ entries }: Props) {
  if (entries.length === 0) return null;

  return (
    <View className="bg-white rounded-2xl p-4 border border-stone-100">
      <Text className="font-bold text-stone-900 mb-3">Staffing</Text>
      {entries.map((entry) => (
        <View key={entry.id} className="flex-row justify-between items-center py-2 border-b border-stone-50 last:border-0">
          <View>
            <Text className="font-medium text-stone-900 text-sm">{entry.staff_name}</Text>
            <Text className="text-stone-400 text-xs mt-0.5">
              {entry.hours_worked}h @ {formatCurrency(entry.hourly_rate)}/hr
            </Text>
          </View>
          <Text className="font-semibold text-stone-700 text-sm">
            {formatCurrency(entry.hours_worked * entry.hourly_rate)}
          </Text>
        </View>
      ))}
      <View className="flex-row justify-between mt-2 pt-2 border-t border-stone-200">
        <Text className="font-semibold text-stone-700 text-sm">Total</Text>
        <Text className="font-bold text-stone-900 text-sm">
          {formatCurrency(entries.reduce((s, e) => s + e.hours_worked * e.hourly_rate, 0))}
        </Text>
      </View>
    </View>
  );
}
