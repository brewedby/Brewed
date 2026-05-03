import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/lib/themeContext';
import { STATUS_DOT } from '@/lib/theme';
import { STATUS_LABELS } from '@/constants';
import type { ApplicationStatus } from '@/types';

interface Props {
  status: ApplicationStatus;
  size?: 'sm' | 'md';
}

export function EventStatusBadge({ status, size = 'md' }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  const color = STATUS_DOT[status] ?? p.textFaint;
  const label = STATUS_LABELS[status];
  const isSmall = size === 'sm';

  return (
    <View style={{
      borderWidth: 1, borderColor: color,
      paddingHorizontal: isSmall ? 6 : 8, paddingVertical: 2,
      alignSelf: 'flex-start',
    }}>
      <Text style={{ fontSize: isSmall ? 8 : 9, fontWeight: '700', letterSpacing: 1, color }}>
        {'● ' + label.toUpperCase()}
      </Text>
    </View>
  );
}
