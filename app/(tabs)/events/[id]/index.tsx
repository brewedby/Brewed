import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEvent, useDeleteEvent } from '@/lib/queries/events';
import { FinancialsCard } from '@/components/events/FinancialsCard';
import { StaffingList } from '@/components/events/StaffingList';
import { InfrastructureList } from '@/components/events/InfrastructureList';
import { EventStatusBadge } from '@/components/shared/EventStatusBadge';
import { ConfirmSheet } from '@/components/shared/ConfirmSheet';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatDateRange, formatDate } from '@/lib/formatters';

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: event, isLoading, refetch } = useEvent(id);
  const deleteEvent = useDeleteEvent();
  const [refreshing, setRefreshing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleDelete() {
    try {
      await deleteEvent.mutateAsync(id);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  if (isLoading) return <LoadingSpinner message="Loading event..." />;
  if (!event) return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-stone-500">Event not found</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-4 pt-2 pb-4 border-b border-stone-100">
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity onPress={() => router.back()} className="p-1">
            <Text className="text-amber-600 text-base">‹ Events</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/(tabs)/events/${id}/edit`)}
            className="bg-amber-700 px-4 py-1.5 rounded-xl"
          >
            <Text className="text-white font-semibold text-sm">Edit</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-xl font-bold text-stone-900 mb-1">{event.name}</Text>
        <View className="flex-row items-center gap-3 flex-wrap">
          <EventStatusBadge status={event.status} />
          <Text className="text-stone-500 text-sm">📅 {formatDateRange(event.date, event.end_date)}</Text>
        </View>
        <Text className="text-stone-600 text-sm mt-1">📍 {event.location}</Text>
        {event.concessions_companies && (
          <Text className="text-stone-500 text-sm mt-0.5">
            🏢 {event.concessions_companies.name}
          </Text>
        )}
        {event.application_date && (
          <Text className="text-stone-400 text-xs mt-1">
            Applied: {formatDate(event.application_date)}
          </Text>
        )}
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />}
      >
        <View className="gap-4">
          {/* Financials */}
          {event.event_financials && (
            <FinancialsCard financials={event.event_financials} calculations={event.calculations} />
          )}

          {/* Staffing */}
          {event.staffing_entries && event.staffing_entries.length > 0 && (
            <StaffingList entries={event.staffing_entries} />
          )}

          {/* Infrastructure */}
          {event.infrastructure_items && event.infrastructure_items.length > 0 && (
            <InfrastructureList items={event.infrastructure_items} />
          )}

          {/* Description */}
          {event.description && (
            <View className="bg-white rounded-2xl p-4 border border-stone-100">
              <Text className="font-bold text-stone-900 mb-2">Description</Text>
              <Text className="text-stone-600 text-sm leading-relaxed">{event.description}</Text>
            </View>
          )}

          {/* Notes */}
          {event.notes && (
            <View className="bg-white rounded-2xl p-4 border border-stone-100">
              <Text className="font-bold text-stone-900 mb-2">Notes</Text>
              <Text className="text-stone-600 text-sm leading-relaxed">{event.notes}</Text>
            </View>
          )}

          {/* Danger zone */}
          <View className="bg-white rounded-2xl p-4 border border-red-100 mt-2">
            <Text className="font-semibold text-stone-700 mb-3">Danger Zone</Text>
            <TouchableOpacity
              onPress={() => setShowDelete(true)}
              className="border border-red-300 py-3 rounded-xl items-center"
            >
              <Text className="text-red-600 font-medium">Delete Event</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      <ConfirmSheet
        visible={showDelete}
        title="Delete Event"
        message={`Are you sure you want to delete "${event.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </View>
  );
}
