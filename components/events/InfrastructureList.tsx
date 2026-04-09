import React from 'react';
import { View, Text } from 'react-native';
import { formatCurrency } from '@/lib/formatters';
import { INFRASTRUCTURE_CATEGORY_LABELS } from '@/constants';
import type { InfrastructureItem } from '@/types';

interface Props {
  items: InfrastructureItem[];
}

export function InfrastructureList({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <View className="bg-white rounded-2xl p-4 border border-stone-100">
      <Text className="font-bold text-stone-900 mb-3">Infrastructure Items</Text>
      {items.map((item) => (
        <View key={item.id} className="flex-row justify-between items-center py-2 border-b border-stone-50">
          <View className="flex-1 mr-3">
            <Text className="font-medium text-stone-900 text-sm">{item.description}</Text>
            <Text className="text-stone-400 text-xs mt-0.5">
              {INFRASTRUCTURE_CATEGORY_LABELS[item.category]}
            </Text>
          </View>
          <Text className="font-semibold text-stone-700 text-sm">{formatCurrency(item.cost)}</Text>
        </View>
      ))}
      <View className="flex-row justify-between mt-2 pt-2 border-t border-stone-200">
        <Text className="font-semibold text-stone-700 text-sm">Total</Text>
        <Text className="font-bold text-stone-900 text-sm">
          {formatCurrency(items.reduce((s, i) => s + i.cost, 0))}
        </Text>
      </View>
    </View>
  );
}
