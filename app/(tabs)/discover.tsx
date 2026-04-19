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
import type { DiscoveredEvent } from '@/types';

const REGIONS = ['All UK', 'London', 'South East', 'South West', 'East of England', 'Midlands', 'West Midlands', 'North West', 'Yorkshire', 'North East', 'Scotland', 'Wales', 'National'];

const EVENT_CATEGORIES = ['All', 'Music Festival', 'Food Festival', 'Street Food Market', 'Christmas Market', 'Garden and Lifestyle', 'Motorsport', 'Equestrian'];
const COMPANY_CATEGORIES = ['All', 'Concessions Company', 'Industry Body'];

// Days since a date string
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

// Category badge colours — using explicit style objects to avoid NativeWind dynamic class issues
const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  'Music Festival':       { bg: '#f3e8ff', text: '#7e22ce' },
  'Food Festival':        { bg: '#ffedd5', text: '#c2410c' },
  'Street Food Market':   { bg: '#dcfce7', text: '#15803d' },
  'Christmas Market':     { bg: '#fee2e2', text: '#b91c1c' },
  'Garden and Lifestyle': { bg: '#d1fae5', text: '#065f46' },
  'Motorsport':           { bg: '#dbeafe', text: '#1d4ed8' },
  'Equestrian':           { bg: '#fef3c7', text: '#92400e' },
};
const DEFAULT_CATEGORY_STYLE = { bg: '#f1f5f9', text: '#475569' };

function VerifiedBadge({ lastVerifiedAt }: { lastVerifiedAt: string | null }) {
  const days = daysSince(lastVerifiedAt);
  if (days === null) return null;
  const fresh = days <= 7;
  const stale = days > 30;
  const bgColor = fresh ? '#dcfce7' : stale ? '#ffedd5' : '#f1f5f9';
  const textColor = fresh ? '#15803d' : stale ? '#c2410c' : '#64748b';
  return (
    <View style={{ backgroundColor: bgColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
      <Text style={{ color: textColor, fontSize: 11, fontWeight: '500' }}>
        {fresh ? `Verified ${days}d ago` : stale ? `Check needed (${days}d)` : `Verified ${days}d ago`}
      </Text>
    </View>
  );
}

function EventCard({
  event, onAdd, adding, isApplied, onToggleApplied,
}: {
  event: DiscoveredEvent;
  onAdd: (e: DiscoveredEvent) => void;
  adding: boolean;
  isApplied: boolean;
  onToggleApplied: (id: string) => void;
}) {
  const catStyle = CATEGORY_STYLES[event.category] ?? DEFAULT_CATEGORY_STYLE;

  return (
    <View style={{ backgroundColor: isApplied ? '#f9fafb' : '#fff', borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: isApplied ? '#e2e8f0' : '#f1f5f9', overflow: 'hidden', opacity: isApplied ? 0.75 : 1 }}>
      <View style={{ height: 3, backgroundColor: isApplied ? '#94a3b8' : '#f59e0b' }} />
      <View style={{ padding: 14 }}>
        {event.featured && !isApplied && (
          <View style={{ alignSelf: 'flex-start', backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12, marginBottom: 8 }}>
            <Text style={{ color: '#b45309', fontSize: 12, fontWeight: '600' }}>⭐ Featured</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 14, lineHeight: 20, flex: 1, marginRight: 10 }} numberOfLines={2}>
            {event.title}
          </Text>
          <View style={{ backgroundColor: catStyle.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
            <Text style={{ color: catStyle.text, fontSize: 10, fontWeight: '600' }}>{event.category}</Text>
          </View>
        </View>

        {event.organiser && (
          <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>by {event.organiser}</Text>
        )}

        <Text style={{ color: '#475569', fontSize: 13, lineHeight: 19, marginBottom: 10 }} numberOfLines={isApplied ? 1 : 3}>
          {event.description}
        </Text>

        {!isApplied && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {event.location && (
              <View style={{ backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 }}>
                <Text style={{ color: '#64748b', fontSize: 11 }}>📍 {event.location}</Text>
              </View>
            )}
            {event.dateHint && (
              <View style={{ backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 }}>
                <Text style={{ color: '#64748b', fontSize: 11 }}>📅 {event.dateHint}</Text>
              </View>
            )}
            {event.estimatedFootfall && (
              <View style={{ backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 }}>
                <Text style={{ color: '#64748b', fontSize: 11 }}>👥 {event.estimatedFootfall}</Text>
              </View>
            )}
            {event.pitchFeeRange && (
              <View style={{ backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 }}>
                <Text style={{ color: '#64748b', fontSize: 11 }}>💷 {event.pitchFeeRange}</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {!isApplied && (
            <TouchableOpacity
              onPress={() => { if (event.url) Linking.openURL(event.url); }}
              style={{ flex: 1, borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 10, borderRadius: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#475569', fontWeight: '600', fontSize: 13 }}>View & Apply ↗</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => onToggleApplied(event.id)}
            style={{ flex: isApplied ? undefined : 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
              paddingVertical: 10, paddingHorizontal: isApplied ? 14 : 0, borderRadius: 12,
              backgroundColor: isApplied ? '#f1f5f9' : '#dcfce7',
              borderWidth: 1, borderColor: isApplied ? '#e2e8f0' : '#bbf7d0' }}
          >
            <Ionicons name={isApplied ? 'close-circle-outline' : 'checkmark-circle-outline'} size={15} color={isApplied ? '#94a3b8' : '#16a34a'} />
            <Text style={{ fontWeight: '600', fontSize: 13, color: isApplied ? '#94a3b8' : '#15803d' }}>
              {isApplied ? 'Undo' : 'Applied'}
            </Text>
          </TouchableOpacity>
          {!isApplied && (
            <TouchableOpacity
              onPress={() => onAdd(event)}
              disabled={adding}
              style={{ flex: 1, backgroundColor: '#f59e0b', paddingVertical: 10, borderRadius: 12, alignItems: 'center' }}
            >
              {adding ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ Track</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

function CompanyCard({ company }: { company: DiscoveredEvent }) {
  const isIndustryBody = company.category === 'Industry Body';

  return (
    <View className="bg-white rounded-2xl mb-3 border border-slate-100 overflow-hidden">
      <View style={{ height: 6, backgroundColor: isIndustryBody ? '#94a3b8' : '#10b981' }} />
      <View className="p-4">
        <View className="flex-row items-start justify-between mb-1">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center gap-2 flex-wrap mb-0.5">
              {company.featured && (
                <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                  <Text style={{ color: '#b45309', fontSize: 11, fontWeight: '600' }}>⭐ Major</Text>
                </View>
              )}
              {company.applicationChanged && (
                <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                  <Text style={{ color: '#15803d', fontSize: 11, fontWeight: '600' }}>🆕 Page Updated</Text>
                </View>
              )}
            </View>
            <Text className="font-bold text-slate-900 text-base leading-snug">{company.title}</Text>
          </View>
          <View style={{ backgroundColor: isIndustryBody ? '#f1f5f9' : '#d1fae5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
            <Text style={{ color: isIndustryBody ? '#475569' : '#065f46', fontSize: 11, fontWeight: '500' }}>
              {isIndustryBody ? 'Industry Body' : 'Concessions Co.'}
            </Text>
          </View>
        </View>

        <Text className="text-slate-600 text-sm leading-relaxed mb-3">{company.description}</Text>

        {company.eventsManaged && (
          <View className="bg-slate-50 rounded-xl p-3 mb-3">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Events They Run</Text>
            <Text className="text-slate-700 text-sm leading-relaxed">{company.eventsManaged}</Text>
          </View>
        )}

        <View className="flex-row flex-wrap gap-2 mb-3">
          {company.location && (
            <View className="bg-slate-50 px-2.5 py-1 rounded-full">
              <Text className="text-slate-500 text-xs">📍 {company.location}</Text>
            </View>
          )}
          {company.pitchFeeRange && (
            <View className="bg-slate-50 px-2.5 py-1 rounded-full">
              <Text className="text-slate-500 text-xs">💷 {company.pitchFeeRange}</Text>
            </View>
          )}
          {company.contactPhone && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${company.contactPhone}`)}
              className="bg-blue-50 px-2.5 py-1 rounded-full"
            >
              <Text className="text-blue-600 text-xs font-medium">📞 {company.contactPhone}</Text>
            </TouchableOpacity>
          )}
          {company.contactEmail && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`mailto:${company.contactEmail}`)}
              className="bg-blue-50 px-2.5 py-1 rounded-full"
            >
              <Text className="text-blue-600 text-xs font-medium">✉️ {company.contactEmail}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row items-center justify-between">
          <VerifiedBadge lastVerifiedAt={company.lastVerifiedAt} />
          <TouchableOpacity
            onPress={() => { if (company.url) Linking.openURL(company.url); }}
            className="bg-emerald-500 px-4 py-2.5 rounded-xl"
          >
            <Text className="text-white font-semibold text-sm">Apply Now ↗</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
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
      if (raw) setAppliedIds(new Set(JSON.parse(raw)));
    });
  }, [appliedStorageKey]);

  useFocusEffect(useCallback(() => {
    refetch();
  }, []));

  const { data: allResults = [], isLoading, refetch, error } = useDiscoverEvents({});
  const { data: companies = [] } = useCompanies();
  const createEvent = useCreateEvent();

  async function toggleApplied(id: string) {
    setAppliedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      if (appliedStorageKey) {
        AsyncStorage.setItem(appliedStorageKey, JSON.stringify([...next]));
      }
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
    if (category !== 'All') {
      results = results.filter((e) => e.category?.toLowerCase() === category.toLowerCase());
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      results = results.filter((e) =>
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.organiser?.toLowerCase().includes(q)
      );
    }
    return results;
  }, [events, region, category, searchText]);

  const filteredCompanies = useMemo(() => {
    let results = concessionsCos;
    if (category !== 'All') {
      results = results.filter((c) => c.category?.toLowerCase() === category.toLowerCase());
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      results = results.filter((c) =>
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.eventsManaged?.toLowerCase().includes(q) ||
        c.organiser?.toLowerCase().includes(q)
      );
    }
    // Featured first, then alphabetical
    return [...results].sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return a.title.localeCompare(b.title);
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
      // Re-fetch data after sync
      await refetch();
      // Update last synced
      setLastSynced(new Date());
    } catch {
      // silently ignore - edge function may not exist in dev
    } finally {
      setSyncing(false);
    }
  }

  async function handleAddEvent(discovered: DiscoveredEvent) {
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in to track events.');
      return;
    }
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
          name: eventName,
          date: toISODateString(new Date()),
          location: discovered.location ?? '',
          status: 'pending',
          description: discovered.description ?? '',
          application_url: discovered.url ?? '',
          company_id: matchedCompany?.id ?? '',
          notes: `Discovered via Brewed Discover — ${discovered.organiser ?? discovered.source}`,
          // Financial defaults
          gross_sales: 0,
          zero_rated_sales: 0,
          standard_rated_sales: 0,
          concessions_commission_pct: 0,
          pitch_fee_refund_pct: 0,
          cost_of_goods: 0,
          pitch_fee: 0,
          power_fee: 0,
          travel_costs: 0,
          camping_costs: 0,
          equipment_costs: 0,
          other_costs: 0,
          staffing_costs: 0,
          fresh_milk_litres: 0,
          alt_milk_litres: 0,
          // Flags
          overnight_stay: false,
          documents_uploaded: false,
          // Arrays
          staffing_entries: [],
          infrastructure_items: [],
        },
      });
      Alert.alert(
        'Added!',
        `"${eventName.slice(0, 50)}" added to your events as Pending. Update the date and details when ready.`,
        [{ text: 'Done' }, { text: 'View Events', onPress: () => router.push('/(tabs)/events') }]
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not add event';
      Alert.alert('Error', msg);
    } finally {
      setAddingId(null);
    }
  }

  const unappliedEvents = useMemo(() => filteredEvents.filter((e) => !appliedIds.has(e.id)), [filteredEvents, appliedIds]);
  const appliedEvents = useMemo(() => filteredEvents.filter((e) => appliedIds.has(e.id)), [filteredEvents, appliedIds]);

  const currentCategories = activeTab === 'events' ? EVENT_CATEGORIES : COMPANY_CATEGORIES;
  const currentCount = activeTab === 'events' ? filteredEvents.length : filteredCompanies.length;

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-4 pt-3 pb-3 border-b border-slate-100">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View>
            <Text className="text-2xl font-bold text-slate-900">Discover</Text>
            {lastSynced && (
              <Text className="text-stone-400 text-xs">
                Last synced: {formatRelativeTime(lastSynced)}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={handleSync}
            disabled={syncing}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f5f5f4', borderWidth: 1, borderColor: '#e7e5e4' }}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#78716c" />
            ) : (
              <Text style={{ color: '#57534e', fontSize: 13, fontWeight: '500' }}>↻ Refresh</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tab switcher */}
        <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => startTransition(() => { setActiveTab('apply'); setCategory('All'); })}
            style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: activeTab === 'apply' ? '#ffffff' : 'transparent' }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: activeTab === 'apply' ? '#0f172a' : '#94a3b8' }}>
              Who to Apply To
            </Text>
            <Text style={{ fontSize: 12, color: activeTab === 'apply' ? '#10b981' : '#94a3b8' }}>
              {concessionsCos.length} companies
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => startTransition(() => { setActiveTab('events'); setCategory('All'); })}
            style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: activeTab === 'events' ? '#ffffff' : 'transparent' }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: activeTab === 'events' ? '#0f172a' : '#94a3b8' }}>
              Events & Festivals
            </Text>
            <Text style={{ fontSize: 12, color: activeTab === 'events' ? '#f59e0b' : '#94a3b8' }}>
              {events.length} events
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View className="flex-row items-center bg-slate-100 rounded-xl px-3 py-2.5 mb-3">
          <Text className="text-slate-400 mr-2">🔍</Text>
          <TextInput
            className="flex-1 text-slate-900 text-sm"
            placeholder={activeTab === 'apply' ? 'Search concessions companies...' : 'Search festivals, markets...'}
            placeholderTextColor="#94a3b8"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Text className="text-slate-400 text-lg">×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Region filter — only for events tab */}
        {activeTab === 'events' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 6 }}>
            {REGIONS.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRegion(r)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1,
                  backgroundColor: region === r ? '#1e293b' : '#fff',
                  borderColor: region === r ? '#1e293b' : '#e2e8f0',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '500', color: region === r ? '#fff' : '#475569' }}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {currentCategories.map((c) => {
            const active = category === c;
            const activeColor = activeTab === 'apply' ? '#10b981' : '#f59e0b';
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setCategory(c)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1,
                  backgroundColor: active ? activeColor : '#fff',
                  borderColor: active ? activeColor : '#e2e8f0',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '500', color: active ? '#fff' : '#475569' }}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text className="text-slate-500 text-sm">Loading directory...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-3">⚠️</Text>
          <Text className="font-semibold text-slate-700 text-center mb-2">Could not load directory</Text>
          <Text className="text-slate-400 text-xs text-center mb-1">
            {error instanceof Error ? error.message : 'Database error'}
          </Text>
          <Text className="text-slate-400 text-xs text-center mb-4">
            Run the Migration 003 SQL in your Supabase dashboard, then tap Retry.
          </Text>
          <TouchableOpacity onPress={() => refetch()} className="mt-2 bg-amber-500 px-6 py-3 rounded-xl">
            <Text className="text-white font-semibold text-sm">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#f59e0b" />}
        >
          <Text className="text-slate-400 text-xs mb-3">{currentCount} {activeTab === 'apply' ? 'companies' : 'events'} found</Text>

          {currentCount === 0 ? (
            <View className="items-center py-16 px-6">
              <Text className="text-4xl mb-3">{activeTab === 'apply' ? '🏢' : '🔍'}</Text>
              <Text className="font-semibold text-slate-700 text-center text-base">Nothing matches your search</Text>
              <TouchableOpacity
                onPress={() => { setSearchText(''); setRegion('All UK'); setCategory('All'); }}
                className="mt-4 border border-slate-200 px-5 py-2.5 rounded-xl"
              >
                <Text className="text-slate-600 font-medium text-sm">Clear filters</Text>
              </TouchableOpacity>
            </View>
          ) : activeTab === 'apply' ? (
            <>
              <View className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-4 flex-row items-start">
                <Text className="text-lg mr-2">💡</Text>
                <Text className="text-emerald-800 text-xs leading-relaxed flex-1">
                  Tap <Text className="font-semibold">Apply Now</Text> to go straight to each company's application page. Companies with a <Text className="font-semibold">🆕 Page Updated</Text> badge have had changes to their trader portal recently.
                </Text>
              </View>
              {filteredCompanies.map((company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </>
          ) : (
            <>
              {unappliedEvents.map((event) => (
                <EventCard
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 10 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                      <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b' }}>Applied ({appliedEvents.length})</Text>
                    </View>
                    <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
                  </View>
                  {appliedEvents.map((event) => (
                    <EventCard
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

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}
