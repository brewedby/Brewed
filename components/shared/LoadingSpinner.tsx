import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  message?: string;
}

export function LoadingSpinner({ message }: Props) {
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
    <View className="flex-1 items-center justify-center">
      <Animated.View style={{ transform: [{ translateY: bob }] }} className="mb-3">
        <View className="w-14 h-14 rounded-2xl bg-amber-100 items-center justify-center">
          <Ionicons name="cafe" size={30} color="#b45309" />
        </View>
      </Animated.View>
      <ActivityIndicator size="small" color="#f59e0b" />
      {message ? (
        <Text className="text-stone-500 text-sm mt-2">{message}</Text>
      ) : (
        <Text className="text-stone-400 text-xs mt-2 font-medium">Loading…</Text>
      )}
    </View>
  );
}
