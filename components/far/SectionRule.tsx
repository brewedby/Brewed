import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/lib/themeContext';

interface Props {
  label?: string;
}

export function FarSectionRule({ label }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: p.borderStrong }} />
      {label ? (
        <Text style={{
          fontSize: 9, color: p.textMuted, letterSpacing: 2, fontWeight: '600',
        }}>
          {label.toUpperCase()}
        </Text>
      ) : null}
      <View style={{ flex: 1, height: 1, backgroundColor: p.borderStrong }} />
    </View>
  );
}
