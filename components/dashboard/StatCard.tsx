import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/lib/themeContext';

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
  default: '#a8a29e',
  green: '#22c55e',
  amber: '#d97706',
  red: '#dc2626',
};

const VALUE_COLOR = {
  default: null,
  green: '#22c55e',
  amber: '#d97706',
  red: '#dc2626',
};

export const StatCard = React.memo(function StatCard({
  title, value, subtext, subtitle, icon, trendValue, colorScheme = 'default',
}: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  const accent = ACCENT_HEX[colorScheme];
  const valueColor = VALUE_COLOR[colorScheme] ?? p.text;

  return (
    <View style={{ flex: 1, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, overflow: 'hidden' }}>
      <View style={{ height: 3, backgroundColor: accent }} />
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, minHeight: 20 }}>
          {icon ? <Text style={{ fontSize: 18 }}>{icon}</Text> : <View />}
          {trendValue !== undefined && (
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 6, paddingVertical: 2,
              backgroundColor: trendValue >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(220,38,38,0.1)',
            }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: trendValue >= 0 ? '#22c55e' : '#dc2626' }}>
                {trendValue >= 0 ? '↑' : '↓'} {Math.abs(trendValue).toFixed(0)}%
              </Text>
            </View>
          )}
        </View>
        <Text style={{ fontFamily: tokens.type.display, fontSize: 22, color: valueColor }} numberOfLines={1}>{value}</Text>
        <Text style={{ fontSize: 11, color: p.textMuted, marginTop: 2, letterSpacing: 0.5 }}>{title}</Text>
        {subtext && <Text style={{ fontSize: 11, color: p.textFaint, marginTop: 4 }}>{subtext}</Text>}
        {subtitle && <Text style={{ fontSize: 11, color: p.textFaint, marginTop: 4 }}>{subtitle}</Text>}
      </View>
    </View>
  );
});
