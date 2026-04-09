import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { EventStatusBadge } from '@/components/shared/EventStatusBadge';
import { formatDateRange, formatCurrency } from '@/lib/formatters';
import { STATUS_COLORS } from '@/constants';
import type { EventWithFinancials } from '@/types';

interface Props {
  event: EventWithFinancials;
}

export function EventCard({ event }: Props) {
  const router = useRouter();
  const fin = event.event_financials;
  const calc = event.calculations;
  const dotColor = STATUS_COLORS[event.status]?.dot ?? '#a8a29e';

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/events/${event.id}`)}
      className="bg-white rounded-2xl mb-3 border border-slate-100 overflow-hidden"
      activeOpacity={0.7}
      style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}
    >
      {/* Status colour strip on left */}
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 4, backgroundColor: dotColor, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }} />
        <View style={{ flex: 1, padding: 14 }}>
          <View className="flex-row items-start justify-between mb-1.5">
            <View className="flex-1 mr-3">
              <Text className="font-bold text-slate-900 text-[15px] leading-snug" numberOfLines={2}>
                {event.name}
              </Text>
              <Text className="text-slate-500 text-xs mt-0.5" numberOfLines={1}>
                📍 {event.location}
              </Text>
            </View>
            <EventStatusBadge status={event.status} />
          </View>

          <View className="flex-row items-center flex-wrap gap-x-3 gap-y-1 mt-1">
            <Text className="text-slate-400 text-xs">📅 {formatDateRange(event.date, event.end_date)}</Text>
            {event.concessions_companies && (
              <Text className="text-slate-400 text-xs" numberOfLines={1}>
                🏢 {event.concessions_companies.name}
              </Text>
            )}
            {(event as any).url_changed && (
              <View className="flex-row items-center bg-orange-100 px-2 py-0.5 rounded-full">
                <Text className="text-orange-700 text-xs font-semibold">⚡ Page changed</Text>
              </View>
            )}
          </View>

          {fin && fin.gross_sales > 0 && (
            <View className="flex-row mt-3 pt-3 border-t border-slate-50 gap-5">
              <View>
                <Text className="text-slate-400 text-xs">Gross Sales</Text>
                <Text className="font-bold text-slate-900 text-sm">{formatCurrency(fin.gross_sales)}</Text>
              </View>
              <View>
                <Text className="text-slate-400 text-xs">Net Profit</Text>
                <Text className={`font-bold text-sm ${calc.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatCurrency(calc.netProfit)}
                </Text>
              </View>
              <View>
                <Text className="text-slate-400 text-xs">Margin</Text>
                <Text className={`font-bold text-sm ${calc.profitMargin >= 20 ? 'text-emerald-600' : calc.profitMargin >= 0 ? 'text-amber-600' : 'text-red-500'}`}>
                  {calc.profitMargin.toFixed(1)}%
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
