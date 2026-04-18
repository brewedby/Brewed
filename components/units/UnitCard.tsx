import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { UNIT_STATUS_LABELS, UNIT_STATUS_COLORS } from '@/constants';
import type { Unit, EventWithFinancials } from '@/types';
import type { UnitStatus } from '@/types';

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function ExpiryPill({ label, dateStr }: { label: string; dateStr: string | null }) {
  if (!dateStr) return null;
  const days = daysUntil(dateStr);
  if (days === null) return null;
  const expired = days < 0;
  const soon = days >= 0 && days <= 30;
  if (!expired && !soon) return null;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999,
      backgroundColor: expired ? '#fee2e2' : '#fef3c7',
    }}>
      <Text style={{ fontSize: 10 }}>{expired ? '🔴' : '🟡'}</Text>
      <Text style={{ fontSize: 10, fontWeight: '600', color: expired ? '#991b1b' : '#92400e' }}>
        {label}{expired ? ' expired' : ` due ${days === 0 ? 'today' : `in ${days}d`}`}
      </Text>
    </View>
  );
}

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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                {unit.registration ? (
                  <Text className="text-slate-500 text-xs font-medium tracking-wide">{unit.registration}</Text>
                ) : null}
                {unit.vehicle_type ? (
                  <View style={{ backgroundColor: '#f5f5f4', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#57534e' }}>{unit.vehicle_type}</Text>
                  </View>
                ) : null}
              </View>
              {(unit.height_m != null || unit.length_m != null || unit.width_m != null) ? (
                <Text style={{ fontSize: 10, color: '#a8a29e', marginTop: 2 }}>
                  {[
                    unit.height_m != null && `H ${unit.height_m.toFixed(1)}m`,
                    unit.length_m != null && `L ${unit.length_m.toFixed(1)}m`,
                    unit.width_m  != null && `W ${unit.width_m.toFixed(1)}m`,
                  ].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </View>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.bgHex, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dot }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textHex }}>
                {UNIT_STATUS_LABELS[status]}
              </Text>
            </View>
          </View>

          {/* Expiry warnings */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
            <ExpiryPill label="MOT" dateStr={unit.mot_date} />
            <ExpiryPill label="Tax" dateStr={unit.tax_date} />
            <ExpiryPill label="Service" dateStr={unit.service_date} />
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
