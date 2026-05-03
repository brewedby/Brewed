import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/themeContext';
import { farStatus, STATUS_DOT } from '@/lib/theme';
import { formatCurrency, formatDateRange } from '@/lib/formatters';
import type { EventWithFinancials } from '@/types';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface Props {
  event: EventWithFinancials;
}

export const EventCard = React.memo(function EventCard({ event }: Props) {
  const router = useRouter();
  const { tokens, isDark } = useTheme();
  const p = tokens.palette;
  const S = farStatus(isDark);

  const fin = event.event_financials;
  const calc = event.calculations;
  const net = fin && fin.gross_sales > 0 ? calc.netProfit : null;
  const org = event.concessions_companies?.name ?? null;
  const dotColor = STATUS_DOT[event.status] ?? p.textFaint;

  const [, mm, dd] = event.date.split('-');
  const dayNum = parseInt(dd, 10);
  const monthLabel = MONTH_SHORT[parseInt(mm, 10) - 1] ?? '';

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/events/${event.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${event.name}`}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row', gap: 14, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: p.border, borderStyle: 'dashed',
      }}
    >
      {/* Date column */}
      <View style={{ width: 44, alignItems: 'center', flexShrink: 0, paddingTop: 2 }}>
        <Text style={{ fontFamily: tokens.type.display, fontSize: 22, lineHeight: 24, color: p.text }}>{dayNum}</Text>
        <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1, marginTop: 2 }}>{monthLabel.toUpperCase()}</Text>
      </View>

      {/* Content */}
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1, color: dotColor, lineHeight: 14 }}>
            {'● ' + event.status.toUpperCase()}
          </Text>
          {net !== null && (
            <Text style={{ fontSize: 11, color: net >= 0 ? S.green : S.red, fontFamily: tokens.type.mono, fontVariant: ['tabular-nums'], lineHeight: 14 }}>
              {net >= 0 ? '+' : ''}{formatCurrency(net)}
            </Text>
          )}
        </View>
        <Text style={{ fontFamily: tokens.type.display, fontSize: 17, letterSpacing: -0.2, lineHeight: 21, color: p.text }} numberOfLines={2}>
          {event.name}
        </Text>
        <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic' }} numberOfLines={1}>
          {event.location}{org ? ` — ${org}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
});
