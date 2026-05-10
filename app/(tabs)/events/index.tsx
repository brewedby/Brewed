import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, TextInput, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEvents } from '@/lib/queries/events';
import { useCompanies } from '@/lib/queries/companies';
import { EventCard } from '@/components/events/EventCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { QueryError } from '@/components/shared/QueryError';
import { formatDateRange, toISODateString, formatCurrencyInt, formatPercent } from '@/lib/formatters';
import { STATUSES, STATUS_LABELS } from '@/constants';
import type { ApplicationStatus, EventWithFinancials, CompanyWithStats } from '@/types';

const YEARS = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];

function eventsOverlap(a: EventWithFinancials, b: EventWithFinancials): boolean {
  const aEnd = a.end_date ?? a.date;
  const bEnd = b.end_date ?? b.date;
  if (!(a.date <= bEnd && b.date <= aEnd)) return false;
  // Only flag as conflict when both events share at least one unit
  const aUnitIds = new Set(a.units.map((u) => u.id));
  return b.units.some((u) => aUnitIds.has(u.id));
}

function OverlapBanner({
  a, b, companyMap,
}: {
  a: EventWithFinancials;
  b: EventWithFinancials;
  companyMap: Map<string, CompanyWithStats>;
}) {
  const compA = a.company_id ? companyMap.get(a.company_id) : null;
  const compB = b.company_id ? companyMap.get(b.company_id) : null;

  const hasA = compA != null && compA.avgProfitMargin != null && compA.completedEventCount > 0;
  const hasB = compB != null && compB.avgProfitMargin != null && compB.completedEventCount > 0;

  let recommendation = '';
  if (hasA && hasB) {
    const winner = compA!.avgProfitMargin! >= compB!.avgProfitMargin!
      ? { event: a, comp: compA! }
      : { event: b, comp: compB! };
    const loser = winner.event === a ? { event: b, comp: compB! } : { event: a, comp: compA! };
    recommendation = `Prioritise "${winner.event.name}" — ${winner.comp.name} avg ${formatPercent(winner.comp.avgProfitMargin, 0)} margin across ${winner.comp.completedEventCount} event${winner.comp.completedEventCount > 1 ? 's' : ''} vs ${formatPercent(loser.comp.avgProfitMargin, 0)} for ${loser.comp.name}.`;
  } else if (hasA) {
    recommendation = `"${a.name}" via ${compA!.name} has ${compA!.completedEventCount} past event${compA!.completedEventCount > 1 ? 's' : ''} (avg ${formatPercent(compA!.avgProfitMargin, 0)} margin). No history for "${b.name}" yet.`;
  } else if (hasB) {
    recommendation = `"${b.name}" via ${compB!.name} has ${compB!.completedEventCount} past event${compB!.completedEventCount > 1 ? 's' : ''} (avg ${formatPercent(compB!.avgProfitMargin, 0)} margin). No history for "${a.name}" yet.`;
  }

  return (
    <View style={{ backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 16, padding: 14, marginBottom: 12 }}>
      <Text style={{ color: '#c2410c', fontWeight: '700', fontSize: 13, marginBottom: 4 }}>⚡ Schedule Conflict</Text>
      <Text style={{ color: '#ea580c', fontSize: 12, marginBottom: 6 }}>
        "{a.name}" ({formatDateRange(a.date, a.end_date)}) overlaps with "{b.name}" ({formatDateRange(b.date, b.end_date)}).
      </Text>
      {hasA && (
        <Text style={{ color: '#9a3412', fontSize: 11, marginTop: 2 }}>
          • {compA!.name}: Avg {formatPercent(compA!.avgProfitMargin, 0)} margin ({compA!.completedEventCount} event{compA!.completedEventCount > 1 ? 's' : ''})
        </Text>
      )}
      {hasB && (
        <Text style={{ color: '#9a3412', fontSize: 11, marginTop: 2 }}>
          • {compB!.name}: Avg {formatPercent(compB!.avgProfitMargin, 0)} margin ({compB!.completedEventCount} event{compB!.completedEventCount > 1 ? 's' : ''})
        </Text>
      )}
      {!hasA && !hasB && (
        <Text style={{ color: '#9a3412', fontSize: 11, marginTop: 2 }}>No historical data yet to rank these events.</Text>
      )}
      {recommendation ? (
        <Text style={{ color: '#c2410c', fontSize: 12, fontWeight: '600', marginTop: 6 }}>→ {recommendation}</Text>
      ) : null}
    </View>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#78716c', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</Text>
      <Text style={{ fontSize: 11, color: '#a8a29e' }}>{count}</Text>
    </View>
  );
}

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<number | undefined>(undefined);
  const [viewFilter, setViewFilter] = useState<'upcoming' | 'completed' | 'all'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: eventsRaw, isLoading, isError, error, refetch } = useEvents({ status: statusFilter, year: yearFilter });
  const { data: companies } = useCompanies();

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  // Memoise today's ISO date so downstream memos don't churn on every render.
  const today = useMemo(() => toISODateString(new Date()), []);

  const events = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const sorted = [...(eventsRaw ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    if (!q) return sorted;
    return sorted.filter(
      (e) => e.name.toLowerCase().includes(q) || e.location.toLowerCase().includes(q),
    );
  }, [eventsRaw, searchQuery]);

  const upcoming = useMemo(() => events.filter((e) => (e.end_date ?? e.date) >= today), [events, today]);
  const completed = useMemo(() => events.filter((e) => (e.end_date ?? e.date) < today), [events, today]);

  const companyMap = useMemo(() => {
    const m = new Map<string, CompanyWithStats>();
    companies?.forEach((c) => m.set(c.id, c));
    return m;
  }, [companies]);

  const overlappingPairs = useMemo(() => {
    const pairs: Array<{ a: EventWithFinancials; b: EventWithFinancials }> = [];
    const upcomingAccepted = upcoming.filter((e) => e.status === 'accepted' || e.status === 'pending' || e.status === 'waitlisted');
    for (let i = 0; i < upcomingAccepted.length; i++) {
      for (let j = i + 1; j < upcomingAccepted.length; j++) {
        if (eventsOverlap(upcomingAccepted[i], upcomingAccepted[j])) {
          pairs.push({ a: upcomingAccepted[i], b: upcomingAccepted[j] });
        }
      }
    }
    return pairs;
  }, [upcoming]);

  const totalRevenue = events.reduce((s, e) => s + (e.event_financials?.gross_sales ?? 0), 0);
  const totalNet = events.reduce((s, e) => s + e.calculations.netProfit, 0);

  type RowItem =
    | { kind: 'banner'; id: string; a: EventWithFinancials; b: EventWithFinancials }
    | { kind: 'section'; id: string; title: string; count: number }
    | { kind: 'event'; id: string; event: EventWithFinancials };

  const rowItems = useMemo<RowItem[]>(() => {
    const items: RowItem[] = [];
    if (viewFilter !== 'completed') {
      overlappingPairs.forEach(({ a, b }, i) => {
        items.push({ kind: 'banner', id: `banner-${i}-${a.id}-${b.id}`, a, b });
      });
    }
    if (viewFilter !== 'completed' && upcoming.length > 0) {
      if (viewFilter === 'all') {
        items.push({ kind: 'section', id: 'sec-upcoming', title: 'Upcoming', count: upcoming.length });
      }
      upcoming.forEach((e) => items.push({ kind: 'event', id: e.id, event: e }));
    }
    if (viewFilter !== 'upcoming' && completed.length > 0) {
      if (viewFilter === 'all') {
        items.push({ kind: 'section', id: 'sec-completed', title: 'Completed', count: completed.length });
      }
      completed.forEach((e) => items.push({ kind: 'event', id: e.id, event: e }));
    }
    return items;
  }, [viewFilter, overlappingPairs, upcoming, completed]);

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pt-2 pb-3 bg-white border-b border-stone-100">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-bold text-stone-900">Events</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/events/new')}
            accessibilityRole="button"
            accessibilityLabel="Add new event"
            className="bg-amber-700 px-4 py-2 rounded-xl"
          >
            <Text className="text-white font-semibold text-sm">+ New</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f4', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, gap: 8 }}>
          <Text style={{ color: '#a8a29e', fontSize: 14 }}>🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search events or locations..."
            placeholderTextColor="#a8a29e"
            style={{ flex: 1, fontSize: 14, color: '#1c1917', padding: 0 }}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>

        {/* Upcoming / Completed / All tabs */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }} accessibilityRole="radiogroup">
          {(['upcoming', 'completed', 'all'] as const).map((v) => {
            const labels = { upcoming: 'Upcoming', completed: 'Completed', all: 'All' };
            const isActive = viewFilter === v;
            return (
              <TouchableOpacity
                key={v}
                onPress={() => setViewFilter(v)}
                accessibilityRole="radio"
                accessibilityLabel={`Show ${labels[v].toLowerCase()} events`}
                accessibilityState={{ selected: isActive }}
                style={{
                  flex: 1, paddingVertical: 7, borderRadius: 10, alignItems: 'center',
                  backgroundColor: isActive ? '#1c1917' : '#f5f5f4',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? '#ffffff' : '#57534e' }}>
                  {labels[v]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Status filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} accessibilityRole="radiogroup">
          <TouchableOpacity
            onPress={() => setStatusFilter('all')}
            accessibilityRole="radio"
            accessibilityLabel="Show all statuses"
            accessibilityState={{ selected: statusFilter === 'all' }}
            style={{
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1,
              backgroundColor: statusFilter === 'all' ? '#1c1917' : '#ffffff',
              borderColor: statusFilter === 'all' ? '#1c1917' : '#d6d3d1',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '500', color: statusFilter === 'all' ? '#ffffff' : '#57534e' }}>All</Text>
          </TouchableOpacity>
          {STATUSES.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setStatusFilter(statusFilter === s ? 'all' : s)}
              accessibilityRole="radio"
              accessibilityLabel={`Filter by ${STATUS_LABELS[s]}`}
              accessibilityState={{ selected: statusFilter === s }}
              style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1,
                backgroundColor: statusFilter === s ? '#1c1917' : '#ffffff',
                borderColor: statusFilter === s ? '#1c1917' : '#d6d3d1',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: statusFilter === s ? '#ffffff' : '#57534e' }}>
                {STATUS_LABELS[s]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Year filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 6 }} accessibilityRole="radiogroup">
          <TouchableOpacity
            onPress={() => setYearFilter(undefined)}
            accessibilityRole="radio"
            accessibilityLabel="Show events from all years"
            accessibilityState={{ selected: !yearFilter }}
            style={{
              paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
              backgroundColor: !yearFilter ? '#fef3c7' : '#ffffff',
              borderColor: !yearFilter ? '#fcd34d' : '#d6d3d1',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '500', color: !yearFilter ? '#92400e' : '#78716c' }}>All Years</Text>
          </TouchableOpacity>
          {YEARS.map((y) => (
            <TouchableOpacity
              key={y}
              onPress={() => setYearFilter(yearFilter === y ? undefined : y)}
              accessibilityRole="radio"
              accessibilityLabel={`Filter by year ${y}`}
              accessibilityState={{ selected: yearFilter === y }}
              style={{
                paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
                backgroundColor: yearFilter === y ? '#fef3c7' : '#ffffff',
                borderColor: yearFilter === y ? '#fcd34d' : '#d6d3d1',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: yearFilter === y ? '#92400e' : '#78716c' }}>{y}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Summary strip */}
      {events.length > 0 && (
        <View className="flex-row bg-white px-4 py-2 border-b border-stone-100 gap-6">
          <Text className="text-stone-500 text-xs">{events.length} event{events.length !== 1 ? 's' : ''}</Text>
          {totalRevenue > 0 && (
            <Text className="text-stone-500 text-xs">Sales: <Text className="text-stone-700 font-medium">{formatCurrencyInt(totalRevenue)}</Text></Text>
          )}
          {totalNet !== 0 && (
            <Text className="text-stone-500 text-xs">Net: <Text className={`font-medium ${totalNet >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrencyInt(totalNet)}</Text></Text>
          )}
        </View>
      )}

      {isLoading ? (
        <LoadingSpinner message="Loading events..." />
      ) : isError ? (
        <QueryError error={error} onRetry={refetch} message="Couldn't load events" />
      ) : events.length === 0 ? (
        <ScrollView
          className="flex-1 px-4 pt-4"
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#f59e0b" colors={["#f59e0b"]} />}
        >
          <EmptyState
            icon="🎪"
            title="No events yet"
            description="Apply to your first event and track it here."
            action={{ label: '+ Add Event', onPress: () => router.push('/(tabs)/events/new') }}
            tip="Tip: You can import events from the Discover tab"
          />
        </ScrollView>
      ) : rowItems.length === 0 ? (
        <ScrollView
          className="flex-1 px-4 pt-4"
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#f59e0b" colors={["#f59e0b"]} />}
        >
          {viewFilter === 'upcoming' ? (
            <EmptyState icon="📅" title="No upcoming events" description="All events are in the past." />
          ) : viewFilter === 'completed' ? (
            <EmptyState icon="✅" title="No completed events" description="Events that have passed will appear here." />
          ) : null}
        </ScrollView>
      ) : (
        <View className="flex-1 px-4 pt-4">
          <FlatList
            data={rowItems}
            keyExtractor={(item) => item.id}
            keyboardDismissMode="on-drag"
            removeClippedSubviews
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            windowSize={5}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#f59e0b" colors={["#f59e0b"]} />}
            ListFooterComponent={<View style={{ height: 32 }} />}
            renderItem={({ item }) => {
              if (item.kind === 'banner') return <OverlapBanner a={item.a} b={item.b} companyMap={companyMap} />;
              if (item.kind === 'section') return <SectionHeader title={item.title} count={item.count} />;
              return <EventCard event={item.event} />;
            }}
          />
        </View>
      )}
    </View>
  );
}
