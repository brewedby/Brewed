import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEvents } from '@/lib/queries/events';
import { useCompanies } from '@/lib/queries/companies';
import { EventCard } from '@/components/events/EventCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatDateRange } from '@/lib/formatters';
import { STATUSES, STATUS_LABELS } from '@/constants';
import type { ApplicationStatus, EventWithFinancials, CompanyWithStats } from '@/types';

const YEARS = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];

function eventsOverlap(a: EventWithFinancials, b: EventWithFinancials): boolean {
  const aEnd = a.end_date ?? a.date;
  const bEnd = b.end_date ?? b.date;
  return a.date <= bEnd && b.date <= aEnd;
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

  let recommendation = '';
  if (
    compA?.avgProfitMargin != null && compA.completedEventCount > 0 &&
    compB?.avgProfitMargin != null && compB.completedEventCount > 0
  ) {
    const winner = compA.avgProfitMargin >= compB.avgProfitMargin
      ? { event: a, comp: compA }
      : { event: b, comp: compB };
    recommendation = `Based on past events, "${winner.event.name}" via ${winner.comp.name} averaged ${winner.comp.avgProfitMargin.toFixed(0)}% margin across ${winner.comp.completedEventCount} completed event${winner.comp.completedEventCount > 1 ? 's' : ''}.`;
  }

  return (
    <View style={{ backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 16, padding: 14, marginBottom: 12 }}>
      <Text style={{ color: '#c2410c', fontWeight: '700', fontSize: 13, marginBottom: 4 }}>⚡ Schedule Conflict</Text>
      <Text style={{ color: '#ea580c', fontSize: 12, marginBottom: 4 }}>
        "{a.name}" ({formatDateRange(a.date, a.end_date)}) overlaps with "{b.name}" ({formatDateRange(b.date, b.end_date)}).
      </Text>
      {compA?.avgProfitMargin != null && compA.completedEventCount > 0 && (
        <Text style={{ color: '#9a3412', fontSize: 11, marginTop: 2 }}>
          • {compA.name}: {compA.avgProfitMargin.toFixed(0)}% avg margin ({compA.completedEventCount} event{compA.completedEventCount > 1 ? 's' : ''})
        </Text>
      )}
      {compB?.avgProfitMargin != null && compB.completedEventCount > 0 && (
        <Text style={{ color: '#9a3412', fontSize: 11, marginTop: 2 }}>
          • {compB.name}: {compB.avgProfitMargin.toFixed(0)}% avg margin ({compB.completedEventCount} event{compB.completedEventCount > 1 ? 's' : ''})
        </Text>
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
  const [refreshing, setRefreshing] = useState(false);

  const { data: eventsRaw, isLoading, refetch } = useEvents({ status: statusFilter, year: yearFilter });
  const { data: companies } = useCompanies();

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const today = new Date().toISOString().split('T')[0];

  const events = useMemo(
    () => [...(eventsRaw ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
    [eventsRaw],
  );

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
            <Text className="text-white font-semibold text-sm">+ New</Text>
          </TouchableOpacity>
        </View>

        {/* Status filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <TouchableOpacity
            onPress={() => setStatusFilter('all')}
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 6 }}>
          <TouchableOpacity
            onPress={() => setYearFilter(undefined)}
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
            <Text className="text-stone-500 text-xs">Sales: <Text className="text-stone-700 font-medium">£{totalRevenue.toFixed(0)}</Text></Text>
          )}
          {totalNet !== 0 && (
            <Text className="text-stone-500 text-xs">Net: <Text className={`font-medium ${totalNet >= 0 ? 'text-green-600' : 'text-red-500'}`}>£{totalNet.toFixed(0)}</Text></Text>
          )}
        </View>
      )}

      {isLoading ? (
        <LoadingSpinner message="Loading events..." />
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />}
        >
          {events.length === 0 ? (
            <EmptyState
              icon="🎪"
              title="No events yet"
              description="Apply to your first event and track it here."
              action={{ label: '+ Add Event', onPress: () => router.push('/(tabs)/events/new') }}
            />
          ) : (
            <>
              {/* Overlap warnings */}
              {overlappingPairs.map(({ a, b }, i) => (
                <OverlapBanner key={i} a={a} b={b} companyMap={companyMap} />
              ))}

              {/* Upcoming section */}
              {upcoming.length > 0 && (
                <>
                  <SectionHeader title="Upcoming" count={upcoming.length} />
                  {upcoming.map((event) => <EventCard key={event.id} event={event} />)}
                </>
              )}

              {/* Completed section */}
              {completed.length > 0 && (
                <>
                  <SectionHeader title={upcoming.length > 0 ? 'Completed' : 'All Events'} count={completed.length} />
                  {completed.map((event) => <EventCard key={event.id} event={event} />)}
                </>
              )}
            </>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}
