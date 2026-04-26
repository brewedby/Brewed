import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDashboard } from '@/lib/queries/dashboard';
import { useUnits } from '@/lib/queries/units';
import { UnitCard } from '@/components/units/UnitCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { QueryError } from '@/components/shared/QueryError';
import type { UnitWithStatus } from '@/types';

export default function FleetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: dashboardStats, isLoading: dashboardLoading, refetch: refetchDashboard } = useDashboard();
  const { data: rawUnits, isLoading: unitsLoading, isError, error, refetch: refetchUnits } = useUnits();

  const isLoading = dashboardLoading && unitsLoading;

  // Prefer dashboard unitStatuses (includes currentEvent), fall back to raw units
  const units: UnitWithStatus[] = dashboardStats?.unitStatuses
    ?? (rawUnits?.map((u) => ({ ...u, currentEvent: null })) ?? []);

  const activeCount = units.filter((u) => u.status === 'active').length;
  const maintenanceCount = units.filter((u) => u.status === 'maintenance').length;

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refetchDashboard(), refetchUnits()]);
    setRefreshing(false);
  }

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pt-2 pb-3 bg-white border-b border-stone-100">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xl font-bold text-stone-900">Your Fleet</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/fleet/new')}
            accessibilityRole="button"
            accessibilityLabel="Add new unit"
            className="bg-amber-700 px-4 py-2 rounded-xl"
          >
            <Text className="text-white font-semibold text-sm">+ Add Unit</Text>
          </TouchableOpacity>
        </View>

        {units.length > 0 && (
          <View className="flex-row gap-2">
            {activeCount > 0 && (
              <View className="bg-green-100 px-3 py-1 rounded-full">
                <Text className="text-green-800 text-xs font-semibold">{activeCount} active</Text>
              </View>
            )}
            {maintenanceCount > 0 && (
              <View className="bg-amber-100 px-3 py-1 rounded-full">
                <Text className="text-amber-800 text-xs font-semibold">{maintenanceCount} in maintenance</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {isLoading ? (
        <LoadingSpinner message="Loading fleet..." />
      ) : isError ? (
        <QueryError error={error} onRetry={refetchUnits} message="Couldn't load fleet" />
      ) : (
        <FlatList
          data={units}
          keyExtractor={(item) => item.id}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
          ListEmptyComponent={
            <EmptyState
              icon="🚐"
              title="No units added yet"
              description="Add your coffee trucks and vans to track where they are."
              action={{ label: 'Add First Unit', onPress: () => router.push('/(tabs)/fleet/new') }}
            />
          }
          ListFooterComponent={<View style={{ height: 32 }} />}
          renderItem={({ item: unit }) => (
            <UnitCard
              unit={unit}
              currentEvent={unit.currentEvent}
              onPress={() => router.push(`/(tabs)/fleet/${unit.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}
