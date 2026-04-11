import React from 'react';
import { View, Text } from 'react-native';
import type { BatteryBankSpec } from '@/lib/batteryCalculations';

interface Props {
  spec: BatteryBankSpec;
  isSelected?: boolean;
}

export function ResultCard({ spec, isSelected = false }: Props) {
  return (
    <View
      className={`flex-1 rounded-2xl p-4 border ${
        isSelected
          ? 'bg-amber-50 border-amber-300'
          : 'bg-white border-stone-100'
      }`}
    >
      {isSelected && (
        <View className="bg-amber-700 rounded-full px-2 py-0.5 self-start mb-2">
          <Text className="text-white text-xs font-bold">SELECTED</Text>
        </View>
      )}
      <Text className={`text-2xl font-bold mb-0.5 ${isSelected ? 'text-amber-800' : 'text-stone-800'}`}>
        {spec.voltage}V
      </Text>
      <Text className="text-stone-500 text-xs mb-3">System voltage</Text>

      <View className="gap-1.5">
        <Row label="Required" value={`${spec.requiredAh} Ah`} highlight={isSelected} />
        <Row label="Recommended bank" value={`${spec.recommendedAh} Ah`} highlight={isSelected} />
        <Row label="Batteries" value={`${spec.batteryCount}×`} />
        <Row label="Est. weight" value={`~${spec.estimatedWeightKg} kg`} />
      </View>

      <View className={`mt-3 rounded-lg p-2 ${isSelected ? 'bg-amber-100' : 'bg-stone-50'}`}>
        <Text className={`text-xs font-semibold ${isSelected ? 'text-amber-800' : 'text-stone-600'}`} numberOfLines={2}>
          {spec.label}
        </Text>
      </View>
    </View>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-stone-400 text-xs">{label}</Text>
      <Text className={`text-xs font-semibold ${highlight ? 'text-amber-700' : 'text-stone-700'}`}>{value}</Text>
    </View>
  );
}
