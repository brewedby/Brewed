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

const REGIONS = ['All UK', 'London', 'South East', 'South West', 'Midlands', 'North West', 'Yorkshire', 'Scotland', 'Wales'];
const CATEGORIES = ['All', 'Festival', 'Market', 'Fair', 'Street Food', 'Christmas', 'Corporate', 'Pop-Up'];

const CATEGORY_COLORS: Record<string, string> = {
  Festival:      'bg-purple-100 text-purple-700',
  Market:        'bg-green-100 text-green-700',
  Fair:          'bg-blue-100 text-blue-700',
  'Street Food': 'bg-orange-100 text-orange-700',
  Christmas:     'bg-red-100 text-red-700',
  Corporate:     'bg-slate-100 text-slate-700',
  'Pop-Up':      'bg-pink-100 text-pink-700',
  Event:         'bg-stone-100 text-stone-600',
};

function CategoryBadge({ category }: { category: string }) {
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Event;
  const [bg, textColor] = colors.split(' ');
  return (
    <View className={`px-2 py-0.5 rounded-full ${bg}`}>
      <Text className={`text-xs font-medium ${textColor}`}>{category}</Text>
    </View>
  );
}

function DiscoverCard({
  event, onAdd, adding,
}: {
  event: DiscoveredEvent;
  onAdd: (e: DiscoveredEvent) => void;
  adding: boolean;
}) {
  return (
    <View className="bg-white rounded-2xl mb-3 border border-slate-100 overflow-hidden shadow-sm">
      {/* Colour strip */}
      <View className="h-1 bg-amber-400" />
      <View className="p-4">
        {/* Featured badge */}
        {event.featured && (
          <View className="self-start bg-amber-100 px-2.5 py-0.5 rounded-full mb-2">
            <Text className="text-amber-700 text-xs font-semibold">⭐ Featured</Text>
          </View>
        )}

        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-3">
            <Text className="font-bold text-slate-900 text-base leading-snug" numberOfLines={2}>
              {event.title}
            </Text>
            {event.organiser ? (
              <Text className="text-slate-400 text-xs mt-1">🌐 {event.organiser}</Text>
            ) : (
              <Text className="text-slate-400 text-xs mt-1">🌐 {event.source}</Text>
            )}
          </View>
          <CategoryBadge category={event.category} />
        </View>

        <Text className="text-slate-600 text-sm leading-relaxed mb-3" numberOfLines={3}>
          {event.description}
        </Text>

        <View className="flex-row flex-wrap gap-2 mb-3">
          {event.location && (
            <View className="flex-row items-center bg-slate-50 px-2.5 py-1 rounded-full">
              <Text className="text-slate-500 text-xs">📍 {event.location}</Text>
            </View>
          )}
          {event.dateHint && (
            <View className="flex-row items-center bg-slate-50 px-2.5 py-1 rounded-full">
              <Text className="text-slate-500 text-xs">📅 {event.dateHint}</Text>
            </View>
          )}
          {event.estimatedFootfall && (
            <View className="flex-row items-center bg-slate-50 px-2.5 py-1 rounded-full">
              <Text className="text-slate-500 text-xs">👥 {event.estimatedFootfall}</Text>
            </View>
          )}
          {event.pitchFeeRange && (
            <View className="flex-row items-center bg-slate-50 px-2.5 py-1 rounded-full">
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
              <Text className="text-white font-semibold text-sm">+ Add to My Events</Text>
            )}
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
  const [searchText, setSearchText] = useState('');
  const [region, setRegion] = useState('All UK');
  const [category, setCategory] = useState('All');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: allResults = [], isLoading, refetch, error } = useDiscoverEvents({});
  const { data: companies = [] } = useCompanies();
  const createEvent = useCreateEvent();

  // Client-side filtering
  const filteredResults = useMemo(() => {
    let results = allResults;

    if (region !== 'All UK') {
      results = results.filter((e) =>
        e.region?.toLowerCase().includes(region.toLowerCase()) ||
        e.location?.toLowerCase().includes(region.toLowerCase())
      );
    }

    if (category !== 'All') {
      results = results.filter((e) =>
        e.category?.toLowerCase() === category.toLowerCase()
      );
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      results = results.filter((e) =>
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.organiser?.toLowerCase().includes(q) ||
        e.source?.toLowerCase().includes(q)
      );
    }

    return results;
  }, [allResults, region, category, searchText]);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleAddEvent(discovered: DiscoveredEvent) {
    setAddingId(discovered.id);
    try {
      const sourceDomain = discovered.source.toLowerCase();
      const matchedCompany = companies.find((c) =>
        c.website?.toLowerCase().includes(sourceDomain) ||
        c.name.toLowerCase().includes(sourceDomain.split('.')[0])
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
          notes: `Discovered via Brewed by Boon — source: ${discovered.source}`,
          gross_sales: 0, cost_of_goods: 0, pitch_fee: 0,
          travel_costs: 0, equipment_costs: 0, other_costs: 0, staffing_costs: 0,
          staffing_entries: [], infrastructure_items: [],
        } as any,
      });
      Alert.alert(
        'Added!',
        `"${discovered.title.slice(0, 50)}" has been added to your events as Pending. Tap to update the date and details.`,
        [
          { text: 'Done' },
          { text: 'View Events', onPress: () => router.push('/(tabs)/events') },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not add event');
    } finally {
      setAddingId(null);
    }
  }

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-4 pt-3 pb-4 border-b border-slate-100">
        <Text className="text-2xl font-bold text-slate-900 mb-3">Discover Events</Text>

        {/* Search bar */}
        <View className="flex-row items-center bg-slate-100 rounded-xl px-3 py-2.5 mb-3">
          <Text className="text-slate-400 mr-2">🔍</Text>
          <TextInput
            className="flex-1 text-slate-900 text-sm"
            placeholder="Search UK events, markets, festivals..."
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

        {/* Region filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, marginBottom: 6 }}
        >
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

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full border ${category === c ? 'bg-amber-500 border-amber-500' : 'bg-white border-slate-200'}`}
            >
              <Text className={`text-xs font-medium ${category === c ? 'text-white' : 'text-slate-600'}`}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text className="text-slate-500 text-sm">Loading events...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-3">⚠️</Text>
          <Text className="font-semibold text-slate-700 text-center">Could not load events</Text>
          <Text className="text-slate-500 text-center text-sm mt-2">
            Check your connection and try again.
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="mt-4 bg-amber-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold text-sm">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#f59e0b" />}
        >
          {/* Result count */}
          <Text className="text-slate-400 text-xs mb-3">
            {filteredResults.length} {filteredResults.length === 1 ? 'event' : 'events'} found
          </Text>

          {filteredResults.length === 0 ? (
            <View className="flex-1 items-center justify-center py-16 px-6">
              <Text className="text-4xl mb-3">🔍</Text>
              <Text className="font-semibold text-slate-700 text-center text-base">No events match your search</Text>
              <Text className="text-slate-500 text-center text-sm mt-2">
                Try adjusting your filters or search term.
              </Text>
              <TouchableOpacity
                onPress={() => { setSearchText(''); setRegion('All UK'); setCategory('All'); }}
                className="mt-4 border border-slate-200 px-5 py-2.5 rounded-xl"
              >
                <Text className="text-slate-600 font-medium text-sm">Clear filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredResults.map((event) => (
              <DiscoverCard
                key={event.id}
                event={event}
                onAdd={handleAddEvent}
                adding={addingId === event.id}
              />
            ))
          )}

          {/* Suggest an Event */}
          <TouchableOpacity
            onPress={() => Alert.alert('Coming Soon', 'Event submission will be available in a future update.')}
            className="mb-4 mt-2 border border-dashed border-slate-300 rounded-2xl py-4 items-center"
          >
            <Text className="text-slate-500 font-medium text-sm">+ Suggest an Event</Text>
            <Text className="text-slate-400 text-xs mt-1">Know of an event we should list?</Text>
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}
