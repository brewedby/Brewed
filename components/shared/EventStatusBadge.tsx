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
    <View className={`flex-row items-center rounded-full px-2.5 ${isSmall ? 'py-0.5' : 'py-1'} ${colors.bg}`}>
      <View
        style={{ backgroundColor: colors.dot, width: isSmall ? 5 : 6, height: isSmall ? 5 : 6, borderRadius: 3 }}
        className="mr-1.5"
      />
      <Text className={`font-medium ${colors.text} ${isSmall ? 'text-xs' : 'text-xs'}`}>
        {label}
      </Text>
    </View>
  );
}
