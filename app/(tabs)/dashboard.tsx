import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDashboard } from '@/lib/queries/dashboard';
import { formatCurrencyCompact, formatCurrency, formatCurrencyInt, formatPercent, formatDateRange } from '@/lib/formatters';
import { StatCard } from '@/components/dashboard/StatCard';
import { RevenueBarChart } from '@/components/dashboard/RevenueBarChart';
import { StatusPieChart } from '@/components/dashboard/StatusPieChart';
import { EventCard } from '@/components/events/EventCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { QueryError } from '@/components/shared/QueryError';
import { EditionStrip } from '@/components/shared/EditionStrip';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/queries/profile';
import { UNIT_STATUS_COLORS } from '@/constants';
import type { UnitWithStatus } from '@/types';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [refreshing, setRefreshing] = useState(false);
  const [showFees, setShowFees] = useState(false);
  const { data: stats, isLoading, isError, error, refetch } = useDashboard(year);

  const insights = useMemo<{ icon: string; text: string; color: string }[]>(() => {
    if (!stats) return [];
    const result: { icon: string; text: string; color: string }[] = [];

    const pendingCount = stats.statusBreakdown.find((s) => s.status === 'pending')?.count ?? 0;
    if (pendingCount > 0) {
      result.push({ icon: '📋', text: `${pendingCount} application${pendingCount > 1 ? 's' : ''} awaiting a decision`, color: '#b45309' });
    }

    const bestMonth = [...stats.monthlyRevenue].sort((a, b) => b.netProfit - a.netProfit)[0];
    if (bestMonth && bestMonth.netProfit > 0) {
      result.push({ icon: '🏆', text: `Best month: ${bestMonth.month} (${formatCurrencyInt(bestMonth.netProfit)} net)`, color: '#15803d' });
    }

    const today = new Date();
    const alertedKeys = new Set<string>();
    stats.unitStatuses.forEach((u) => {
      const dates = [
        { label: 'MOT', d: u.mot_date },
        { label: 'Tax', d: u.tax_date },
      ];
      dates.forEach(({ label, d }) => {
        if (!d) return;
        const key = `${u.id}:${label}`;
        if (alertedKeys.has(key)) return;
        const days = Math.ceil((new Date(d).getTime() - today.getTime()) / 86400000);
        if (days < 0) {
          result.push({ icon: '🔴', text: `${u.name} ${label} has expired`, color: '#dc2626' });
          alertedKeys.add(key);
        } else if (days <= 30) {
          result.push({ icon: '🟡', text: `${u.name} ${label} expires in ${days} day${days !== 1 ? 's' : ''}`, color: '#d97706' });
          alertedKeys.add(key);
        }
      });
    });

    if (stats.upcomingEvents.length === 0 && stats.totalEventsYtd > 0) {
      result.push({ icon: '📅', text: 'No upcoming accepted events', color: '#64748b' });
    }
    return result;
  }, [stats]);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      {/* Newspaper masthead */}
      <EditionStrip businessName={profile?.business_name ?? 'My Business'} />

      {/* Year selector */}
      <View className="bg-white px-4 py-3 border-b border-stone-100">
        <View className="flex-row gap-2">
          {YEARS.map((y) => (
            <TouchableOpacity
              key={y}
              onPress={() => setYear(y)}
              accessibilityRole="button"
              accessibilityLabel={`Show ${y}`}
              accessibilityState={{ selected: year === y }}
              className={`px-4 py-1.5 rounded-full ${year === y ? 'bg-amber-700' : 'bg-stone-100'}`}
            >
              <Text className={`text-sm font-medium ${year === y ? 'text-white' : 'text-stone-600'}`}>{y}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <LoadingSpinner message="Loading dashboard..." />
      ) : isError ? (
        <QueryError error={error} onRetry={refetch} message="Couldn't load dashboard" />
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#f59e0b" />}
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
                subtitle={(stats?.committedFees ?? 0) > 0 ? `Excl. £${(stats!.committedFees).toFixed(0)} committed` : undefined}
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

            {/* Insights strip */}
            {insights.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {insights.map((ins, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#e7e5e4', maxWidth: 260 }}>
                    <Text style={{ fontSize: 14 }}>{ins.icon}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: ins.color, flexShrink: 1 }}>{ins.text}</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Committed Fees — collapsible */}
            {stats && stats.committedFees > 0 && (
              <View className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
                <TouchableOpacity
                  onPress={() => setShowFees((v) => !v)}
                  activeOpacity={0.7}
                  style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontWeight: '700', color: '#78350f', fontSize: 14 }}>💳 Committed Fees</Text>
                      <View style={{ backgroundColor: '#fde68a', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: '#78350f', fontSize: 11, fontWeight: '700' }}>
                          {stats.upcomingCommitments.length} event{stats.upcomingCommitments.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: '#b45309', fontSize: 11, marginTop: 2 }}>
                      {showFees ? 'Tap to collapse' : 'Tap to see breakdown'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontWeight: '700', color: '#92400e', fontSize: 16 }}>{formatCurrency(stats.committedFees)}</Text>
                    <Text style={{ color: '#b45309', fontSize: 13 }}>{showFees ? '▲' : '▼'}</Text>
                  </View>
                </TouchableOpacity>

                {showFees && (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#fde68a' }}>
                    <Text style={{ color: '#b45309', fontSize: 11, paddingTop: 12, marginBottom: 8 }}>
                      Pitch + power fees paid for upcoming accepted events
                    </Text>
                    {stats.upcomingCommitments.map((c, idx) => (
                      <View
                        key={c.id}
                        style={{
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                          paddingVertical: 10,
                          borderTopWidth: idx === 0 ? 0 : 1,
                          borderTopColor: '#fef3c7',
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ color: '#78350f', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{c.name}</Text>
                          <Text style={{ color: '#b45309', fontSize: 11, marginTop: 1 }}>{formatDateRange(c.date, c.end_date)}</Text>
                        </View>
                        <Text style={{ color: '#92400e', fontWeight: '700', fontSize: 14 }}>{formatCurrency(c.committedFee)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

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
