import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EventStatusBadge } from '@/components/shared/EventStatusBadge';
import { formatDateRange, formatCurrency } from '@/lib/formatters';
import { STATUS_COLORS } from '@/constants';
import type { EventWithFinancials } from '@/types';

interface Props {
  event: EventWithFinancials;
}

export const EventCard = React.memo(function EventCard({ event }: Props) {
  const router = useRouter();
  const fin = event.event_financials;
  const calc = event.calculations;
  const dotColor = STATUS_COLORS[event.status]?.dot ?? '#a8a29e';
  const unitName = event.units?.length ? event.units.map((u) => u.name).join(' · ') : null;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/events/${event.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Open event ${event.name}`}
      className="bg-white rounded-2xl mb-3 border border-slate-100 overflow-hidden"
      activeOpacity={0.7}
      style={{
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <View style={{ flexDirection: 'row' }}>
        <View
          style={{
            width: 4,
            backgroundColor: dotColor,
            borderTopLeftRadius: 16,
            borderBottomLeftRadius: 16,
          }}
        />
        <View style={{ flex: 1, padding: 14 }}>
          <View className="flex-row items-start justify-between mb-1.5">
            <View className="flex-1 mr-3">
              <Text
                className="font-bold text-slate-900 text-[15px] leading-snug"
                numberOfLines={2}
              >
                {event.name}
              </Text>
              <View className="flex-row items-center mt-1">
                <Ionicons name="location-outline" size={12} color="#94a3b8" />
                <Text className="text-slate-500 text-xs ml-1" numberOfLines={1}>
                  {event.location}
                </Text>
              </View>
            </View>
            <EventStatusBadge status={event.status} />
          </View>

          <View className="flex-row items-center flex-wrap gap-x-3 gap-y-1 mt-1">
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={11} color="#a8a29e" />
              <Text className="text-slate-400 text-xs ml-1">
                {formatDateRange(event.date, event.end_date)}
              </Text>
            </View>
            {event.concessions_companies && (
              <View className="flex-row items-center">
                <Ionicons name="business-outline" size={11} color="#a8a29e" />
                <Text className="text-slate-400 text-xs ml-1" numberOfLines={1}>
                  {event.concessions_companies.name}
                </Text>
              </View>
            )}
            {unitName && (
              <View className="flex-row items-center">
                <Ionicons name="car-outline" size={11} color="#a8a29e" />
                <Text className="text-slate-400 text-xs ml-1" numberOfLines={1}>
                  {unitName}
                </Text>
              </View>
            )}
            {event.url_changed && (
              <View className="flex-row items-center bg-orange-100 px-2 py-0.5 rounded-full">
                <Ionicons name="flash" size={10} color="#c2410c" />
                <Text className="text-orange-700 text-xs font-semibold ml-1">Page changed</Text>
              </View>
            )}
          </View>

          {fin && fin.gross_sales > 0 && (
            <View className="flex-row mt-3 pt-3 border-t border-slate-50 gap-5">
              <View>
                <Text className="text-slate-400 text-[10px] uppercase tracking-wide">Gross Sales</Text>
                <Text className="font-bold text-slate-900 text-sm mt-0.5">
                  {formatCurrency(fin.gross_sales)}
                </Text>
              </View>
              <View>
                <Text className="text-slate-400 text-[10px] uppercase tracking-wide">Net Profit</Text>
                <Text
                  className={`font-bold text-sm mt-0.5 ${
                    calc.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {formatCurrency(calc.netProfit)}
                </Text>
              </View>
              <View>
                <Text className="text-slate-400 text-[10px] uppercase tracking-wide">Margin</Text>
                <Text
                  className={`font-bold text-sm mt-0.5 ${
                    calc.profitMargin >= 20
                      ? 'text-emerald-600'
                      : calc.profitMargin >= 0
                      ? 'text-amber-600'
                      : 'text-red-500'
                  }`}
                >
                  {calc.profitMargin.toFixed(1)}%
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});
