import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { UNIT_STATUS_LABELS, UNIT_STATUS_COLORS } from '@/constants';
import type { Unit, EventWithFinancials } from '@/types';
import type { UnitStatus } from '@/types';

interface Props {
  unit: Unit;
  currentEvent?: EventWithFinancials | null;
  onPress: () => void;
}

export function UnitCard({ unit, currentEvent, onPress }: Props) {
  const status = unit.status as UnitStatus;
  const colors = UNIT_STATUS_COLORS[status];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-white rounded-2xl mb-3 border border-stone-100 overflow-hidden"
      style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}
    >
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 4, backgroundColor: colors.dot, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }} />
        <View style={{ flex: 1, padding: 14 }}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1 mr-3">
              <Text className="font-bold text-stone-900 text-base">{unit.name}</Text>
              {unit.registration && (
                <Text className="text-slate-500 text-xs mt-0.5 font-medium tracking-wide">
                  {unit.registration}
                </Text>
              )}
            </View>
            <View className={`px-2.5 py-1 rounded-full ${colors.bg}`}>
              <View className="flex-row items-center gap-1">
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dot }} />
                <Text className={`text-xs font-semibold ${colors.text}`}>
                  {UNIT_STATUS_LABELS[status]}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-2">
            {currentEvent ? (
              <Text className="text-amber-600 text-xs font-medium" numberOfLines={1}>
                📍 Currently at: {currentEvent.name}
              </Text>
            ) : status === 'active' ? (
              <Text className="text-green-600 text-xs font-medium">✅ Available</Text>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
