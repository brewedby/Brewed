import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/lib/themeContext';

export function OfflineBanner() {
  const { tokens } = useTheme();
  const p = tokens.palette;
  return (
    <View style={{ backgroundColor: p.text, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 16, gap: 6 }}>
      <Text style={{ color: p.brandSoft, fontSize: 11 }}>⌖</Text>
      <Text style={{ color: p.brandSoft, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
        No connection — showing cached data
      </Text>
    </View>
  );
}
