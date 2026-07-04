import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDashboard } from '@/lib/queries/dashboard';
import { useUnits } from '@/lib/queries/units';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { QueryError } from '@/components/shared/QueryError';
import { FarMasthead } from '@/components/far/Masthead';
import { FleetRemindersCard } from '@/components/units/FleetRemindersCard';
import { useTheme } from '@/lib/themeContext';
import { TONE } from '@/lib/theme';
import type { UnitWithStatus } from '@/types';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function dateTone(dateStr: string | null): string {
  const days = daysUntil(dateStr);
  if (days === null) return '#a8a29e';
  if (days < 0) return TONE.bad;
  if (days <= 30) return TONE.bad;
  if (days <= 90) return TONE.caution;
  return TONE.good;
}

function unitStatusTone(unit: UnitWithStatus): 'ok' | 'soon' | 'urgent' {
  const dates = [unit.mot_date, unit.tax_date, unit.service_date].filter(Boolean) as string[];
  const minDays = dates.length > 0
    ? Math.min(...dates.map((d) => daysUntil(d) ?? Infinity))
    : Infinity;
  if (minDays < 0 || unit.status === 'maintenance') return 'urgent';
  if (minDays <= 30) return 'soon';
  return 'ok';
}

function FarUnitCard({ unit, onPress }: { unit: UnitWithStatus; onPress: () => void }) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  const tone = unitStatusTone(unit);
  const toneColor = tone === 'ok' ? TONE.good : tone === 'soon' ? TONE.caution : TONE.bad;
  const toneLabel = tone === 'ok' ? 'ALL CLEAR' : tone === 'soon' ? 'DUE SOON' : 'ACTION';

  const rows = [
    { l: 'MOT',     v: unit.mot_date ? formatDate(unit.mot_date) : '—',     dateStr: unit.mot_date },
    { l: 'Tax',     v: unit.tax_date ? formatDate(unit.tax_date) : '—',     dateStr: unit.tax_date },
    { l: 'Service', v: unit.service_date ? formatDate(unit.service_date) : '—', dateStr: unit.service_date },
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open unit ${unit.name}`}
      activeOpacity={0.7}
      style={{
        backgroundColor: p.surface,
        borderWidth: 1, borderColor: p.borderStrong,
        padding: 14, marginBottom: 14,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Ionicons name="car-outline" size={22} color={p.text} />
          <View>
            <Text style={{ fontFamily: tokens.type.display, fontSize: 22, lineHeight: 24, color: p.text }}>{unit.name}</Text>
            {unit.registration && (
              <Text style={{ fontFamily: tokens.type.mono, fontSize: 11, color: p.textMuted, marginTop: 2, letterSpacing: 1 }}>
                {unit.registration}
              </Text>
            )}
          </View>
        </View>
        <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1, color: toneColor, paddingTop: 2 }}>
          {'● ' + toneLabel}
        </Text>
      </View>

      {/* Compliance grid */}
      <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: p.border }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 0 }}>
          {rows.map((r, i) => (
            <View key={r.l} style={{ width: '50%', paddingRight: i % 2 === 0 ? 8 : 0, paddingBottom: 8 }}>
              <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1.2, fontWeight: '600' }}>
                {r.l.toUpperCase()}
              </Text>
              <Text style={{ fontFamily: tokens.type.mono, fontSize: 12, fontVariant: ['tabular-nums'], marginTop: 2, color: dateTone(r.dateStr) }}>
                {r.v}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Current event */}
      {unit.currentEvent && (
        <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: p.border, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 6, height: 6, backgroundColor: TONE.caution }} />
          <Text style={{ fontSize: 12, color: TONE.caution, fontWeight: '600' }} numberOfLines={1}>
            {unit.currentEvent.name}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function FleetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tokens } = useTheme();
  const p = tokens.palette;
  const [refreshing, setRefreshing] = useState(false);

  const { data: dashboardStats, isLoading: dashboardLoading, refetch: refetchDashboard } = useDashboard();
  const { data: rawUnits, isLoading: unitsLoading, isError, error, refetch: refetchUnits } = useUnits();

  const isLoading = dashboardLoading || unitsLoading;

  const units: UnitWithStatus[] = dashboardStats?.unitStatuses
    ?? (rawUnits?.map((u) => ({ ...u, currentEvent: null })) ?? []);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refetchDashboard(), refetchUnits()]);
    setRefreshing(false);
  }

  const subText = units.length > 0
    ? `${units.filter((u) => u.status === 'active').length} active, ${units.filter((u) => u.status === 'maintenance').length} in maintenance`
    : 'MOT, tax, service dates & unit status';

  const AddButton = (
    <TouchableOpacity
      onPress={() => router.push('/(modal)/fleet/new')}
      accessibilityRole="button"
      accessibilityLabel="Add new unit"
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 4,
        borderWidth: 1, borderColor: p.text,
        paddingHorizontal: 10, paddingVertical: 4, minHeight: 32,
      }}
    >
      <Ionicons name="add" size={11} color={p.text} />
      <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: p.text }}>{'VAN'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <FarMasthead
        eyebrow="Settings · the depot"
        title="Your fleet"
        sub={subText}
        right={AddButton}
      />

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
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20 }}
          ListHeaderComponent={units.length > 0 ? <FleetRemindersCard units={units} /> : null}
          ListEmptyComponent={
            <EmptyState
              icon="🚐"
              title="No units added yet"
              description="Add your coffee trucks and vans to track where they are."
              action={{ label: 'Add First Unit', onPress: () => router.push('/(modal)/fleet/new') }}
            />
          }
          ListFooterComponent={<View style={{ height: 40 }} />}
          renderItem={({ item: unit }) => (
            <FarUnitCard
              unit={unit}
              onPress={() => router.push(`/(modal)/fleet/${unit.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}
