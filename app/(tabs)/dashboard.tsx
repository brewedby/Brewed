import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDashboard } from '@/lib/queries/dashboard';
import { formatCurrencyCompact, formatCurrency, formatPercent, formatDateRange } from '@/lib/formatters';
import { StatCard } from '@/components/dashboard/StatCard';
import { RevenueBarChart } from '@/components/dashboard/RevenueBarChart';
import { StatusPieChart } from '@/components/dashboard/StatusPieChart';
import { EventCard } from '@/components/events/EventCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useAuth } from '@/lib/auth';
import { UNIT_STATUS_COLORS } from '@/constants';
import type { UnitWithStatus } from '@/types';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [refreshing, setRefreshing] = useState(false);
  const { data: stats, isLoading, refetch } = useDashboard(year);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-4 pt-2 pb-3 border-b border-stone-100">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 bg-amber-700 rounded-lg items-center justify-center">
              <Text className="text-base">☕</Text>
            </View>
            <View>
              <Text className="font-bold text-stone-900 text-base">Brewed by Boon</Text>
              <Text className="text-stone-400 text-xs">{user?.email}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={signOut}>
            <Text className="text-stone-400 text-sm">Sign out</Text>
          </TouchableOpacity>
        </View>

        {/* Year selector */}
        <View className="flex-row gap-2">
          {YEARS.map((y) => (
            <TouchableOpacity
              key={y}
              onPress={() => setYear(y)}
              className={`px-4 py-1.5 rounded-full ${year === y ? 'bg-amber-700' : 'bg-stone-100'}`}
            >
              <Text className={`text-sm font-medium ${year === y ? 'text-white' : 'text-stone-600'}`}>{y}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <LoadingSpinner message="Loading dashboard..." />
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />}
        >
          <View className="px-4 pt-4 gap-4">
            {/* Stats grid */}
            <View className="flex-row gap-3">
              <StatCard
                title="Gross Sales"
                value={formatCurrencyCompact(stats?.grossSalesYtd ?? 0)}
                icon="💰"
                colorScheme="amber"
              />
              <StatCard
                title="Net Profit"
                value={formatCurrencyCompact(stats?.netProfitYtd ?? 0)}
                icon="📈"
                colorScheme={(stats?.netProfitYtd ?? 0) >= 0 ? 'green' : 'red'}
              />
            </View>

            <View className="flex-row gap-3">
              <StatCard
                title="Events YTD"
                value={String(stats?.totalEventsYtd ?? 0)}
                icon="🎪"
              />
              <StatCard
                title="Acceptance Rate"
                value={`${(stats?.acceptanceRate ?? 0).toFixed(0)}%`}
                icon="✅"
                colorScheme="green"
              />
              <StatCard
                title="Avg / Event"
                value={formatCurrencyCompact(stats?.avgRevenuePerEvent ?? 0)}
                icon="⚖️"
              />
            </View>

            {/* Fleet Overview */}
            {stats && stats.unitStatuses.length > 0 && (
              <View>
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="font-bold text-stone-900">Your Fleet</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/fleet')}>
                    <Text className="text-amber-600 text-sm">Manage →</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {stats.unitStatuses.map((unit: UnitWithStatus) => (
                    <View
                      key={unit.id}
                      className="bg-white rounded-2xl p-3 border border-slate-100 w-40 overflow-hidden"
                      style={{ borderLeftWidth: 3, borderLeftColor: UNIT_STATUS_COLORS[unit.status].dot }}
                    >
                      <Text className="font-bold text-slate-900 text-sm" numberOfLines={1}>{unit.name}</Text>
                      {unit.registration ? (
                        <Text className="text-xs text-slate-400 mt-0.5">{unit.registration}</Text>
                      ) : null}
                      <View className="mt-1.5">
                        {unit.currentEvent ? (
                          <Text className="text-xs text-amber-700" numberOfLines={1}>
                            📍 {unit.currentEvent.name}
                          </Text>
                        ) : unit.status === 'active' ? (
                          <Text className="text-xs text-green-600">✅ Free</Text>
                        ) : unit.status === 'maintenance' ? (
                          <Text className="text-xs text-amber-600">🔧 Maint.</Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Milk Usage */}
            {stats && (stats.totalFreshMilkLitres > 0 || stats.totalAltMilkLitres > 0) && (
              <View>
                <Text className="font-bold text-stone-900 mb-3">Milk Used (YTD) — {year}</Text>
                <View className="flex-row gap-3">
                  <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100">
                    <Text className="text-slate-700 font-semibold text-sm">
                      🥛 {stats.totalFreshMilkLitres.toFixed(1)} L
                    </Text>
                    <Text className="text-slate-400 text-xs mt-0.5">Fresh Milk</Text>
                  </View>
                  <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100">
                    <Text className="text-slate-700 font-semibold text-sm">
                      🌱 {stats.totalAltMilkLitres.toFixed(1)} L
                    </Text>
                    <Text className="text-slate-400 text-xs mt-0.5">Alt Milk</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Revenue chart */}
            {stats && <RevenueBarChart data={stats.monthlyRevenue} />}

            {/* Status breakdown */}
            {stats && stats.statusBreakdown.length > 0 && (
              <StatusPieChart data={stats.statusBreakdown} />
            )}

            {/* Reports quick access */}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/reports')}
              className="bg-white rounded-2xl p-4 border border-slate-100 flex-row items-center justify-between"
            >
              <View className="flex-1 mr-3">
                <Text className="font-bold text-slate-900 text-sm">📈 Reports</Text>
                <Text className="text-slate-400 text-xs mt-0.5">Annual P&L, top events, export CSV</Text>
              </View>
              <Text className="text-amber-600 font-medium text-sm">View →</Text>
            </TouchableOpacity>

            {/* Upcoming events */}
            {stats && stats.upcomingEvents.length > 0 && (
              <View>
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="font-bold text-stone-900">Upcoming Accepted</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
                    <Text className="text-amber-600 text-sm">View all</Text>
                  </TouchableOpacity>
                </View>
                {stats.upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </View>
            )}

            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      )}
    </View>
  );
}
