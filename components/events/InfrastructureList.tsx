import React from 'react';
import { View, Text } from 'react-native';
import { formatCurrency } from '@/lib/formatters';
import { INFRASTRUCTURE_CATEGORY_LABELS } from '@/constants';
import { useTheme } from '@/lib/themeContext';
import type { InfrastructureItem } from '@/types';

interface Props {
  items: InfrastructureItem[];
}

export function InfrastructureList({ items }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;

  if (items.length === 0) return null;

  return (
    <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 16 }}>
      <Text style={{ fontFamily: tokens.type.display, fontSize: 18, color: p.text, marginBottom: 12 }}>Infrastructure Items</Text>
      {items.map((item, i) => (
        <View key={item.id} style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          paddingVertical: 10,
          borderBottomWidth: i < items.length - 1 ? 1 : 0,
          borderBottomColor: p.border,
          borderStyle: 'dashed',
        }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 14, color: p.text, fontWeight: '500' }}>{item.description}</Text>
            <Text style={{ fontSize: 12, color: p.textMuted, marginTop: 2 }}>
              {INFRASTRUCTURE_CATEGORY_LABELS[item.category]}
            </Text>
          </View>
          <Text style={{ fontWeight: '600', color: p.text, fontSize: 14 }}>{formatCurrency(item.cost)}</Text>
        </View>
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: p.border }}>
        <Text style={{ fontWeight: '700', fontSize: 12, letterSpacing: 0.5, color: p.textMuted }}>TOTAL</Text>
        <Text style={{ fontWeight: '700', fontSize: 14, color: p.text }}>
          {formatCurrency(items.reduce((s, i) => s + i.cost, 0))}
        </Text>
      </View>
    </View>
  );
}
