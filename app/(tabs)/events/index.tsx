import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, TextInput, FlatList, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEvents } from '@/lib/queries/events';
import { useCompanies } from '@/lib/queries/companies';
import { EventCard } from '@/components/events/EventCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { QueryError } from '@/components/shared/QueryError';
import { formatDateRange, toISODateString } from '@/lib/formatters';
import { STATUSES, STATUS_LABELS } from '@/constants';
import type { ApplicationStatus, EventWithFinancials, CompanyWithStats } from '@/types';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS_LIST = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

function FilterModal<T extends string | number>({
  visible, title, options, labelOf, selected, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  options: T[];
  labelOf: (v: T) => string;
  selected: T;
  onSelect: (v: T) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={{ backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', width: 240 }}
              onStartShouldSetResponder={() => true}>
          <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f4' }}>
            <Text style={{ fontWeight: '700', fontSize: 14, color: '#1c1917' }}>{title}</Text>
          </View>
          {options.map((opt) => {
            const isSelected = opt === selected;
            return (
              <TouchableOpacity
                key={String(opt)}
                onPress={() => { onSelect(opt); onClose(); }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingVertical: 14, paddingHorizontal: 20,
                  backgroundColor: isSelected ? '#fef3c7' : '#fff',
                  borderBottomWidth: 1, borderBottomColor: '#fafaf9' }}
              >
                <Text style={{ color: isSelected ? '#b45309' : '#1c1917', fontWeight: isSelected ? '700' : '400', fontSize: 14 }}>
                  {labelOf(opt)}
                </Text>
                {isSelected && <Ionicons name="checkmark" size={16} color="#b45309" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

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
    recommendation = `Prioritise "${winner.event.name}" — ${winner.comp.name} avg ${winner.comp.avgProfitMargin!.toFixed(0)}% margin across ${winner.comp.completedEventCount} event${winner.comp.completedEventCount > 1 ? 's' : ''} vs ${loser.comp.avgProfitMargin!.toFixed(0)}% for ${loser.comp.name}.`;
  } else if (hasA) {
    recommendation = `"${a.name}" via ${compA!.name} has ${compA!.completedEventCount} past event${compA!.completedEventCount > 1 ? 's' : ''} (avg ${compA!.avgProfitMargin!.toFixed(0)}% margin). No history for "${b.name}" yet.`;
  } else if (hasB) {
    recommendation = `"${b.name}" via ${compB!.name} has ${compB!.completedEventCount} past event${compB!.completedEventCount > 1 ? 's' : ''} (avg ${compB!.avgProfitMargin!.toFixed(0)}% margin). No history for "${a.name}" yet.`;
  }

  return (
    <View style={{ backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 16, padding: 14, marginBottom: 12 }}>
      <Text style={{ color: '#c2410c', fontWeight: '700', fontSize: 13, marginBottom: 4 }}>⚡ Schedule Conflict</Text>
      <Text style={{ color: '#ea580c', fontSize: 12, marginBottom: 6 }}>
        "{a.name}" ({formatDateRange(a.date, a.end_date)}) overlaps with "{b.name}" ({formatDateRange(b.date, b.end_date)}).
      </Text>
      {hasA && (
        <Text style={{ color: '#9a3412', fontSize: 11, marginTop: 2 }}>
          • {compA!.name}: Avg {compA!.avgProfitMargin!.toFixed(0)}% margin ({compA!.completedEventCount} event{compA!.completedEventCount > 1 ? 's' : ''})
        </Text>
      )}
      {hasB && (
        <Text style={{ color: '#9a3412', fontSize: 11, marginTop: 2 }}>
          • {compB!.name}: Avg {compB!.avgProfitMargin!.toFixed(0)}% margin ({compB!.completedEventCount} event{compB!.completedEventCount > 1 ? 's' : ''})
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
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [yearModalOpen, setYearModalOpen] = useState(false);

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

  const YEAR_OPTIONS = [0, ...YEARS_LIST];
  const yearLabel = (v: number) => v === 0 ? 'All Years' : String(v);
  const selectedYear = yearFilter ?? 0;
  const STATUS_OPTIONS: (ApplicationStatus | 'all')[] = ['all', ...STATUSES];
  const statusLabel = (v: ApplicationStatus | 'all') => v === 'all' ? 'All Statuses' : STATUS_LABELS[v];

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

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <TouchableOpacity
            onPress={() => setStatusModalOpen(true)}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
              backgroundColor: statusFilter !== 'all' ? '#fef3c7' : '#f5f5f4',
              borderWidth: 1, borderColor: statusFilter !== 'all' ? '#fcd34d' : '#e7e5e4' }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600',
              color: statusFilter !== 'all' ? '#92400e' : '#78716c' }}>
              {statusFilter === 'all' ? 'All Statuses' : STATUS_LABELS[statusFilter]}
            </Text>
            <Ionicons name="chevron-down" size={14} color={statusFilter !== 'all' ? '#b45309' : '#a8a29e'} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setYearModalOpen(true)}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
              backgroundColor: yearFilter != null ? '#fef3c7' : '#f5f5f4',
              borderWidth: 1, borderColor: yearFilter != null ? '#fcd34d' : '#e7e5e4' }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600',
              color: yearFilter != null ? '#92400e' : '#78716c' }}>
              {yearFilter != null ? String(yearFilter) : 'All Years'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={yearFilter != null ? '#b45309' : '#a8a29e'} />
          </TouchableOpacity>
        </View>

        <FilterModal
          visible={statusModalOpen}
          title="Filter by Status"
          options={STATUS_OPTIONS}
          labelOf={statusLabel}
          selected={statusFilter}
          onSelect={(v) => setStatusFilter(v)}
          onClose={() => setStatusModalOpen(false)}
        />
        <FilterModal
          visible={yearModalOpen}
          title="Filter by Year"
          options={YEAR_OPTIONS}
          labelOf={yearLabel}
          selected={selectedYear}
          onSelect={(v) => setYearFilter(v === 0 ? undefined : v)}
          onClose={() => setYearModalOpen(false)}
        />
      </View>

      {/* Summary strip */}
      {events.length > 0 && (
        <View className="flex-row bg-white px-4 py-2 border-b border-stone-100 gap-6">
          <Text className="text-stone-500 text-xs">{events.length} event{events.length !== 1 ? 's' : ''}</Text>
          {totalRevenue > 0 && (
            <Text className="text-stone-500 text-xs">Sales: <Text className="text-stone-700 font-medium">£{totalRevenue.toFixed(0)}</Text></Text>
          )}
          {totalNet !== 0 && (
            <Text className="text-stone-500 text-xs">Net: <Text className={`font-medium ${totalNet >= 0 ? 'text-green-600' : 'text-red-500'}`}>£{totalNet.toFixed(0)}</Text></Text>
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
