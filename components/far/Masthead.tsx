import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/lib/themeContext';

interface Props {
  eyebrow?: string;
  title: string;
  sub?: string;
  right?: React.ReactNode;
}

export function FarMasthead({ eyebrow, title, sub, right }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  return (
    <View style={{
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 10,
      borderBottomWidth: 2,
      borderBottomColor: p.text,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        {eyebrow ? (
          <Text style={{
            fontSize: 9, color: p.textMuted, letterSpacing: 2, fontWeight: '600',
          }}>
            {eyebrow.toUpperCase()}
          </Text>
        ) : <View />}
        {right}
      </View>
      <Text style={{
        fontFamily: tokens.type.display,
        fontWeight: tokens.type.displayWeight,
        fontSize: 32,
        letterSpacing: -0.5,
        lineHeight: 36,
        marginTop: 4,
        color: p.text,
      }}>
        {title}
      </Text>
      {sub ? (
        <Text style={{
          fontSize: 11, color: p.textMuted, fontStyle: 'italic', marginTop: 2,
        }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}
