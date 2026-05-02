import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/lib/themeContext';

interface Props {
  primary: string;
  secondary?: string;
}

export function FarStamp({ primary, secondary }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  return (
    <View style={{
      alignSelf: 'flex-start',
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderWidth: 1.5,
      borderColor: p.brand,
      borderRadius: 2,
      transform: [{ rotate: '-2deg' }],
    }}>
      <Text style={{
        color: p.brand,
        fontWeight: '700',
        fontSize: 11,
        letterSpacing: 1.5,
        lineHeight: 14,
      }}>
        {primary.toUpperCase()}
      </Text>
      {secondary ? (
        <Text style={{
          color: p.brand,
          fontWeight: '700',
          fontSize: 11,
          letterSpacing: 1,
          lineHeight: 14,
          fontFamily: tokens.type.mono,
          fontVariant: ['tabular-nums'],
          marginTop: 2,
        }}>
          {secondary}
        </Text>
      ) : null}
    </View>
  );
}
