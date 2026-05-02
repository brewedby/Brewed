import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, TextInput, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEvents } from '@/lib/queries/events';
import { useCompanies } from '@/lib/queries/companies';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { QueryError } from '@/components/shared/QueryError';
import { FarMasthead } from '@/components/far/Masthead';
import { FarSectionRule } from '@/components/far/SectionRule';
import { useTheme } from '@/lib/themeContext';
import { STATUS_DOT, TONE } from '@/lib/theme';
import { formatDateRange, toISODateString } from '@/lib/formatters';
import { STATUSES, STATUS_LABELS } from '@/constants';
import type { ApplicationStatus, EventWithFinancials, CompanyWithStats } from '@/types';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS_LIST = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function eventsOverlap(a: EventWithFinancials, b: EventWithFinancials): boolean {
  const aEnd = a.end_date ?? a.date;
  const bEnd = b.end_date ?? b.date;
  if (!(a.date <= bEnd && b.date <= aEnd)) return false;
  const aUnitIds = new Set(a.units.map((u) => u.id));
  return b.units.some((u) => aUnitIds.has(u.id));
}

function OverlapBanner({ a, b, companyMap }: {
  a: EventWithFinancials;
  b: EventWithFinancials;
  companyMap: Map<string, CompanyWithStats>;
}) {
  const { tokens } = useTheme();
  const p = tokens.palette;
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
    recommendation = `Prioritise "${winner.event.name}" — ${winner.comp.name} avg ${winner.comp.avgProfitMargin!.toFixed(0)}% margin vs ${loser.comp.avgProfitMargin!.toFixed(0)}% for ${loser.comp.name}.`;
  }

  return (
    <View style={{ borderWidth: 2, borderColor: TONE.bad, padding: 12, marginBottom: 12, backgroundColor: 'rgba(220,38,38,0.04)' }}>
      <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: TONE.bad }}>
        {'● CLASH · ' + formatDateRange(a.date, a.end_date)}
      </Text>
      <Text style={{ fontFamily: tokens.type.display, fontSize: 17, marginTop: 6, lineHeight: 22 }}>
        {a.name} <Text style={{ color: p.textMuted, fontStyle: 'italic', fontSize: 13 }}>vs</Text> {b.name}
      </Text>
      {(hasA || hasB) && (
        <View style={{ marginTop: 6, gap: 2 }}>
          {hasA && <Text style={{ fontSize: 11, color: p.textMuted }}>• {compA!.name}: {compA!.avgProfitMargin!.toFixed(0)}% avg margin</Text>}
          {hasB && <Text style={{ fontSize: 11, color: p.textMuted }}>• {compB!.name}: {compB!.avgProfitMargin!.toFixed(0)}% avg margin</Text>}
        </View>
      )}
      {recommendation ? (
        <Text style={{ fontSize: 12, color: TONE.bad, fontWeight: '600', marginTop: 8 }}>→ {recommendation}</Text>
      ) : null}
    </View>
  );
}

function FarEventRow({ event }: { event: EventWithFinancials }) {
  const router = useRouter();
  const { tokens } = useTheme();
  const p = tokens.palette;

  const dateStr = event.date;
  const [, mm, dd] = dateStr.split('-');
  const dayNum = parseInt(dd, 10);
  const monthLabel = MONTH_SHORT[parseInt(mm, 10) - 1] ?? '';

  const statusColor = STATUS_DOT[event.status] ?? p.textFaint;
  const fin = event.event_financials;
  const net = fin && fin.gross_sales > 0 ? event.calculations.netProfit : null;
  const org = event.concessions_companies?.name ?? null;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/events/${event.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${event.name}`}
      activeOpacity={0.7}
      style={{ flexDirection: 'row', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: p.border }}
    >
      {/* Date column */}
      <View style={{ width: 44, alignItems: 'center', flexShrink: 0, paddingTop: 2 }}>
        <Text style={{ fontFamily: tokens.type.display, fontSize: 22, lineHeight: 24, color: p.text }}>{dayNum}</Text>
        <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1, marginTop: 2 }}>{monthLabel.toUpperCase()}</Text>
      </View>

      {/* Content */}
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        {/* Status + net */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1, color: statusColor, lineHeight: 14 }}>
            {'● ' + event.status.toUpperCase()}
          </Text>
          {net !== null && (
            <Text style={{ fontSize: 11, color: net >= 0 ? TONE.good : TONE.bad, fontFamily: tokens.type.mono, fontVariant: ['tabular-nums'], lineHeight: 14 }}>
              {net >= 0 ? '+' : ''}£{Math.abs(net).toFixed(0)}
            </Text>
          )}
        </View>
        <Text style={{ fontFamily: tokens.type.display, fontSize: 17, letterSpacing: -0.2, lineHeight: 21, color: p.text }} numberOfLines={2}>
          {event.name}
        </Text>
        <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic' }} numberOfLines={1}>
          {event.location}{org ? ` — ${org}` : ''}
        </Text>
      </View>

      {event.url_changed && (
        <View style={{ alignSelf: 'flex-start', paddingTop: 2 }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: TONE.caution, letterSpacing: 0.5 }}>UPDATED</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tokens } = useTheme();
  const p = tokens.palette;

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
  const completed = useMemo(
    () => [...events.filter((e) => (e.end_date ?? e.date) < today)].sort((a, b) => b.date.localeCompare(a.date)),
    [events, today],
  );

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

  const STATUS_OPTIONS: (ApplicationStatus | 'all')[] = ['all', ...STATUSES];

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

  const VIEW_FILTERS = [
    { id: 'upcoming' as const, label: 'Upcoming' },
    { id: 'completed' as const, label: 'Completed' },
    { id: 'all' as const, label: 'All' },
  ];

  const NewButton = (
    <TouchableOpacity
      onPress={() => router.push('/(tabs)/events/new')}
      accessibilityRole="button"
      accessibilityLabel="Add new event"
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 4,
        borderWidth: 1, borderColor: p.text,
        paddingHorizontal: 10, paddingVertical: 4, minHeight: 32,
      }}
    >
      <Ionicons name="add" size={11} color={p.text} />
      <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: p.text }}>{'NEW'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <FarMasthead
        eyebrow={`The Calendar · ${events.length} entr${events.length === 1 ? 'y' : 'ies'}`}
        title="Events"
        sub="Applications, accepted, traded — by date."
        right={NewButton}
      />

      {/* Filter chips */}
      <View style={{ backgroundColor: p.bg }}>
        {/* View filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}
        >
          {VIEW_FILTERS.map((vf) => {
            const active = viewFilter === vf.id;
            return (
              <TouchableOpacity
                key={vf.id}
                onPress={() => setViewFilter(vf.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={{
                  paddingHorizontal: 10, paddingVertical: 4,
                  borderWidth: 1,
                  backgroundColor: active ? p.text : 'transparent',
                  borderColor: active ? p.text : p.borderStrong,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: active ? p.bg : p.textMuted }}>
                  {vf.label.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
          {/* Status filter chips */}
          {STATUS_OPTIONS.filter((s) => s !== 'all').map((s) => {
            const active = statusFilter === s;
            const dotColor = STATUS_DOT[s] ?? p.textFaint;
            return (
              <TouchableOpacity
                key={s}
                onPress={() => setStatusFilter(active ? 'all' : s)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={{
                  paddingHorizontal: 10, paddingVertical: 4,
                  borderWidth: 1,
                  backgroundColor: active ? dotColor : 'transparent',
                  borderColor: active ? dotColor : p.borderStrong,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: active ? '#fff' : p.textMuted }}>
                  {STATUS_LABELS[s].toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Search */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          marginHorizontal: 20, marginBottom: 8,
          borderWidth: 1, borderColor: p.borderStrong,
          backgroundColor: p.surface,
          paddingHorizontal: 12, paddingVertical: 8,
        }}>
          <Ionicons name="search-outline" size={14} color={p.textFaint} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search events or locations..."
            placeholderTextColor={p.textFaint}
            style={{ flex: 1, fontSize: 14, color: p.text, padding: 0 }}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>
      </View>

      {isLoading ? (
        <LoadingSpinner message="Loading events..." />
      ) : isError ? (
        <QueryError error={error} onRetry={refetch} message="Couldn't load events" />
      ) : events.length === 0 ? (
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={p.brand} />}
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
          style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={p.brand} />}
        >
          {viewFilter === 'upcoming' ? (
            <EmptyState icon="📅" title="No upcoming events" description="All events are in the past." />
          ) : viewFilter === 'completed' ? (
            <EmptyState icon="✅" title="No completed events" description="Events that have passed will appear here." />
          ) : null}
        </ScrollView>
      ) : (
        <FlatList
          data={rowItems}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="on-drag"
          removeClippedSubviews
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={p.brand} />}
          ListFooterComponent={<View style={{ height: 40 }} />}
          renderItem={({ item }) => {
            if (item.kind === 'banner') {
              return <OverlapBanner a={item.a} b={item.b} companyMap={companyMap} />;
            }
            if (item.kind === 'section') {
              return (
                <View style={{ paddingTop: 20, paddingBottom: 4 }}>
                  <FarSectionRule label={`${item.title} (${item.count})`} />
                </View>
              );
            }
            return <FarEventRow event={item.event} />;
          }}
        />
      )}
    </View>
  );
}
