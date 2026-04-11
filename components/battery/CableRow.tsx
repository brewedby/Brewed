import React from 'react';
import { View, Text } from 'react-native';
import type { CableSpec } from '@/lib/batteryCalculations';

interface Props {
  spec: CableSpec;
}

export function CableRow({ spec }: Props) {
  const pass = spec.withinSpec;

  return (
    <View className="bg-white rounded-xl border border-stone-100 p-3 gap-2">
      {/* Header row: circuit name + pass/fail badge */}
      <View className="flex-row items-center justify-between">
        <Text className="text-stone-800 text-sm font-semibold flex-1 pr-2" numberOfLines={1}>
          {spec.circuitName}
        </Text>
        <View className={`px-2 py-0.5 rounded-full ${pass ? 'bg-green-100' : 'bg-red-100'}`}>
          <Text className={`text-xs font-bold ${pass ? 'text-green-700' : 'text-red-600'}`}>
            {pass ? 'PASS' : 'REVIEW'}
          </Text>
        </View>
      </View>

      {/* Data grid */}
      <View className="flex-row gap-3">
        <Cell label="Load" value={`${spec.loadAmps}A`} />
        <Cell label="Cable" value={`${spec.recommendedMm2} mm²`} highlight />
        <Cell label="Fuse" value={`${spec.fuseRatingAmps}A`} highlight />
        <Cell label="V-drop" value={`${spec.voltageDropPct}%`} warn={!pass} />
      </View>

      {/* Fuse type note */}
      <Text className="text-stone-400 text-xs">
        {spec.fuseType}
        {spec.recommendedMm2 !== spec.minCableMm2 && (
          ` · uprated from ${spec.minCableMm2}mm² (voltage drop)`
        )}
      </Text>
    </View>
  );
}

function Cell({
  label,
  value,
  highlight,
  warn,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-stone-400 text-xs mb-0.5">{label}</Text>
      <Text
        className={`text-sm font-bold ${
          warn ? 'text-red-600' : highlight ? 'text-amber-700' : 'text-stone-700'
        }`}
      >
        {value}
      </Text>
    </View>
  );
}
