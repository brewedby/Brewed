import React, { useState, useEffect, useMemo, useCallback, startTransition } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  RefreshControl, Linking, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useDiscoverEvents } from '@/lib/queries/discover';
import { useCompanies } from '@/lib/queries/companies';
import { useCreateEvent } from '@/lib/mutations/events';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { toISODateString } from '@/lib/formatters';
import { FarMasthead } from '@/components/far/Masthead';
import { useTheme } from '@/lib/themeContext';
import { farStatus } from '@/lib/theme';
import type { DiscoveredEvent } from '@/types';

const REGIONS = ['All UK', 'London', 'South East', 'South West', 'East of England', 'Midlands', 'West Midlands', 'North West', 'Yorkshire', 'North East', 'Scotland', 'Wales', 'National'];

const EVENT_CATEGORIES = ['All', 'Music Festival', 'Food Festival', 'Street Food Market', 'Christmas Market', 'Garden and Lifestyle', 'Motorsport', 'Equestrian'];
const COMPANY_CATEGORIES = ['All', 'Concessions Company', 'Industry Body'];

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatRelativeTime(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function DiscoverEventCard({
  event, onAdd, adding, isApplied, onToggleApplied,
}: {
  event: DiscoveredEvent;
  onAdd: (e: DiscoveredEvent) => void;
  adding: boolean;
  isApplied: boolean;
  onToggleApplied: (id: string) => void;
}) {
  const { tokens, isDark } = useTheme();
  const p = tokens.palette;
  const S = farStatus(isDark);

  return (
    <View style={{
      borderWidth: 1, borderColor: p.borderStrong,
      backgroundColor: isApplied ? p.surfaceAlt : p.surface,
      padding: 14, marginBottom: 12,
      opacity: isApplied ? 0.75 : 1,
    }}>
      {event.featured && !isApplied && (
        <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: p.brand, marginBottom: 6 }}>
          {'★ FEATURED'}
        </Text>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <Text style={{ fontFamily: tokens.type.display, fontSize: 18, flex: 1, lineHeight: 22, marginRight: 8, color: p.text }} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={{ borderWidth: 1, borderColor: p.borderStrong, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.5, color: p.textMuted }}>
            {event.category?.toUpperCase() ?? ''}
          </Text>
        </View>
      </View>

      {event.organiser && (
        <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic', marginBottom: 6 }}>by {event.organiser}</Text>
      )}

      {!isApplied && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {event.location && (
            <Text style={{ fontSize: 11, color: p.textMuted }}>📍 {event.location}</Text>
          )}
          {event.dateHint && (
            <Text style={{ fontSize: 11, color: p.textMuted }}>📅 {event.dateHint}</Text>
          )}
          {event.estimatedFootfall && (
            <Text style={{ fontSize: 11, color: p.textMuted }}>👥 {event.estimatedFootfall}</Text>
          )}
          {event.pitchFeeRange && (
            <Text style={{ fontSize: 11, color: p.textMuted }}>💷 {event.pitchFeeRange}</Text>
          )}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        {!isApplied && (
          <TouchableOpacity
            onPress={() => { if (event.url) Linking.openURL(event.url); }}
            accessibilityRole="link"
            accessibilityLabel={`View and apply to ${event.title}`}
            style={{ flex: 1, borderWidth: 1, borderColor: p.borderStrong, paddingVertical: 10, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.5, color: p.text }}>{'VIEW & APPLY ↗'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onToggleApplied(event.id)}
          accessibilityRole="button"
          accessibilityLabel={isApplied ? `Undo applied for ${event.title}` : `Mark ${event.title} as applied`}
          style={{
            flex: isApplied ? undefined : 1,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
            paddingVertical: 10, paddingHorizontal: isApplied ? 14 : 0,
            borderWidth: 1,
            borderColor: isApplied ? p.borderStrong : S.green,
            backgroundColor: isApplied ? 'transparent' : 'transparent',
          }}
        >
          <Ionicons name={isApplied ? 'close-circle-outline' : 'checkmark-circle-outline'} size={14} color={isApplied ? p.textFaint : S.green} />
          <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.5, color: isApplied ? p.textFaint : S.green }}>
            {isApplied ? 'UNDO' : 'APPLIED'}
          </Text>
        </TouchableOpacity>
        {!isApplied && (
          <TouchableOpacity
            onPress={() => onAdd(event)}
            disabled={adding}
            accessibilityRole="button"
            accessibilityLabel={`Track ${event.title} in my events`}
            style={{ flex: 1, backgroundColor: p.text, paddingVertical: 10, alignItems: 'center' }}
          >
            {adding ? (
              <ActivityIndicator color={p.bg} size="small" />
            ) : (
              <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.5, color: p.bg }}>{'+ TRACK'}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function DiscoverCompanyCard({ company }: { company: DiscoveredEvent }) {
  const { tokens, isDark } = useTheme();
  const p = tokens.palette;
  const S = farStatus(isDark);
  const days = daysSince(company.lastVerifiedAt);
  const verifiedColor = days === null ? p.textFaint : days <= 7 ? S.green : days > 30 ? S.amber : p.textMuted;

  return (
    <View style={{ borderWidth: 1, borderColor: p.borderStrong, backgroundColor: p.surface, padding: 14, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          {company.featured && (
            <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: p.brand, marginBottom: 4 }}>{'★ MAJOR'}</Text>
          )}
          {company.applicationChanged && (
            <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1, color: S.green, marginBottom: 4 }}>{'🆕 PAGE UPDATED'}</Text>
          )}
          <Text style={{ fontFamily: tokens.type.display, fontSize: 20, lineHeight: 24, color: p.text }}>{company.title}</Text>
        </View>
        <View style={{ borderWidth: 1, borderColor: p.borderStrong, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.5, color: p.textMuted }}>
            {company.category === 'Industry Body' ? 'INDUSTRY' : 'CONCESSIONS'}
          </Text>
        </View>
      </View>

      <Text style={{ fontSize: 12, color: p.textMuted, lineHeight: 18, marginBottom: 10 }} numberOfLines={3}>{company.description}</Text>

      {company.eventsManaged && (
        <View style={{ backgroundColor: p.surfaceAlt, padding: 10, marginBottom: 10 }}>
          <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1, color: p.textMuted, marginBottom: 4 }}>{'EVENTS THEY RUN'}</Text>
          <Text style={{ fontSize: 12, color: p.text, lineHeight: 18 }}>{company.eventsManaged}</Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
        {company.location && <Text style={{ fontSize: 11, color: p.textMuted }}>📍 {company.location}</Text>}
        {company.pitchFeeRange && <Text style={{ fontSize: 11, color: p.textMuted }}>💷 {company.pitchFeeRange}</Text>}
        {company.contactPhone && (
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${company.contactPhone}`)}>
            <Text style={{ fontSize: 11, color: p.brand }}>📞 {company.contactPhone}</Text>
          </TouchableOpacity>
        )}
        {company.contactEmail && (
          <TouchableOpacity onPress={() => Linking.openURL(`mailto:${company.contactEmail}`)}>
            <Text style={{ fontSize: 11, color: p.brand }}>✉️ {company.contactEmail}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {days !== null && (
          <Text style={{ fontSize: 10, color: verifiedColor, fontStyle: 'italic' }}>
            {days <= 7 ? `Verified ${days}d ago` : days > 30 ? `Check needed (${days}d)` : `Verified ${days}d ago`}
          </Text>
        )}
        <TouchableOpacity
          onPress={() => { if (company.url) Linking.openURL(company.url); }}
          accessibilityRole="link"
          accessibilityLabel={`Apply to ${company.title}`}
          style={{ backgroundColor: p.text, paddingHorizontal: 14, paddingVertical: 8 }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.5, color: p.bg }}>{'APPLY NOW ↗'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { tokens } = useTheme();
  const p = tokens.palette;
  const [activeTab, setActiveTab] = useState<'events' | 'apply'>('apply');
  const [searchText, setSearchText] = useState('');
  const [region, setRegion] = useState('All UK');
  const [category, setCategory] = useState('All');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const appliedStorageKey = user ? `brewed:discover:applied:${user.id}` : null;

  useEffect(() => {
    supabase
      .from('uk_events_directory')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.updated_at) setLastSynced(new Date(data.updated_at));
      });
  }, []);

  useEffect(() => {
    if (!appliedStorageKey) return;
    AsyncStorage.getItem(appliedStorageKey).then((raw) => {
      if (!raw) return;
      try { setAppliedIds(new Set(JSON.parse(raw))); } catch { /* ignore */ }
    });
  }, [appliedStorageKey]);

  useFocusEffect(useCallback(() => { refetch(); }, []));

  const { data: allResults = [], isLoading, refetch, error } = useDiscoverEvents({});
  const { data: companies = [] } = useCompanies();
  const createEvent = useCreateEvent();

  async function toggleApplied(id: string) {
    setAppliedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      if (appliedStorageKey) AsyncStorage.setItem(appliedStorageKey, JSON.stringify([...next]));
      return next;
    });
  }

  const events = useMemo(() => allResults.filter((r) => !r.isCompany), [allResults]);
  const concessionsCos = useMemo(() => allResults.filter((r) => r.isCompany), [allResults]);

  const filteredEvents = useMemo(() => {
    let results = events;
    if (region !== 'All UK') {
      results = results.filter((e) =>
        e.region?.toLowerCase().includes(region.toLowerCase()) ||
        e.location?.toLowerCase().includes(region.toLowerCase())
      );
    }
    if (category !== 'All') results = results.filter((e) => e.category?.toLowerCase() === category.toLowerCase());
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      results = results.filter((e) =>
        e.title?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) || e.organiser?.toLowerCase().includes(q)
      );
    }
    return results;
  }, [events, region, category, searchText]);

  const filteredCompanies = useMemo(() => {
    let results = concessionsCos;
    if (category !== 'All') results = results.filter((c) => c.category?.toLowerCase() === category.toLowerCase());
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      results = results.filter((c) =>
        c.title?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q) ||
        c.eventsManaged?.toLowerCase().includes(q) || c.organiser?.toLowerCase().includes(q)
      );
    }
    return [...results].sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (a.title ?? '').localeCompare(b.title ?? '');
    });
  }, [concessionsCos, category, searchText]);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await supabase.functions.invoke('sync-directory', { body: {} });
      await refetch();
      setLastSynced(new Date());
    } catch { /* silently ignore */ }
    finally { setSyncing(false); }
  }

  async function handleAddEvent(discovered: DiscoveredEvent) {
    if (!user) { Alert.alert('Not signed in', 'Please sign in to track events.'); return; }
    setAddingId(discovered.id);
    try {
      const firstWord = discovered.organiser?.toLowerCase().split(' ')[0] ?? '';
      const matchedCompany = companies.find((c) =>
        (discovered.source && c.website?.toLowerCase().includes(discovered.source.toLowerCase())) ||
        (firstWord && c.name.toLowerCase().includes(firstWord))
      );
      const eventName = discovered.title.length > 80 ? discovered.title.slice(0, 80) : discovered.title;
      await createEvent.mutateAsync({
        userId: user.id,
        data: {
          name: eventName, date: toISODateString(new Date()),
          location: discovered.location ?? '', status: 'pending',
          description: discovered.description ?? '', application_url: discovered.url ?? '',
          company_id: matchedCompany?.id ?? '',
          notes: `Discovered via Brewed Discover — ${discovered.organiser ?? discovered.source}`,
          gross_sales: 0, zero_rated_sales: 0, standard_rated_sales: 0,
          concessions_commission_pct: 0, pitch_fee_refund_pct: 0, cost_of_goods: 0,
          pitch_fee: 0, power_fee: 0, travel_costs: 0, camping_costs: 0,
          equipment_costs: 0, other_costs: 0, staffing_costs: 0,
          fresh_milk_litres: 0, alt_milk_litres: 0, miles_driven: 0,
          overnight_stay: false, documents_uploaded: false,
          unit_ids: [], staffing_entries: [], infrastructure_items: [],
        },
      });
      Alert.alert(
        'Added!',
        `"${eventName.slice(0, 50)}" added to your events as Pending. Update the date and details when ready.`,
        [{ text: 'Done' }, { text: 'View Events', onPress: () => router.push('/(tabs)/events') }]
      );
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not add event');
    } finally { setAddingId(null); }
  }

  const unappliedEvents = useMemo(() => filteredEvents.filter((e) => !appliedIds.has(e.id)), [filteredEvents, appliedIds]);
  const appliedEvents = useMemo(() => filteredEvents.filter((e) => appliedIds.has(e.id)), [filteredEvents, appliedIds]);

  const currentCategories = activeTab === 'events' ? EVENT_CATEGORIES : COMPANY_CATEGORIES;
  const currentCount = activeTab === 'events' ? filteredEvents.length : filteredCompanies.length;

  const SyncButton = (
    <TouchableOpacity
      onPress={handleSync}
      disabled={syncing}
      accessibilityRole="button"
      accessibilityLabel="Refresh directory"
      style={{ borderWidth: 1, borderColor: p.borderStrong, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
    >
      {syncing ? <ActivityIndicator size="small" color={p.text} /> : <Ionicons name="refresh-outline" size={14} color={p.text} />}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <FarMasthead
        eyebrow={`Discover · ${activeTab === 'events' ? events.length : concessionsCos.length} entries`}
        title="Discover"
        sub={lastSynced ? `Last synced: ${formatRelativeTime(lastSynced)}` : 'UK events directory'}
        right={SyncButton}
      />

      {/* Tab switcher */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: p.borderStrong }}>
        {[
          { id: 'apply' as const, label: 'Who to Apply To', count: concessionsCos.length, unit: 'companies' },
          { id: 'events' as const, label: 'Events & Festivals', count: events.length, unit: 'events' },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => startTransition(() => { setActiveTab(tab.id); setCategory('All'); })}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              style={{
                flex: 1, paddingVertical: 10, alignItems: 'center',
                borderBottomWidth: 3,
                borderBottomColor: active ? p.text : 'transparent',
                paddingBottom: 7,
              }}
            >
              <Text style={{ fontFamily: tokens.type.display, fontSize: 14, color: active ? p.text : p.textMuted }}>
                {tab.label}
              </Text>
              <Text style={{ fontSize: 10, color: active ? p.brand : p.textFaint, fontStyle: 'italic', marginTop: 1 }}>
                {tab.count} {tab.unit}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search + filters */}
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6, backgroundColor: p.bg }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          borderWidth: 1, borderColor: p.borderStrong, backgroundColor: p.surface,
          paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8,
        }}>
          <Ionicons name="search-outline" size={14} color={p.textFaint} />
          <TextInput
            style={{ flex: 1, fontSize: 14, color: p.text, padding: 0 }}
            placeholder={activeTab === 'apply' ? 'Search concessions companies...' : 'Search festivals, markets...'}
            placeholderTextColor={p.textFaint}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 6 }}>
          {currentCategories.map((c) => {
            const active = category === c;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setCategory(c)}
                style={{
                  paddingHorizontal: 10, paddingVertical: 4,
                  borderWidth: 1,
                  backgroundColor: active ? p.text : 'transparent',
                  borderColor: active ? p.text : p.borderStrong,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: active ? p.bg : p.textMuted }}>
                  {c.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color={p.brand} />
          <Text style={{ color: p.textMuted, fontSize: 13, fontStyle: 'italic' }}>Loading directory...</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontFamily: tokens.type.display, fontSize: 24, color: p.textMuted, marginBottom: 8 }}>
            Could not load directory
          </Text>
          <Text style={{ fontSize: 12, color: p.textFaint, fontStyle: 'italic', textAlign: 'center', marginBottom: 16 }}>
            Check your connection and try again.
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{ borderWidth: 1, borderColor: p.text, paddingHorizontal: 20, paddingVertical: 10 }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 1, color: p.text }}>{'RETRY'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={p.brand} />}
        >
          <Text style={{ fontSize: 10, color: p.textFaint, marginBottom: 10 }}>
            {currentCount} {activeTab === 'apply' ? 'companies' : 'events'} found
          </Text>

          {currentCount === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ fontFamily: tokens.type.display, fontSize: 20, color: p.textMuted }}>Nothing matches</Text>
              <TouchableOpacity
                onPress={() => { setSearchText(''); setRegion('All UK'); setCategory('All'); }}
                style={{ borderWidth: 1, borderColor: p.borderStrong, paddingHorizontal: 16, paddingVertical: 8, marginTop: 16 }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.text }}>{'CLEAR FILTERS'}</Text>
              </TouchableOpacity>
            </View>
          ) : activeTab === 'apply' ? (
            <>
              <View style={{ borderWidth: 1, borderColor: p.border, padding: 12, marginBottom: 16, backgroundColor: p.surface }}>
                <Text style={{ fontSize: 12, color: p.textMuted, fontStyle: 'italic', lineHeight: 18 }}>
                  Tap <Text style={{ fontWeight: '700', color: p.text }}>Apply Now</Text> to go straight to each company's application page. Companies with a{' '}
                  <Text style={{ fontWeight: '700', color: p.text }}>🆕 Page Updated</Text> badge have had changes to their trader portal recently.
                </Text>
              </View>
              {filteredCompanies.map((company) => (
                <DiscoverCompanyCard key={company.id} company={company} />
              ))}
            </>
          ) : (
            <>
              {unappliedEvents.map((event) => (
                <DiscoverEventCard
                  key={event.id}
                  event={event}
                  onAdd={handleAddEvent}
                  adding={addingId === event.id}
                  isApplied={false}
                  onToggleApplied={toggleApplied}
                />
              ))}
              {appliedEvents.length > 0 && (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: p.border }} />
                    <Text style={{ fontSize: 10, color: p.textMuted, fontWeight: '700', letterSpacing: 1 }}>
                      {'APPLIED (' + appliedEvents.length + ')'}
                    </Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: p.border }} />
                  </View>
                  {appliedEvents.map((event) => (
                    <DiscoverEventCard
                      key={event.id}
                      event={event}
                      onAdd={handleAddEvent}
                      adding={addingId === event.id}
                      isApplied={true}
                      onToggleApplied={toggleApplied}
                    />
                  ))}
                </>
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}
