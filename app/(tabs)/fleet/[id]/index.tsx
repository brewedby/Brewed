import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUnit, useDeleteUnit } from '@/lib/queries/units';
import { useEvents } from '@/lib/queries/events';
import { EventCard } from '@/components/events/EventCard';
import { ConfirmSheet } from '@/components/shared/ConfirmSheet';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDateRange } from '@/lib/formatters';
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
  const [showDelete, setShowDelete] = useState(false);

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

  const today = new Date().toISOString().split('T')[0];
  const upcomingEvent = unitEvents.find(
    (e) => e.status === 'accepted' && e.date >= today,
  ) ?? null;

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white border-b border-stone-100">
        <View style={{ height: 4, backgroundColor: colors.dot }} />
        <View className="px-4 pt-3 pb-4">
          <View className="flex-row items-center justify-between mb-2">
            <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
              <Text className="text-amber-500 font-semibold text-sm">‹ Fleet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/fleet/${id}/edit`)}
              className="bg-stone-900 px-4 py-1.5 rounded-xl"
            >
              <Text className="text-white font-semibold text-sm">Edit</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-xl font-bold text-stone-900 mb-1">{unit.name}</Text>

          <View className="flex-row items-center gap-2 flex-wrap">
            <View className={`flex-row items-center px-2.5 py-1 rounded-full ${colors.bg}`}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dot, marginRight: 5 }} />
              <Text className={`text-xs font-semibold ${colors.text}`}>{UNIT_STATUS_LABELS[status]}</Text>
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
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />
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

        {/* Danger zone */}
        <View className="bg-white rounded-2xl p-4 border border-red-100 mt-4">
          <Text className="font-semibold text-stone-700 mb-3">Danger Zone</Text>
          <TouchableOpacity
            onPress={() => setShowDelete(true)}
            className="border border-red-300 py-3 rounded-xl items-center"
          >
            <Text className="text-red-600 font-medium">Delete Unit</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ConfirmSheet
        visible={showDelete}
        title="Delete Unit"
        message={`Delete "${unit.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </View>
  );
}
