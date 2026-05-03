import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { useTheme } from '@/lib/themeContext';

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
  const { tokens } = useTheme();
  const p = tokens.palette;
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
      {label && (
        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.textMuted, marginBottom: 6 }}>
          {label.toUpperCase()}
        </Text>
      )}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: p.surface,
        borderWidth: 1,
        borderColor: error ? '#dc2626' : p.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}>
        <Text style={{ fontSize: 15, color: p.textMuted, marginRight: 4 }}>{currencySymbol}</Text>
        <TextInput
          style={{ flex: 1, fontSize: 15, color: p.text }}
          value={displayValue}
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          onFocus={handleFocus}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={p.textFaint}
          {...props}
        />
      </View>
      {error && <Text style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>{error}</Text>}
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
