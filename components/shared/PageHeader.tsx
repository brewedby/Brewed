import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

interface Props {
  title: string;
  subtitle?: string;
  backButton?: boolean;
  rightAction?: { label: string; onPress: () => void };
}

export function PageHeader({ title, subtitle, backButton, rightAction }: Props) {
  const router = useRouter();

  return (
    <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
      <View className="flex-row items-center flex-1">
        {backButton && (
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Text className="text-amber-500 text-base">‹ Back</Text>
          </TouchableOpacity>
        )}
        <View className="flex-1">
          <Text className="text-xl font-bold text-stone-900" numberOfLines={1}>{title}</Text>
          {subtitle && <Text className="text-stone-500 text-sm mt-0.5">{subtitle}</Text>}
        </View>
      </View>
      {rightAction && (
        <TouchableOpacity onPress={rightAction.onPress} className="ml-3">
          <Text className="text-amber-600 font-semibold text-sm">{rightAction.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
