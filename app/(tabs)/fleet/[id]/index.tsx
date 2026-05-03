import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUnit, useDeleteUnit } from '@/lib/queries/units';
import { useEvents } from '@/lib/queries/events';
import { EventCard } from '@/components/events/EventCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDateRange, formatDate, toISODateString } from '@/lib/formatters';
import { useTheme } from '@/lib/themeContext';
import { UNIT_STATUS_LABELS, UNIT_STATUS_COLORS } from '@/constants';
import type { UnitStatus } from '@/types';

export default function UnitDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tokens } = useTheme();
  const p = tokens.palette;

  const { data: unit, isLoading, refetch } = useUnit(id);
  const { data: events, refetch: refetchEvents } = useEvents({ unitId: id });
  const deleteUnit = useDeleteUnit();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refetch(), refetchEvents()]);
    setRefreshing(false);
  }

  async function handleDelete() {
    try {
      await deleteUnit.mutateAsync(id);
      router.back();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  if (isLoading) return <LoadingSpinner message="Loading unit..." />;
  if (!unit) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.bg }}>
      <Text style={{ color: p.textMuted }}>Unit not found</Text>
    </View>
  );

  const status = unit.status as UnitStatus;
  const colors = UNIT_STATUS_COLORS[status];
  const unitEvents = events ?? [];

  function expiryInfo(dateStr: string | null): { text: string; color: string } | null {
    if (!dateStr) return null;
    const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
    if (days < 0) return { text: `Expired ${Math.abs(days)}d ago`, color: '#dc2626' };
    if (days <= 30) return { text: `Due in ${days} day${days !== 1 ? 's' : ''}`, color: '#d97706' };
    return { text: formatDate(dateStr), color: '#059669' };
  }

  function serviceDueDate(serviceDate: string | null, interval: string | null): string | null {
    if (!serviceDate) return null;
    const d = new Date(serviceDate);
    if (interval === '6months') d.setMonth(d.getMonth() + 6);
    else d.setFullYear(d.getFullYear() + 1);
    return toISODateString(d);
  }

  const serviceDue = serviceDueDate(unit.service_date, unit.service_interval);

  const today = toISODateString(new Date());
  const upcomingEvent = [...unitEvents]
    .filter((e) => e.status === 'accepted' && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      {/* Status accent strip */}
      <View style={{ height: 3, backgroundColor: colors.dot }} />

      {/* Nav bar */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: p.text }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 16, right: 8 }}>
          <Text style={{ fontSize: 13, color: p.brand, fontWeight: '600' }}>‹ Fleet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push(`/(tabs)/fleet/${id}/edit`)}
          style={{ borderWidth: 2, borderColor: p.text, paddingHorizontal: 14, paddingVertical: 5 }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.5, color: p.text }}>EDIT</Text>
        </TouchableOpacity>
      </View>

      {/* Unit heading */}
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: p.border }}>
        <Text style={{ fontFamily: tokens.type.display, fontSize: 28, letterSpacing: -0.5, color: p.text, marginBottom: 8 }}>{unit.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ borderWidth: 1, borderColor: colors.dot, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1, color: colors.dot }}>
              {'● ' + UNIT_STATUS_LABELS[status].toUpperCase()}
            </Text>
          </View>
          {unit.registration && (
            <Text style={{ fontSize: 12, color: p.textMuted, fontWeight: '600', letterSpacing: 1 }}>{unit.registration}</Text>
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={p.brand} />
        }
      >
        {/* Upcoming event */}
        {upcomingEvent && (
          <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: colors.dot, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: colors.dot, marginBottom: 8 }}>UPCOMING EVENT</Text>
            <Text style={{ fontFamily: tokens.type.display, fontSize: 18, color: p.text, marginBottom: 4 }}>{upcomingEvent.name}</Text>
            <Text style={{ fontSize: 13, color: p.textMuted }}>
              {formatDateRange(upcomingEvent.date, upcomingEvent.end_date)}
            </Text>
            <Text style={{ fontSize: 13, color: p.textMuted, marginTop: 2 }} numberOfLines={1}>
              {upcomingEvent.location}
            </Text>
          </View>
        )}

        {/* Dimensions */}
        {(unit.height_m != null || unit.length_m != null || unit.width_m != null) && (
          <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: p.textMuted, marginBottom: 12 }}>DIMENSIONS</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {unit.height_m != null && (
                <View style={{ flex: 1, backgroundColor: p.bg, borderWidth: 1, borderColor: p.border, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontFamily: tokens.type.display, fontSize: 22, color: p.text }}>{unit.height_m.toFixed(1)}</Text>
                  <Text style={{ fontSize: 10, color: p.textMuted, marginTop: 4, letterSpacing: 0.5 }}>HEIGHT (m)</Text>
                </View>
              )}
              {unit.length_m != null && (
                <View style={{ flex: 1, backgroundColor: p.bg, borderWidth: 1, borderColor: p.border, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontFamily: tokens.type.display, fontSize: 22, color: p.text }}>{unit.length_m.toFixed(1)}</Text>
                  <Text style={{ fontSize: 10, color: p.textMuted, marginTop: 4, letterSpacing: 0.5 }}>LENGTH (m)</Text>
                </View>
              )}
              {unit.width_m != null && (
                <View style={{ flex: 1, backgroundColor: p.bg, borderWidth: 1, borderColor: p.border, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontFamily: tokens.type.display, fontSize: 22, color: p.text }}>{unit.width_m.toFixed(1)}</Text>
                  <Text style={{ fontSize: 10, color: p.textMuted, marginTop: 4, letterSpacing: 0.5 }}>WIDTH (m)</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Compliance dates */}
        {(unit.mot_date || unit.tax_date || unit.service_date) && (
          <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: p.textMuted, marginBottom: 4 }}>COMPLIANCE DATES</Text>
            {[
              { label: 'MOT Expiry', dateStr: unit.mot_date, info: expiryInfo(unit.mot_date) },
              { label: 'Tax (VED) Expiry', dateStr: unit.tax_date, info: expiryInfo(unit.tax_date) },
              { label: 'Next Service Due', dateStr: serviceDue, info: expiryInfo(serviceDue) },
            ].filter(row => row.dateStr).map(({ label, info }) => (
              <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: p.border, borderStyle: 'dashed' }}>
                <Text style={{ fontSize: 13, color: p.textMuted }}>{label}</Text>
                {info && <Text style={{ fontSize: 13, fontWeight: '600', color: info.color }}>{info.text}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {unit.notes && (
          <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: p.textMuted, marginBottom: 8 }}>NOTES</Text>
            <Text style={{ fontSize: 13, color: p.text, lineHeight: 20 }}>{unit.notes}</Text>
          </View>
        )}

        {/* Events */}
        <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: p.textMuted, marginBottom: 12 }}>EVENTS</Text>
        {unitEvents.length === 0 ? (
          <EmptyState icon="🎪" title="No events yet" description="No events have been assigned to this unit." />
        ) : (
          unitEvents.map((event) => <EventCard key={event.id} event={event} />)
        )}

        {/* Delete */}
        <View style={{ marginTop: 24, borderWidth: 1, borderColor: p.border, borderStyle: 'dashed' }}>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'Delete Vehicle',
                `Delete "${unit.name}"? This cannot be undone.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: handleDelete },
                ],
              )
            }
            style={{ padding: 16, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 13, color: '#dc2626', fontWeight: '600', letterSpacing: 0.5 }}>DELETE VEHICLE</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
