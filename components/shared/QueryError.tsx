import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  error: Error | null | unknown;
  onRetry: () => void;
  message?: string;
}

export function QueryError({ error, onRetry, message }: Props) {
  if (!error) return null;
  const errMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : typeof error === 'string'
          ? error
          : 'An unexpected error occurred';
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <Text className="text-4xl mb-4">⚠️</Text>
      <Text className="text-stone-700 font-semibold text-center mb-2">
        {message ?? 'Something went wrong'}
      </Text>
      <Text className="text-stone-400 text-xs text-center mb-6" numberOfLines={3}>
        {errMessage}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        accessibilityLabel="Retry"
        accessibilityRole="button"
        className="bg-amber-700 px-6 py-3 rounded-xl"
      >
        <Text className="text-white font-semibold">Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}
