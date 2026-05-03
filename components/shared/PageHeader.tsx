import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/themeContext';

interface Props {
  title: string;
  subtitle?: string;
  backButton?: boolean;
  rightAction?: { label: string; onPress: () => void };
}

export function PageHeader({ title, subtitle, backButton, rightAction }: Props) {
  const router = useRouter();
  const { tokens } = useTheme();
  const p = tokens.palette;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {backButton && (
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10, marginRight: 4 }}
          >
            <Text style={{ color: p.brand, fontSize: 22, fontWeight: '600' }}>‹</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: tokens.type.display, fontSize: 22, color: p.text }} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={{ color: p.textMuted, fontSize: 13, marginTop: 2 }}>{subtitle}</Text>}
        </View>
      </View>
      {rightAction && (
        <TouchableOpacity
          onPress={rightAction.onPress}
          accessibilityRole="button"
          accessibilityLabel={rightAction.label}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ marginLeft: 12, borderWidth: 2, borderColor: p.text, paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Text style={{ color: p.text, fontWeight: '700', fontSize: 11, letterSpacing: 1 }}>{rightAction.label.toUpperCase()}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
