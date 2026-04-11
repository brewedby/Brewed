import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  RefreshControl, Linking, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDiscoverEvents } from '@/lib/queries/discover';
import { useCompanies } from '@/lib/queries/companies';
import { useCreateEvent } from '@/lib/mutations/events';
import { useAuth } from '@/lib/auth';
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

function VerifiedBadge({ lastVerifiedAt }: { lastVerifiedAt: string | null }) {
  const days = daysSince(lastVerifiedAt);
  if (days === null) return null;
  const fresh = days <= 7;
  const stale = days > 30;
  return (
    <View className={`px-2 py-0.5 rounded-full ${fresh ? 'bg-green-100' : stale ? 'bg-orange-100' : 'bg-slate-100'}`}>
      <Text className={`text-xs font-medium ${fresh ? 'text-green-700' : stale ? 'text-orange-600' : 'text-slate-500'}`}>
        {fresh ? `Verified ${days}d ago` : stale ? `Check needed (${days}d)` : `Verified ${days}d ago`}
      </Text>
    </View>
  );
}

function EventCard({ event, onAdd, adding }: { event: DiscoveredEvent; onAdd: (e: DiscoveredEvent) => void; adding: boolean }) {
  const categoryColors: Record<string, string> = {
    'Music Festival': 'bg-purple-100 text-purple-700',
    'Food Festival': 'bg-orange-100 text-orange-700',
    'Street Food Market': 'bg-green-100 text-green-700',
    'Christmas Market': 'bg-red-100 text-red-700',
    'Garden and Lifestyle': 'bg-emerald-100 text-emerald-700',
    'Motorsport': 'bg-blue-100 text-blue-700',
    'Equestrian': 'bg-amber-100 text-amber-700',
  };
  const colors = categoryColors[event.category] ?? 'bg-slate-100 text-slate-600';
  const [bg, textColor] = colors.split(' ');

  return (
    <View className="bg-white rounded-2xl mb-3 border border-slate-100 overflow-hidden">
      <View className="h-1 bg-amber-400" />
      <View className="p-4">
        {event.featured && (
          <View className="self-start bg-amber-100 px-2.5 py-0.5 rounded-full mb-2">
            <Text className="text-amber-700 text-xs font-semibold">⭐ Featured</Text>
          </View>
        )}

        <View className="flex-row items-start justify-between mb-2">
          <Text className="font-bold text-slate-900 text-base leading-snug flex-1 mr-3" numberOfLines={2}>
            {event.title}
          </Text>
          <View className={`px-2 py-0.5 rounded-full ${bg}`}>
            <Text className={`text-xs font-medium ${textColor}`}>{event.category}</Text>
          </View>
        </View>

        {event.organiser && (
          <Text className="text-slate-400 text-xs mb-2">Organised by {event.organiser}</Text>
        )}

        <Text className="text-slate-600 text-sm leading-relaxed mb-3" numberOfLines={3}>
          {event.description}
        </Text>

        <View className="flex-row flex-wrap gap-1.5 mb-3">
          {event.location && (
            <View className="bg-slate-50 px-2.5 py-1 rounded-full">
              <Text className="text-slate-500 text-xs">📍 {event.location}</Text>
            </View>
          )}
          {event.dateHint && (
            <View className="bg-slate-50 px-2.5 py-1 rounded-full">
              <Text className="text-slate-500 text-xs">📅 {event.dateHint}</Text>
            </View>
          )}
          {event.estimatedFootfall && (
            <View className="bg-slate-50 px-2.5 py-1 rounded-full">
              <Text className="text-slate-500 text-xs">👥 {event.estimatedFootfall}</Text>
            </View>
          )}
          {event.pitchFeeRange && (
            <View className="bg-slate-50 px-2.5 py-1 rounded-full">
              <Text className="text-slate-500 text-xs">💷 {event.pitchFeeRange}</Text>
            </View>
          )}
        </View>

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => event.url ? Linking.openURL(event.url) : null}
            className="flex-1 border border-slate-200 py-2.5 rounded-xl items-center"
          >
            <Text className="text-slate-600 font-medium text-sm">View & Apply ↗</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onAdd(event)}
            disabled={adding}
            className="flex-1 bg-amber-500 py-2.5 rounded-xl items-center"
          >
            {adding ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-semibold text-sm">+ Track It</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function CompanyCard({ company }: { company: DiscoveredEvent }) {
  const isIndustryBody = company.category === 'Industry Body';

  return (
    <View className="bg-white rounded-2xl mb-3 border border-slate-100 overflow-hidden">
      <View className={`h-1.5 ${isIndustryBody ? 'bg-slate-400' : 'bg-emerald-500'}`} />
      <View className="p-4">
        <View className="flex-row items-start justify-between mb-1">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center gap-2 flex-wrap mb-0.5">
              {company.featured && (
                <View className="bg-amber-100 px-2 py-0.5 rounded-full">
                  <Text className="text-amber-700 text-xs font-semibold">⭐ Major</Text>
                </View>
              )}
              {company.applicationChanged && (
                <View className="bg-green-100 px-2 py-0.5 rounded-full">
                  <Text className="text-green-700 text-xs font-semibold">🆕 Page Updated</Text>
                </View>
              )}
            </View>
            <Text className="font-bold text-slate-900 text-base leading-snug">{company.title}</Text>
          </View>
          <View className={`px-2 py-0.5 rounded-full ${isIndustryBody ? 'bg-slate-100' : 'bg-emerald-100'}`}>
            <Text className={`text-xs font-medium ${isIndustryBody ? 'text-slate-600' : 'text-emerald-700'}`}>
              {isIndustryBody ? 'Industry Body' : 'Concessions Co.'}
            </Text>
          </View>
        </View>

        <Text className="text-slate-600 text-sm leading-relaxed mb-3">{company.description}</Text>

        {/* Events managed */}
        {company.eventsManaged && (
          <View className="bg-slate-50 rounded-xl p-3 mb-3">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Events They Run</Text>
            <Text className="text-slate-700 text-sm leading-relaxed">{company.eventsManaged}</Text>
          </View>
        )}

        {/* Contact details */}
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
            onPress={() => company.url ? Linking.openURL(company.url) : null}
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
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'events' | 'apply'>('apply');
  const [searchText, setSearchText] = useState('');
  const [region, setRegion] = useState('All UK');
  const [category, setCategory] = useState('All');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: allResults = [], isLoading, refetch, error } = useDiscoverEvents({});
  const { data: companies = [] } = useCompanies();
  const createEvent = useCreateEvent();

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

  async function handleAddEvent(discovered: DiscoveredEvent) {
    setAddingId(discovered.id);
    try {
      const matchedCompany = companies.find((c) =>
        c.website?.toLowerCase().includes(discovered.source.toLowerCase()) ||
        c.name.toLowerCase().includes(discovered.organiser?.toLowerCase().split(' ')[0] ?? '')
      );
      await createEvent.mutateAsync({
        userId: user!.id,
        data: {
          name: discovered.title.length > 80 ? discovered.title.slice(0, 80) : discovered.title,
          date: new Date().toISOString().split('T')[0],
          location: discovered.location ?? '',
          status: 'pending',
          description: discovered.description,
          application_url: discovered.url,
          company_id: matchedCompany?.id ?? '',
          notes: `Discovered via Brewed Discover — ${discovered.organiser ?? discovered.source}`,
          gross_sales: 0, cost_of_goods: 0, pitch_fee: 0,
          travel_costs: 0, equipment_costs: 0, other_costs: 0, staffing_costs: 0,
          staffing_entries: [], infrastructure_items: [],
        } as any,
      });
      Alert.alert(
        'Added!',
        `"${discovered.title.slice(0, 50)}" added to your events as Pending. Update the date and details when ready.`,
        [{ text: 'Done' }, { text: 'View Events', onPress: () => router.push('/(tabs)/events') }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not add event');
    } finally {
      setAddingId(null);
    }
  }

  const currentCategories = activeTab === 'events' ? EVENT_CATEGORIES : COMPANY_CATEGORIES;
  const currentCount = activeTab === 'events' ? filteredEvents.length : filteredCompanies.length;

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-4 pt-3 pb-3 border-b border-slate-100">
        <Text className="text-2xl font-bold text-slate-900 mb-3">Discover</Text>

        {/* Tab switcher */}
        <View className="flex-row bg-slate-100 rounded-xl p-1 mb-3">
          <TouchableOpacity
            onPress={() => { setActiveTab('apply'); setCategory('All'); }}
            className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'apply' ? 'bg-white shadow-sm' : ''}`}
          >
            <Text className={`text-sm font-semibold ${activeTab === 'apply' ? 'text-slate-900' : 'text-slate-400'}`}>
              Who to Apply To
            </Text>
            <Text className={`text-xs ${activeTab === 'apply' ? 'text-emerald-600' : 'text-slate-400'}`}>
              {concessionsCos.length} companies
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setActiveTab('events'); setCategory('All'); }}
            className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'events' ? 'bg-white shadow-sm' : ''}`}
          >
            <Text className={`text-sm font-semibold ${activeTab === 'events' ? 'text-slate-900' : 'text-slate-400'}`}>
              Events & Festivals
            </Text>
            <Text className={`text-xs ${activeTab === 'events' ? 'text-amber-600' : 'text-slate-400'}`}>
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
                className={`px-3 py-1.5 rounded-full border ${region === r ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-200'}`}
              >
                <Text className={`text-xs font-medium ${region === r ? 'text-white' : 'text-slate-600'}`}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {currentCategories.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full border ${category === c ? (activeTab === 'apply' ? 'bg-emerald-500 border-emerald-500' : 'bg-amber-500 border-amber-500') : 'bg-white border-slate-200'}`}
            >
              <Text className={`text-xs font-medium ${category === c ? 'text-white' : 'text-slate-600'}`}>{c}</Text>
            </TouchableOpacity>
          ))}
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
          <Text className="font-semibold text-slate-700 text-center">Could not load directory</Text>
          <TouchableOpacity onPress={() => refetch()} className="mt-4 bg-amber-500 px-6 py-3 rounded-xl">
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
              {/* Updated badge explanation */}
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
            filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onAdd={handleAddEvent}
                adding={addingId === event.id}
              />
            ))
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}
