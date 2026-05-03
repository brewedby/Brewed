import React from 'react';
import { View, Text } from 'react-native';
import { formatCurrency } from '@/lib/formatters';
import { useTheme } from '@/lib/themeContext';
import type { StaffingEntry } from '@/types';

interface Props {
  entries: StaffingEntry[];
}

export function StaffingList({ entries }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;

  if (entries.length === 0) return null;

  return (
    <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 16 }}>
      <Text style={{ fontFamily: tokens.type.display, fontSize: 18, color: p.text, marginBottom: 12 }}>Staffing</Text>
      {entries.map((entry, i) => (
        <View key={entry.id} style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          paddingVertical: 10,
          borderBottomWidth: i < entries.length - 1 ? 1 : 0,
          borderBottomColor: p.border,
          borderStyle: 'dashed',
        }}>
          <View>
            <Text style={{ fontSize: 14, color: p.text, fontWeight: '500' }}>{entry.staff_name}</Text>
            <Text style={{ fontSize: 12, color: p.textMuted, marginTop: 2 }}>
              {entry.hours_worked}h @ {formatCurrency(entry.hourly_rate)}/hr
            </Text>
          </View>
          <Text style={{ fontWeight: '600', color: p.text, fontSize: 14 }}>
            {formatCurrency(entry.hours_worked * entry.hourly_rate)}
          </Text>
        </View>
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: p.border }}>
        <Text style={{ fontWeight: '700', fontSize: 12, letterSpacing: 0.5, color: p.textMuted }}>TOTAL</Text>
        <Text style={{ fontWeight: '700', fontSize: 14, color: p.text }}>
          {formatCurrency(entries.reduce((s, e) => s + e.hours_worked * e.hourly_rate, 0))}
        </Text>
      </View>
    </View>
  );
}
