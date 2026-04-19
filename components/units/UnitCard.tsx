import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UNIT_STATUS_LABELS, UNIT_STATUS_COLORS } from '@/constants';
import type { Unit, EventWithFinancials } from '@/types';
import type { UnitStatus } from '@/types';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function formatComplianceDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${MONTH_SHORT[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
}

function ComplianceDate({ label, dateStr }: { label: string; dateStr: string | null }) {
  const days = daysUntil(dateStr);
  let dotColor = '#d6d3d1';
  let textColor = '#a8a29e';
  let dateLabel = '—';

  if (dateStr) {
    dateLabel = formatComplianceDate(dateStr);
    if (days !== null && days < 0) {
      dotColor = '#dc2626'; textColor = '#dc2626'; dateLabel = 'Expired';
    } else if (days !== null && days <= 30) {
      dotColor = '#d97706'; textColor = '#d97706';
    } else {
      dotColor = '#22c55e'; textColor = '#15803d';
    }
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
      <Text style={{ fontSize: 9, color: '#a8a29e', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>{label}</Text>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor, marginBottom: 4 }} />
      <Text style={{ fontSize: 11, fontWeight: '600', color: textColor, textAlign: 'center' }}>{dateLabel}</Text>
    </View>
  );
}

interface Props {
  unit: Unit;
  currentEvent?: EventWithFinancials | null;
  onPress: () => void;
}

export const UnitCard = React.memo(function UnitCard({ unit, currentEvent, onPress }: Props) {
  const status = unit.status as UnitStatus;
  const colors = UNIT_STATUS_COLORS[status];
  const hasDimensions = unit.height_m != null || unit.length_m != null || unit.width_m != null;
  const hasCompliance = unit.mot_date || unit.tax_date || unit.service_date;
  const dimensions = [
    { key: 'H', value: unit.height_m },
    { key: 'L', value: unit.length_m },
    { key: 'W', value: unit.width_m },
  ].filter((d) => d.value != null);

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open unit ${unit.name}`}
      activeOpacity={0.7}
      style={{ backgroundColor: '#fff', borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#f5f5f4', overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
    >
      <View style={{ height: 4, backgroundColor: colors.dot }} />
      <View style={{ padding: 14 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={{ fontWeight: '800', fontSize: 16, color: '#1c1917', letterSpacing: -0.3 }}>{unit.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
              {unit.registration ? (
                <Text style={{ fontSize: 12, color: '#78716c', fontWeight: '600', letterSpacing: 0.8 }}>{unit.registration}</Text>
              ) : null}
              {unit.vehicle_type ? (
                <View style={{ backgroundColor: '#f5f5f4', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#57534e' }}>{unit.vehicle_type}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.bgHex, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dot }} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textHex }}>{UNIT_STATUS_LABELS[status]}</Text>
          </View>
        </View>

        {/* Compliance dates — always visible */}
        {hasCompliance && (
          <View style={{ flexDirection: 'row', backgroundColor: '#fafaf9', borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#f0f0ef' }}>
            <ComplianceDate label="MOT" dateStr={unit.mot_date} />
            <View style={{ width: 1, backgroundColor: '#f0f0ef' }} />
            <ComplianceDate label="Tax" dateStr={unit.tax_date} />
            <View style={{ width: 1, backgroundColor: '#f0f0ef' }} />
            <ComplianceDate label="Service" dateStr={unit.service_date} />
          </View>
        )}

        {/* Dimensions */}
        {hasDimensions && (
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
            {dimensions.map((d) => (
              <View key={d.key} style={{ backgroundColor: '#f5f5f4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '500', color: '#a8a29e' }}>{d.key}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#44403c' }}>{d.value!.toFixed(2)}</Text>
                <Text style={{ fontSize: 10, color: '#a8a29e' }}>m</Text>
              </View>
            ))}
          </View>
        )}

        {/* Current event / availability */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {currentEvent ? (
            <>
              <Ionicons name="location" size={12} color="#d97706" />
              <Text style={{ color: '#d97706', fontSize: 12, fontWeight: '600', marginLeft: 4 }} numberOfLines={1}>
                {currentEvent.name}
              </Text>
            </>
          ) : status === 'active' ? (
            <>
              <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
              <Text style={{ color: '#16a34a', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>Available</Text>
            </>
          ) : status === 'maintenance' ? (
            <>
              <Ionicons name="construct" size={12} color="#d97706" />
              <Text style={{ color: '#d97706', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>In Maintenance</Text>
            </>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});
