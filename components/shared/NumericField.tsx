import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { useTheme } from '@/lib/themeContext';

interface Props extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: number;
  onChangeValue: (value: number) => void;
  label?: string;
  error?: string;
}

/**
 * Decimal-safe numeric input for form numbers (percentages, hours, litres,
 * miles). The naive controlled pattern — value={String(n)} +
 * onChangeText={t => onChange(parseFloat(t) || 0)} — destroys in-progress
 * decimals: typing "7.5" round-trips "7." through parseFloat back to "7",
 * so the user ends up with 75. Same family of fix as CurrencyInput: keep
 * the typed TEXT as local state, push the parsed NUMBER to the form.
 *
 * External writes (quick-select chips, form reset) still land: when the
 * form value no longer matches what the local text parses to, the text is
 * re-derived from the value.
 */
export function NumericField({ value, onChangeValue, label, error, ...props }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  const [text, setText] = useState(value > 0 ? String(value) : '');

  useEffect(() => {
    const parsed = parseFloat(text);
    const textValue = isNaN(parsed) ? 0 : parsed;
    if (textValue !== value) setText(value > 0 ? String(value) : '');
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChangeText(t: string) {
    const cleaned = t.replace(/[^0-9.]/g, '');
    setText(cleaned);
    const parsed = parseFloat(cleaned);
    onChangeValue(isNaN(parsed) ? 0 : parsed);
  }

  return (
    <View>
      {label && (
        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.textMuted, marginBottom: 6 }}>
          {label.toUpperCase()}
        </Text>
      )}
      <TextInput
        style={{
          backgroundColor: p.surface,
          borderWidth: 1,
          borderColor: error ? '#dc2626' : p.border,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 15,
          color: p.text,
        }}
        value={text}
        onChangeText={handleChangeText}
        keyboardType="decimal-pad"
        placeholderTextColor={p.textFaint}
        {...props}
      />
      {error && <Text style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>{error}</Text>}
    </View>
  );
}
