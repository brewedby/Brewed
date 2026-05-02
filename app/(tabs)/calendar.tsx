import React, { useState } from 'react';
import { View, Text, RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvents } from '@/lib/queries/events';
import { CalendarView } from '@/components/events/CalendarView';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { FarMasthead } from '@/components/far/Masthead';
import { useTheme } from '@/lib/themeContext';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const p = tokens.palette;
  const [refreshing, setRefreshing] = useState(false);

  const { data: allEvents = [], isLoading, refetch } = useEvents();
  const events = allEvents.filter(
    (e) => e.status !== 'rejected' && e.status !== 'withdrawn',
  );

  const accepted = events.filter((e) => e.status === 'accepted').length;
  const pending = events.filter((e) => e.status === 'pending').length;
  const clashSub = events.length > 0
    ? `${accepted} accepted, ${pending} pending`
    : 'Accepted, waitlisted & pending events';

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <FarMasthead
        eyebrow={`The calendar · ${events.length} entr${events.length === 1 ? 'y' : 'ies'}`}
        title="Calendar"
        sub={clashSub}
      />

      {isLoading ? (
        <LoadingSpinner message="Loading calendar..." />
      ) : !events || events.length === 0 ? (
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 20, paddingTop: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={p.brand} />
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
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={p.brand} />
          }
        />
      )}
    </View>
  );
}
