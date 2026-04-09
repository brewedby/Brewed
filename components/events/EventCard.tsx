import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { EventStatusBadge } from '@/components/shared/EventStatusBadge';
import { formatDateRange, formatCurrency } from '@/lib/formatters';
import type { EventWithFinancials } from '@/types';

interface Props {
  event: EventWithFinancials;
}

export function EventCard({ event }: Props) {
  const router = useRouter();
  const fin = event.event_financials;
  const calc = event.calculations;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/events/${event.id}`)}
      className="bg-white rounded-2xl p-4 mb-3 border border-stone-100 shadow-sm"
      activeOpacity={0.7}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-3">
          <Text className="font-semibold text-stone-900 text-base" numberOfLines={1}>
            {event.name}
          </Text>
          <Text className="text-stone-500 text-sm mt-0.5" numberOfLines={1}>
            {event.location}
          </Text>
        </View>
        <EventStatusBadge status={event.status} />
      </View>

      <View className="flex-row items-center justify-between mt-1">
        <View className="flex-row items-center gap-3">
          <Text className="text-stone-400 text-xs">
            📅 {formatDateRange(event.date, event.end_date)}
          </Text>
          {event.concessions_companies && (
            <Text className="text-stone-400 text-xs" numberOfLines={1}>
              🏢 {event.concessions_companies.name}
            </Text>
          )}
        </View>
      </View>

      {fin && (fin.gross_sales > 0 || calc.netProfit !== 0) && (
        <View className="flex-row mt-3 pt-3 border-t border-stone-100 gap-4">
          <View>
            <Text className="text-stone-400 text-xs">Gross Sales</Text>
            <Text className="font-semibold text-stone-900 text-sm">{formatCurrency(fin.gross_sales)}</Text>
          </View>
          <View>
            <Text className="text-stone-400 text-xs">Net Profit</Text>
            <Text className={`font-semibold text-sm ${calc.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatCurrency(calc.netProfit)}
            </Text>
          </View>
          <View>
            <Text className="text-stone-400 text-xs">Margin</Text>
            <Text className={`font-semibold text-sm ${calc.profitMargin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {calc.profitMargin.toFixed(1)}%
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}
