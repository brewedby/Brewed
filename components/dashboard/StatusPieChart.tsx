import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/lib/themeContext';
import { STATUS_PIE_COLORS, STATUS_LABELS } from '@/constants';
import type { StatusCount } from '@/types';

interface Props {
  data: StatusCount[];
}

export function StatusPieChart({ data }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <View style={{ backgroundColor: p.surface, padding: 14, borderWidth: 1, borderColor: p.border }}>
      <Text style={{ fontFamily: tokens.type.display, fontSize: 16, color: p.text, marginBottom: 12 }}>
        Applications Breakdown
      </Text>

      {/* Horizontal stacked bar */}
      <View style={{ flexDirection: 'row', overflow: 'hidden', height: 18, marginBottom: 16, borderWidth: 1, borderColor: p.border }}>
        {data.map((d) => (
          <View
            key={d.status}
            style={{ flex: d.count / total, backgroundColor: STATUS_PIE_COLORS[d.status] }}
          />
        ))}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 8 }}>
        {data.map((d) => (
          <View key={d.status} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ backgroundColor: STATUS_PIE_COLORS[d.status], width: 10, height: 10 }} />
            <Text style={{ color: p.textMuted, fontSize: 11 }}>
              {STATUS_LABELS[d.status]}{' '}
              <Text style={{ fontWeight: '700', color: p.text }}>{d.count}</Text>
              <Text style={{ color: p.textFaint }}> ({((d.count / total) * 100).toFixed(0)}%)</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
