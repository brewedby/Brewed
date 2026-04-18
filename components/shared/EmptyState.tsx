import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';

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
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <Animated.View className="flex-1 items-center justify-center px-8 py-16" style={{ opacity }}>
      <Text className="text-6xl mb-4">{icon}</Text>
      <Text className="text-lg font-semibold text-stone-700 text-center">{title}</Text>
      {description && (
        <Text className="text-stone-500 text-center mt-2">{description}</Text>
      )}
      {tip && (
        <View className="mt-4 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-xl">
          <Text className="text-amber-800 text-xs text-center">💡 {tip}</Text>
        </View>
      )}
      {action && (
        <TouchableOpacity
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          className="mt-6 bg-amber-700 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">{action.label}</Text>
        </TouchableOpacity>
      )}
      {secondaryAction && (
        <TouchableOpacity
          onPress={secondaryAction.onPress}
          accessibilityRole="button"
          accessibilityLabel={secondaryAction.label}
          className="mt-3 px-6 py-3"
        >
          <Text className="text-amber-700 font-medium">{secondaryAction.label}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}
