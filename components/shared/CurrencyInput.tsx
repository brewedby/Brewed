import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface Props extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: number;
  onChangeValue: (value: number) => void;
  label?: string;
  error?: string;
  currencySymbol?: string;
}

export function CurrencyInput({
  value,
  onChangeValue,
  label,
  error,
  currencySymbol = '£',
  ...props
}: Props) {
  const [displayValue, setDisplayValue] = useState(value > 0 ? value.toString() : '');

  function handleChangeText(text: string) {
    const cleaned = text.replace(/[^0-9.]/g, '');
    setDisplayValue(cleaned);
    const parsed = parseFloat(cleaned);
    onChangeValue(isNaN(parsed) ? 0 : parsed);
  }

  function handleBlur() {
    if (value > 0) {
      setDisplayValue(value.toFixed(2));
    } else {
      setDisplayValue('');
    }
  }

  function handleFocus() {
    if (value === 0) setDisplayValue('');
  }

  return (
    <View>
      {label && <Text className="text-stone-600 text-sm font-medium mb-1">{label}</Text>}
      <View className={`flex-row items-center bg-stone-50 border rounded-xl px-3 py-3 ${error ? 'border-red-400' : 'border-stone-200'}`}>
        <Text className="text-stone-500 mr-1 text-base">{currencySymbol}</Text>
        <TextInput
          className="flex-1 text-stone-900 text-base"
          value={displayValue}
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          onFocus={handleFocus}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#a8a29e"
          {...props}
        />
      </View>
      {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
    </View>
  );
}

export function currencySymbolFor(code: string | null | undefined): string {
  switch ((code ?? 'GBP').toUpperCase()) {
    case 'EUR':
      return '€';
    case 'USD':
      return '$';
    case 'GBP':
    default:
      return '£';
  }
}
