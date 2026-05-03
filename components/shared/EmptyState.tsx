import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '@/lib/themeContext';

interface ActionProp {
  label: string;
  onPress: () => void;
}

interface Props {
  icon?: string;
  title: string;
  description?: string;
  action?: ActionProp;
  secondaryAction?: ActionProp;
  tip?: string;
}

export function EmptyState({ icon = '📋', title, description, action, secondaryAction, tip }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  const opacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, friction: 4, tension: 110, delay: 80, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 64, opacity }}>
      <Animated.Text style={{ fontSize: 56, marginBottom: 16, transform: [{ scale: iconScale }] }}>
        {icon}
      </Animated.Text>
      <Text style={{ fontFamily: tokens.type.display, fontSize: 20, color: p.text, textAlign: 'center', marginBottom: 8 }}>{title}</Text>
      {description && (
        <Text style={{ fontSize: 14, color: p.textMuted, textAlign: 'center', lineHeight: 20 }}>{description}</Text>
      )}
      {tip && (
        <View style={{ marginTop: 16, borderWidth: 1, borderColor: p.border, paddingHorizontal: 16, paddingVertical: 10 }}>
          <Text style={{ fontSize: 12, color: p.textMuted, textAlign: 'center' }}>💡 {tip}</Text>
        </View>
      )}
      {action && (
        <TouchableOpacity
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={{ marginTop: 24, borderWidth: 2, borderColor: p.text, paddingHorizontal: 24, paddingVertical: 12 }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: 0.5, color: p.text }}>{action.label.toUpperCase()}</Text>
        </TouchableOpacity>
      )}
      {secondaryAction && (
        <TouchableOpacity
          onPress={secondaryAction.onPress}
          accessibilityRole="button"
          accessibilityLabel={secondaryAction.label}
          style={{ marginTop: 12, paddingHorizontal: 24, paddingVertical: 12 }}
        >
          <Text style={{ fontSize: 13, color: p.brand, fontWeight: '600' }}>{secondaryAction.label}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}
