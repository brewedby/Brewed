import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { UNIT_STATUS_LABELS, UNIT_STATUS_COLORS } from '@/constants';
import { useTheme } from '@/lib/themeContext';
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

function complianceDotColor(dateStr: string | null): string {
  const days = daysUntil(dateStr);
  if (!dateStr || days === null) return '#a8a29e';
  if (days < 0) return '#dc2626';
  if (days <= 14) return '#d97706';
  return '#22c55e';
}

interface Props {
  unit: Unit;
  currentEvent?: EventWithFinancials | null;
  onPress: () => void;
}

export const UnitCard = React.memo(function UnitCard({ unit, currentEvent, onPress }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  const status = unit.status as UnitStatus;
  const colors = UNIT_STATUS_COLORS[status];
  const dimensions = [
    { key: 'H', value: unit.height_m },
    { key: 'L', value: unit.length_m },
    { key: 'W', value: unit.width_m },
  ].filter((d) => d.value != null);

  const complianceDates = [
    { label: 'MOT', dateStr: unit.mot_date },
    { label: 'TAX', dateStr: unit.tax_date },
    { label: 'SVC', dateStr: unit.service_date },
  ].filter(c => c.dateStr);

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open unit ${unit.name}`}
      activeOpacity={0.7}
      style={{ borderBottomWidth: 1, borderBottomColor: p.border, borderStyle: 'dashed', paddingVertical: 14 }}
    >
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
        {/* Status accent column */}
        <View style={{ width: 4, alignSelf: 'stretch', backgroundColor: colors.dot, marginTop: 2 }} />

        <View style={{ flex: 1 }}>
          {/* Name row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontFamily: tokens.type.display, fontSize: 18, color: p.text, flex: 1, marginRight: 8 }}>{unit.name}</Text>
            <View style={{ borderWidth: 1, borderColor: colors.dot, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.8, color: colors.dot }}>
                {'● ' + UNIT_STATUS_LABELS[status].toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Registration + vehicle type */}
          {(unit.registration || unit.vehicle_type) && (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {unit.registration && (
                <Text style={{ fontSize: 11, color: p.textMuted, fontWeight: '600', letterSpacing: 1 }}>{unit.registration}</Text>
              )}
              {unit.vehicle_type && (
                <Text style={{ fontSize: 11, color: p.textFaint }}>{unit.vehicle_type}</Text>
              )}
            </View>
          )}

          {/* Compliance dates */}
          {complianceDates.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
              {complianceDates.map(({ label, dateStr }) => (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: complianceDotColor(dateStr) }} />
                  <Text style={{ fontSize: 10, color: p.textMuted, fontWeight: '600', letterSpacing: 0.5 }}>{label}</Text>
                  <Text style={{ fontSize: 10, color: p.textMuted }}>{dateStr ? formatComplianceDate(dateStr) : '—'}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Dimensions */}
          {dimensions.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
              {dimensions.map((d) => (
                <Text key={d.key} style={{ fontSize: 11, color: p.textFaint }}>
                  <Text style={{ fontWeight: '600', color: p.textMuted }}>{d.key} </Text>
                  {d.value!.toFixed(2)}m
                </Text>
              ))}
            </View>
          )}

          {/* Current event / availability */}
          {currentEvent ? (
            <Text style={{ fontSize: 11, color: '#d97706', fontWeight: '600' }}>
              ◉ {currentEvent.name}
            </Text>
          ) : status === 'active' ? (
            <Text style={{ fontSize: 11, color: '#22c55e', fontWeight: '600' }}>✓ Available</Text>
          ) : status === 'maintenance' ? (
            <Text style={{ fontSize: 11, color: '#d97706', fontWeight: '600' }}>⚙ In Maintenance</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});
