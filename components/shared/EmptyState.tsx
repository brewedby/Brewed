import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon = '📋', title, description, action }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Text className="text-5xl mb-4">{icon}</Text>
      <Text className="text-lg font-semibold text-stone-700 text-center">{title}</Text>
      {description && (
        <Text className="text-stone-500 text-center mt-2">{description}</Text>
      )}
      {action && (
        <TouchableOpacity
          onPress={action.onPress}
          className="mt-6 bg-amber-700 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
