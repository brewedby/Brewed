import React, { useState } from 'react';
import { View, Text, RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvents } from '@/lib/queries/events';
import { CalendarView } from '@/components/events/CalendarView';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Show all active events (exclude rejected and withdrawn)
  const { data: allEvents = [], isLoading, refetch } = useEvents();
  const events = allEvents.filter(
    (e) => e.status !== 'rejected' && e.status !== 'withdrawn',
  );

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pt-2 pb-3 bg-white border-b border-stone-100">
        <Text className="text-2xl font-bold text-stone-900">Calendar</Text>
        <Text className="text-stone-500 text-xs mt-0.5">Accepted, waitlisted &amp; pending events</Text>
      </View>

      {isLoading ? (
        <LoadingSpinner message="Loading calendar..." />
      ) : !events || events.length === 0 ? (
        <ScrollView
          className="flex-1 px-4 pt-8"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />
          }
        >
          <EmptyState
            icon="📅"
            title="No upcoming events"
            description="Accepted, waitlisted and pending events will appear here automatically."
          />
        </ScrollView>
      ) : (
        <CalendarView
          events={events}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />
          }
        />
      )}
    </View>
  );
}
