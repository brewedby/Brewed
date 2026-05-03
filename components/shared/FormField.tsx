import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { useTheme } from '@/lib/themeContext';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean;
}

export function FormField({ label, error, required, style, ...props }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;

  return (
    <View>
      {label && (
        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.textMuted, marginBottom: 6 }}>
          {label.toUpperCase()}
          {required && <Text style={{ color: '#dc2626' }}> *</Text>}
        </Text>
      )}
      <TextInput
        style={[{
          backgroundColor: p.surface,
          borderWidth: 1,
          borderColor: error ? '#dc2626' : p.border,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 15,
          color: p.text,
        }, style]}
        placeholderTextColor={p.textFaint}
        {...props}
      />
      {error && <Text style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>{error}</Text>}
    </View>
  );
}
