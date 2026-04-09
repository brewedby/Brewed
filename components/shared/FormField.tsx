import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean;
}

export function FormField({ label, error, required, ...props }: Props) {
  return (
    <View>
      {label && (
        <Text className="text-stone-600 text-sm font-medium mb-1">
          {label}
          {required && <Text className="text-red-500"> *</Text>}
        </Text>
      )}
      <TextInput
        className={`bg-stone-50 border rounded-xl px-4 py-3 text-stone-900 text-base ${
          error ? 'border-red-400' : 'border-stone-200'
        }`}
        placeholderTextColor="#a8a29e"
        {...props}
      />
      {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
    </View>
  );
}
