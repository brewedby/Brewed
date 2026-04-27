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
      accessibilityLabel={`Open ${event.name}`}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#f5f5f4',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row' }}>
        {/* Status accent bar */}
        <View style={{ width: 4, backgroundColor: dotColor }} />

        <View style={{ flex: 1, padding: 14 }}>
          {/* Name + status badge */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text
                style={{ fontWeight: '700', color: '#1c1917', fontSize: 15, lineHeight: 20 }}
                numberOfLines={2}
              >
                {event.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                <Ionicons name="location-outline" size={12} color="#a8a29e" />
                <Text style={{ color: '#78716c', fontSize: 12, marginLeft: 4 }} numberOfLines={1}>
                  {event.location}
                </Text>
              </View>
            </View>
            <EventStatusBadge status={event.status} />
          </View>

          {/* Meta row */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="calendar-outline" size={11} color="#a8a29e" />
              <Text style={{ color: '#a8a29e', fontSize: 12, marginLeft: 4 }}>
                {formatDateRange(event.date, event.end_date)}
              </Text>
            </View>
            {event.concessions_companies && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="business-outline" size={11} color="#a8a29e" />
                <Text style={{ color: '#a8a29e', fontSize: 12, marginLeft: 4 }} numberOfLines={1}>
                  {event.concessions_companies.name}
                </Text>
              </View>
            )}
            {unitName && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="car-outline" size={11} color="#a8a29e" />
                <Text style={{ color: '#a8a29e', fontSize: 12, marginLeft: 4 }} numberOfLines={1}>
                  {unitName}
                </Text>
              </View>
            )}
            {event.url_changed && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7ed', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                <Ionicons name="flash" size={10} color="#c2410c" />
                <Text style={{ color: '#c2410c', fontSize: 11, fontWeight: '600', marginLeft: 3 }}>Page changed</Text>
              </View>
            )}
          </View>

          {/* Financial strip */}
          {fin && fin.gross_sales > 0 && (
            <View style={{ flexDirection: 'row', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f5f5f4', gap: 20 }}>
              <View>
                <Text style={{ color: '#a8a29e', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Gross</Text>
                <Text style={{ fontWeight: '700', color: '#1c1917', fontSize: 14, marginTop: 2 }}>
                  {formatCurrency(fin.gross_sales)}
                </Text>
              </View>
              <View>
                <Text style={{ color: '#a8a29e', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Net Profit</Text>
                <Text style={{ fontWeight: '700', fontSize: 14, marginTop: 2, color: calc.netProfit >= 0 ? '#16a34a' : '#dc2626' }}>
                  {formatCurrency(calc.netProfit)}
                </Text>
              </View>
              <View>
                <Text style={{ color: '#a8a29e', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Margin</Text>
                <Text style={{
                  fontWeight: '700', fontSize: 14, marginTop: 2,
                  color: calc.profitMargin >= 20 ? '#16a34a' : calc.profitMargin >= 0 ? '#d97706' : '#dc2626',
                }}>
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
