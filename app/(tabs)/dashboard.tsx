import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDashboard } from '@/lib/queries/dashboard';
import { formatCurrencyCompact, formatCurrency, formatPercent, formatDateRange } from '@/lib/formatters';
import { RevenueBarChart } from '@/components/dashboard/RevenueBarChart';
import { StatusPieChart } from '@/components/dashboard/StatusPieChart';
import { QuickSalesSheet } from '@/components/dashboard/QuickSalesSheet';
import { EventCard } from '@/components/events/EventCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { QueryError } from '@/components/shared/QueryError';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/queries/profile';
import { UNIT_STATUS_COLORS } from '@/constants';
import type { UnitWithStatus } from '@/types';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

function YearPickerModal({ visible, current, onSelect, onClose }: {
  visible: boolean; current: number;
  onSelect: (y: number) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={{
          backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden',
          width: 220,
          shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
        }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f4' }}>
            <Text style={{ fontWeight: '700', fontSize: 14, color: '#1c1917' }}>Select Year</Text>
          </View>
          {YEARS.map((y) => (
            <TouchableOpacity
              key={y}
              onPress={() => { onSelect(y); onClose(); }}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 20, paddingVertical: 14,
                backgroundColor: y === current ? '#fef3c7' : '#fff',
                borderBottomWidth: 1, borderBottomColor: '#fafaf9',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: y === current ? '700' : '400', color: y === current ? '#b45309' : '#1c1917' }}>
                {y}
              </Text>
              {y === current && <Ionicons name="checkmark" size={16} color="#b45309" />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFees, setShowFees] = useState(false);
  const [quickSalesOpen, setQuickSalesOpen] = useState(false);
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
      result.push({ icon: '🏆', text: `Best month: ${bestMonth.month} (£${bestMonth.netProfit.toFixed(0)} net)`, color: '#15803d' });
    }

    const today = new Date();
    const alertedKeys = new Set<string>();
    stats.unitStatuses.forEach((u) => {
      [{ label: 'MOT', d: u.mot_date }, { label: 'Tax', d: u.tax_date }].forEach(({ label, d }) => {
        if (!d) return;
        const key = `${u.id}:${label}`;
        if (alertedKeys.has(key)) return;
        const days = Math.ceil((new Date(d).getTime() - today.getTime()) / 86400000);
        if (days < 0) {
          result.push({ icon: '🔴', text: `${u.name} ${label} has expired`, color: '#dc2626' });
          alertedKeys.add(key);
        } else if (days <= 30) {
          result.push({ icon: '🟡', text: `${u.name} ${label} expires in ${days}d`, color: '#d97706' });
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
      {/* Header */}
      <View className="bg-white px-4 pt-2 pb-3 border-b border-stone-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 bg-amber-700 rounded-lg items-center justify-center">
              <Text className="text-base">☕</Text>
            </View>
            <View>
              <Text className="font-bold text-stone-900 text-base">{profile?.business_name ?? 'My Business'}</Text>
              <Text className="text-stone-400 text-xs">{user?.email}</Text>
            </View>
          </View>

          {/* Year selector pill */}
          <TouchableOpacity
            onPress={() => setYearPickerOpen(true)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: '#fef3c7', borderRadius: 20,
              paddingHorizontal: 12, paddingVertical: 6,
              borderWidth: 1, borderColor: '#fcd34d',
            }}
            accessibilityLabel={`Currently showing ${year}. Tap to change year.`}
            accessibilityRole="button"
          >
            <Text style={{ color: '#92400e', fontWeight: '600', fontSize: 13 }}>{year}</Text>
            <Ionicons name="chevron-down" size={13} color="#92400e" />
          </TouchableOpacity>
        </View>
      </View>

      <YearPickerModal
        visible={yearPickerOpen}
        current={year}
        onSelect={setYear}
        onClose={() => setYearPickerOpen(false)}
      />

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

            {/* Stats card */}
            <View style={{ backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
              <View style={{ backgroundColor: '#92400e', paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: '#fef3c7', fontWeight: '700', fontSize: 13, letterSpacing: 0.2 }}>{year} Performance</Text>
                {(stats?.grossSalesYtd ?? 0) > 0 && (stats?.netProfitYtd ?? 0) > 0 && (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
                    <Text style={{ color: '#fde68a', fontSize: 12, fontWeight: '700' }}>
                      {((stats!.netProfitYtd / stats!.grossSalesYtd) * 100).toFixed(0)}% net margin
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {[
                  { icon: '💷', label: 'Gross Sales',  value: formatCurrencyCompact(stats?.grossSalesYtd ?? 0), color: '#b45309' },
                  { icon: '📈', label: 'Net Profit',   value: formatCurrencyCompact(stats?.netProfitYtd ?? 0),  color: (stats?.netProfitYtd ?? 0) >= 0 ? '#15803d' : '#dc2626' },
                  { icon: '🎪', label: 'Events',       value: String(stats?.totalEventsYtd ?? 0),               color: '#1c1917' },
                  { icon: '✅', label: 'Acceptance',   value: `${(stats?.acceptanceRate ?? 0).toFixed(0)}%`,    color: '#15803d' },
                ].map((s, i) => (
                  <View key={s.label} style={{ width: '50%', padding: 16, borderTopWidth: i >= 2 ? 1 : 0, borderRightWidth: i % 2 === 0 ? 1 : 0, borderColor: '#f5f5f4' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                      <Text style={{ fontSize: 12 }}>{s.icon}</Text>
                      <Text style={{ fontSize: 10, color: '#a8a29e', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>{s.label}</Text>
                    </View>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: s.color, letterSpacing: -0.5 }}>{s.value}</Text>
                  </View>
                ))}
              </View>
              <View style={{ borderTopWidth: 1, borderTopColor: '#f5f5f4', paddingHorizontal: 16, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fafaf9' }}>
                <Text style={{ fontSize: 12, color: '#a8a29e', fontWeight: '500' }}>Avg revenue / event</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#b45309' }}>{formatCurrencyCompact(stats?.avgRevenuePerEvent ?? 0)}</Text>
              </View>
              {(stats?.committedFees ?? 0) > 0 && (
                <View style={{ borderTopWidth: 1, borderTopColor: '#f5f5f4', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#b45309' }}>💳 Committed fees</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400e' }}>{formatCurrency(stats!.committedFees)}</Text>
                </View>
              )}
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

            {/* Committed Fees breakdown — collapsible */}
            {stats && stats.committedFees > 0 && (
              <View className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
                <TouchableOpacity
                  onPress={() => setShowFees((v) => !v)}
                  activeOpacity={0.7}
                  style={{ padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontWeight: '700', color: '#78350f', fontSize: 13 }}>💳 Committed Fees</Text>
                    <View style={{ backgroundColor: '#fde68a', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                      <Text style={{ color: '#78350f', fontSize: 11, fontWeight: '700' }}>
                        {stats.upcomingCommitments.length} event{stats.upcomingCommitments.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontWeight: '700', color: '#92400e', fontSize: 14 }}>{formatCurrency(stats.committedFees)}</Text>
                    <Ionicons name={showFees ? 'chevron-up' : 'chevron-down'} size={14} color="#b45309" />
                  </View>
                </TouchableOpacity>
                {showFees && (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: '#fde68a' }}>
                    {stats.upcomingCommitments.map((c, idx) => (
                      <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: '#fef3c7' }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ color: '#78350f', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{c.name}</Text>
                          <Text style={{ color: '#b45309', fontSize: 11, marginTop: 1 }}>{formatDateRange(c.date, c.end_date)}</Text>
                        </View>
                        <Text style={{ color: '#92400e', fontWeight: '700', fontSize: 13 }}>{formatCurrency(c.committedFee)}</Text>
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
                    <View key={unit.id} className="bg-white rounded-2xl p-3 border border-slate-100 w-40 overflow-hidden" style={{ borderLeftWidth: 3, borderLeftColor: UNIT_STATUS_COLORS[unit.status].dot }}>
                      <Text className="font-bold text-slate-900 text-sm" numberOfLines={1}>{unit.name}</Text>
                      {unit.registration ? <Text className="text-xs text-slate-400 mt-0.5">{unit.registration}</Text> : null}
                      <View className="mt-1.5">
                        {unit.currentEvent ? (
                          <Text className="text-xs text-amber-700" numberOfLines={1}>📍 {unit.currentEvent.name}</Text>
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
              <View className="flex-row gap-3">
                <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100">
                  <Text className="text-slate-700 font-semibold text-sm">🥛 {stats.totalFreshMilkLitres.toFixed(1)} L</Text>
                  <Text className="text-slate-400 text-xs mt-0.5">Fresh Milk YTD</Text>
                </View>
                <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100">
                  <Text className="text-slate-700 font-semibold text-sm">🌱 {stats.totalAltMilkLitres.toFixed(1)} L</Text>
                  <Text className="text-slate-400 text-xs mt-0.5">Alt Milk YTD</Text>
                </View>
              </View>
            )}

            {/* Revenue chart */}
            {stats && <RevenueBarChart data={stats.monthlyRevenue} />}

            {/* Status breakdown */}
            {stats && stats.statusBreakdown.length > 0 && <StatusPieChart data={stats.statusBreakdown} />}

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

      {/* Quick Sales FAB */}
      <TouchableOpacity
        onPress={() => setQuickSalesOpen(true)}
        accessibilityLabel="Log today's sales"
        accessibilityRole="button"
        style={{
          position: 'absolute',
          bottom: 24 + insets.bottom,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: '#b45309',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 6,
        }}
      >
        <Text style={{ fontSize: 22 }}>£</Text>
      </TouchableOpacity>

      <QuickSalesSheet visible={quickSalesOpen} onClose={() => setQuickSalesOpen(false)} />
    </View>
  );
}
