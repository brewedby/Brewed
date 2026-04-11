import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch } from 'react-native';
import type { ApplianceItem } from '@/lib/batteryCalculations';

interface Props {
  item: ApplianceItem;
  onChange: (updated: ApplianceItem) => void;
  onDelete: () => void;
}

export function ApplianceRow({ item, onChange, onDelete }: Props) {
  const whPerDay = item.enabled ? item.watts * item.hoursPerDay : 0;

  return (
    <View className="bg-white rounded-xl border border-stone-100 p-3 gap-2">
      {/* Row 1: name + toggle + delete */}
      <View className="flex-row items-center gap-2">
        <Switch
          value={item.enabled}
          onValueChange={(v) => onChange({ ...item, enabled: v })}
          trackColor={{ false: '#d6d3d1', true: '#b45309' }}
          thumbColor="#ffffff"
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
        <TextInput
          value={item.name}
          onChangeText={(t) => onChange({ ...item, name: t })}
          className={`flex-1 text-sm font-medium ${item.enabled ? 'text-stone-800' : 'text-stone-400'}`}
          placeholder="Appliance name"
          placeholderTextColor="#a8a29e"
        />
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text className="text-red-400 text-base font-bold">×</Text>
        </TouchableOpacity>
      </View>

      {/* Row 2: watts + hours + Wh result */}
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Text className="text-stone-400 text-xs mb-0.5">Watts (W)</Text>
          <TextInput
            value={item.watts > 0 ? String(item.watts) : ''}
            onChangeText={(t) => onChange({ ...item, watts: parseFloat(t) || 0 })}
            keyboardType="numeric"
            className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm text-stone-800"
            placeholder="0"
            placeholderTextColor="#a8a29e"
          />
        </View>
        <View className="flex-1">
          <Text className="text-stone-400 text-xs mb-0.5">Hrs/day</Text>
          <TextInput
            value={item.hoursPerDay > 0 ? String(item.hoursPerDay) : ''}
            onChangeText={(t) => onChange({ ...item, hoursPerDay: parseFloat(t) || 0 })}
            keyboardType="decimal-pad"
            className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm text-stone-800"
            placeholder="0"
            placeholderTextColor="#a8a29e"
          />
        </View>
        <View className="items-end min-w-16">
          <Text className="text-stone-400 text-xs mb-0.5">Wh/day</Text>
          <Text className={`text-sm font-bold ${item.enabled ? 'text-amber-700' : 'text-stone-300'}`}>
            {whPerDay >= 1000 ? `${(whPerDay / 1000).toFixed(1)}k` : String(Math.round(whPerDay))}
          </Text>
        </View>
      </View>
    </View>
  );
}
