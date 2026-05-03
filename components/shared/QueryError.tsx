import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/themeContext';

interface Props {
  error: Error | null | unknown;
  onRetry: () => void;
  message?: string;
}

export function QueryError({ error, onRetry, message }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;

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
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 }}>
      <Text style={{ fontSize: 36, marginBottom: 16 }}>⚠️</Text>
      <Text style={{ fontFamily: tokens.type.display, fontSize: 18, color: p.text, textAlign: 'center', marginBottom: 8 }}>
        {message ?? 'Something went wrong'}
      </Text>
      <Text style={{ fontSize: 12, color: p.textMuted, textAlign: 'center', marginBottom: 24 }} numberOfLines={3}>
        {errMessage}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        accessibilityLabel="Retry"
        accessibilityRole="button"
        style={{ borderWidth: 2, borderColor: p.text, paddingHorizontal: 24, paddingVertical: 12 }}
      >
        <Text style={{ color: p.text, fontWeight: '700', fontSize: 13, letterSpacing: 0.5 }}>TRY AGAIN</Text>
      </TouchableOpacity>
    </View>
  );
}
