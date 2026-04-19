import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUnit, useDeleteUnit } from '@/lib/queries/units';
import { useEvents } from '@/lib/queries/events';
import { EventCard } from '@/components/events/EventCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDateRange, formatDate } from '@/lib/formatters';
import { UNIT_STATUS_LABELS, UNIT_STATUS_COLORS } from '@/constants';
import type { UnitStatus } from '@/types';

export default function UnitDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

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
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  if (isLoading) return <LoadingSpinner message="Loading unit..." />;
  if (!unit) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-stone-500">Unit not found</Text>
      </View>
    );
  }

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
    return d.toISOString().split('T')[0];
  }

  const serviceDue = serviceDueDate(unit.service_date, unit.service_interval);

  const today = new Date().toISOString().split('T')[0];
  const upcomingEvent = [...unitEvents]
    .filter((e) => e.status === 'accepted' && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white border-b border-stone-100">
        <View style={{ height: 4, backgroundColor: colors.dot }} />
        <View className="px-4 pt-3 pb-4">
          <View className="flex-row items-center justify-between mb-2">
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back to fleet"
              className="flex-row items-center"
            >
              <Text className="text-amber-500 font-semibold text-sm">‹ Fleet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/fleet/${id}/edit`)}
              accessibilityRole="button"
              accessibilityLabel="Edit unit"
              className="bg-stone-900 px-4 py-1.5 rounded-xl"
            >
              <Text className="text-white font-semibold text-sm">Edit</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-xl font-bold text-stone-900 mb-1">{unit.name}</Text>

          <View className="flex-row items-center gap-2 flex-wrap">
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.bgHex }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dot, marginRight: 5 }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textHex }}>{UNIT_STATUS_LABELS[status]}</Text>
            </View>
            {unit.registration && (
              <Text className="text-stone-500 text-sm font-medium tracking-wide">{unit.registration}</Text>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#f59e0b" />
        }
      >
        {/* Current / upcoming event highlight */}
        {upcomingEvent && (
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
            <Text className="text-amber-700 text-xs font-semibold uppercase tracking-wide mb-1">
              Upcoming Event
            </Text>
            <Text className="font-bold text-stone-900 text-base">{upcomingEvent.name}</Text>
            <Text className="text-stone-600 text-sm mt-0.5">
              📅 {formatDateRange(upcomingEvent.date, upcomingEvent.end_date)}
            </Text>
            <Text className="text-stone-500 text-sm mt-0.5" numberOfLines={1}>
              📍 {upcomingEvent.location}
            </Text>
          </View>
        )}

        {/* Dimensions */}
        {(unit.height_m != null || unit.length_m != null || unit.width_m != null) && (
          <View className="bg-white rounded-2xl p-4 border border-stone-100 mb-4">
            <Text className="font-bold text-stone-900 mb-3">Dimensions</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {unit.height_m != null && (
                <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>{unit.height_m.toFixed(1)}</Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Height (m)</Text>
                </View>
              )}
              {unit.length_m != null && (
                <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>{unit.length_m.toFixed(1)}</Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Length (m)</Text>
                </View>
              )}
              {unit.width_m != null && (
                <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>{unit.width_m.toFixed(1)}</Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Width (m)</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Vehicle dates */}
        {(unit.mot_date || unit.tax_date || unit.service_date) && (
          <View className="bg-white rounded-2xl p-4 border border-stone-100 mb-4">
            <Text className="font-bold text-stone-900 mb-3">Compliance Dates</Text>
            {[
              { label: 'MOT Expiry', dateStr: unit.mot_date, info: expiryInfo(unit.mot_date) },
              { label: 'Tax (VED) Expiry', dateStr: unit.tax_date, info: expiryInfo(unit.tax_date) },
              { label: 'Next Service Due', dateStr: serviceDue, info: expiryInfo(serviceDue) },
            ].filter(row => row.dateStr).map(({ label, info }) => (
              <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#fafaf9' }}>
                <Text style={{ fontSize: 13, color: '#78716c' }}>{label}</Text>
                {info && (
                  <Text style={{ fontSize: 13, fontWeight: '600', color: info.color }}>{info.text}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {unit.notes && (
          <View className="bg-white rounded-2xl p-4 border border-stone-100 mb-4">
            <Text className="font-bold text-stone-900 mb-1">Notes</Text>
            <Text className="text-stone-600 text-sm leading-relaxed">{unit.notes}</Text>
          </View>
        )}

        {/* Events list */}
        <Text className="font-bold text-stone-900 mb-3">Events</Text>
        {unitEvents.length === 0 ? (
          <EmptyState
            icon="🎪"
            title="No events yet"
            description="No events have been assigned to this unit."
          />
        ) : (
          unitEvents.map((event) => <EventCard key={event.id} event={event} />)
        )}

        <View className="bg-white rounded-2xl p-4 border border-stone-100 mt-4">
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
            className="border border-red-200 py-3 rounded-xl items-center"
          >
            <Text className="text-red-500 font-medium text-sm">Delete Vehicle</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
