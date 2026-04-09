import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEvents } from '@/lib/queries/events';
import { EventCard } from '@/components/events/EventCard';
import { EventStatusBadge } from '@/components/shared/EventStatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { STATUSES, STATUS_LABELS } from '@/constants';
import type { ApplicationStatus } from '@/types';

const YEARS = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<number | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const { data: events, isLoading, refetch } = useEvents({
    status: statusFilter,
    year: yearFilter,
  });

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const totalRevenue = events?.reduce((s, e) => s + (e.event_financials?.gross_sales ?? 0), 0) ?? 0;
  const totalNet = events?.reduce((s, e) => s + e.calculations.netProfit, 0) ?? 0;

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pt-2 pb-3 bg-white border-b border-stone-100">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-bold text-stone-900">Events</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/events/new')}
            className="bg-amber-700 px-4 py-2 rounded-xl"
          >
            <Text className="text-white font-semibold text-sm">+ New Event</Text>
          </TouchableOpacity>
        </View>

        {/* Status filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <TouchableOpacity
            onPress={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-full border ${statusFilter === 'all' ? 'bg-stone-900 border-stone-900' : 'bg-white border-stone-200'}`}
          >
            <Text className={`text-xs font-medium ${statusFilter === 'all' ? 'text-white' : 'text-stone-600'}`}>All</Text>
          </TouchableOpacity>
          {STATUSES.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setStatusFilter(statusFilter === s ? 'all' : s)}
              className={`px-3 py-1.5 rounded-full border ${statusFilter === s ? 'bg-stone-900 border-stone-900' : 'bg-white border-stone-200'}`}
            >
              <Text className={`text-xs font-medium ${statusFilter === s ? 'text-white' : 'text-stone-600'}`}>
                {STATUS_LABELS[s]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Year filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 6 }}>
          <TouchableOpacity
            onPress={() => setYearFilter(undefined)}
            className={`px-3 py-1 rounded-full border ${!yearFilter ? 'bg-amber-100 border-amber-300' : 'bg-white border-stone-200'}`}
          >
            <Text className={`text-xs font-medium ${!yearFilter ? 'text-amber-800' : 'text-stone-500'}`}>All Years</Text>
          </TouchableOpacity>
          {YEARS.map((y) => (
            <TouchableOpacity
              key={y}
              onPress={() => setYearFilter(yearFilter === y ? undefined : y)}
              className={`px-3 py-1 rounded-full border ${yearFilter === y ? 'bg-amber-100 border-amber-300' : 'bg-white border-stone-200'}`}
            >
              <Text className={`text-xs font-medium ${yearFilter === y ? 'text-amber-800' : 'text-stone-500'}`}>{y}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Summary strip */}
      {events && events.length > 0 && (
        <View className="flex-row bg-white px-4 py-2 border-b border-stone-100 gap-6">
          <Text className="text-stone-500 text-xs">{events.length} event{events.length !== 1 ? 's' : ''}</Text>
          {totalRevenue > 0 && <Text className="text-stone-500 text-xs">Sales: <Text className="text-stone-700 font-medium">£{totalRevenue.toFixed(0)}</Text></Text>}
          {totalNet !== 0 && <Text className="text-stone-500 text-xs">Net: <Text className={`font-medium ${totalNet >= 0 ? 'text-green-600' : 'text-red-500'}`}>£{totalNet.toFixed(0)}</Text></Text>}
        </View>
      )}

      {isLoading ? (
        <LoadingSpinner message="Loading events..." />
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />}
        >
          {!events || events.length === 0 ? (
            <EmptyState
              icon="🎪"
              title="No events yet"
              description="Apply to your first event and track it here."
              action={{ label: '+ Add Event', onPress: () => router.push('/(tabs)/events/new') }}
            />
          ) : (
            events.map((event) => <EventCard key={event.id} event={event} />)
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}
