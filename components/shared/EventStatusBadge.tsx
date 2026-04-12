import React from 'react';
import { View, Text } from 'react-native';
import { STATUS_COLORS, STATUS_LABELS } from '@/constants';
import type { ApplicationStatus } from '@/types';

interface Props {
  status: ApplicationStatus;
  size?: 'sm' | 'md';
}

export function EventStatusBadge({ status, size = 'md' }: Props) {
  const colors = STATUS_COLORS[status];
  const label = STATUS_LABELS[status];
  const isSmall = size === 'sm';

  return (
    <View
      style={{ backgroundColor: colors.bgHex, paddingVertical: isSmall ? 2 : 4, paddingHorizontal: 10, borderRadius: 999, flexDirection: 'row', alignItems: 'center' }}
    >
      <View
        style={{ backgroundColor: colors.dot, width: isSmall ? 5 : 6, height: isSmall ? 5 : 6, borderRadius: 3, marginRight: 6 }}
      />
      <Text style={{ color: colors.textHex, fontWeight: '500', fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
}
