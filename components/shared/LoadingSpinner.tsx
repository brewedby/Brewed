import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/themeContext';

interface Props {
  message?: string;
}

export function LoadingSpinner({ message }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -4, duration: 700, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.bg }}>
      <Animated.View style={{ transform: [{ translateY: bob }], marginBottom: 12 }}>
        <View style={{ width: 56, height: 56, borderWidth: 2, borderColor: p.border, alignItems: 'center', justifyContent: 'center', backgroundColor: p.surface }}>
          <Ionicons name="cafe" size={28} color={p.brand} />
        </View>
      </Animated.View>
      <ActivityIndicator size="small" color={p.brand} />
      <Text style={{ fontSize: 13, color: p.textMuted, marginTop: 8 }}>
        {message ?? 'Loading…'}
      </Text>
    </View>
  );
}
