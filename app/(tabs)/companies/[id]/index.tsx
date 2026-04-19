import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCompany } from '@/lib/queries/companies';
import { useEvents, useDeleteEvent } from '@/lib/queries/events';
import { useDeleteCompany } from '@/lib/queries/companies';
import { EventCard } from '@/components/events/EventCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency } from '@/lib/formatters';
import { calcEventFinancials } from '@/lib/calculations';

export default function CompanyDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: company, isLoading, refetch } = useCompany(id);
  const { data: allEvents } = useEvents({ companyId: id });
  const deleteCompany = useDeleteCompany();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleDelete() {
    try {
      await deleteCompany.mutateAsync(id);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  if (isLoading) return <LoadingSpinner message="Loading company..." />;
  if (!company) return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-stone-500">Company not found</Text>
    </View>
  );

  const events = allEvents ?? [];
  const totalRevenue = events.reduce((s, e) => s + (e.event_financials?.gross_sales ?? 0), 0);
  const totalNet = events.reduce((s, e) => s + e.calculations.netProfit, 0);
  const accepted = events.filter((e) => e.status === 'accepted').length;
  const decided = events.filter((e) => e.status === 'accepted' || e.status === 'rejected').length;
  const acceptanceRate = decided > 0 ? ((accepted / decided) * 100).toFixed(0) : '—';

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      <View className="bg-white px-4 pt-2 pb-4 border-b border-stone-100">
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to companies"
            className="p-1"
          >
            <Text className="text-amber-600 text-base">‹ Companies</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/(tabs)/companies/${id}/edit`)}
            accessibilityRole="button"
            accessibilityLabel="Edit company"
            className="bg-amber-700 px-4 py-1.5 rounded-xl"
          >
            <Text className="text-white font-semibold text-sm">Edit</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-xl font-bold text-stone-900">{company.name}</Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#f59e0b" colors={['#f59e0b']} />}
      >
        {/* Contact card */}
        <View className="bg-white rounded-2xl p-4 border border-stone-100 mb-4">
          <Text className="font-bold text-stone-900 mb-3">Contact</Text>
          {company.contact_name && (
            <View className="flex-row items-center mb-1.5">
              <Ionicons name="person-outline" size={14} color="#57534e" />
              <Text className="text-stone-700 text-sm ml-2">{company.contact_name}</Text>
            </View>
          )}
          {company.email && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`mailto:${company.email}`)}
              accessibilityRole="link"
              accessibilityLabel={`Email ${company.email}`}
              className="flex-row items-center mb-1.5"
            >
              <Ionicons name="mail-outline" size={14} color="#b45309" />
              <Text className="text-amber-700 text-sm ml-2">{company.email}</Text>
            </TouchableOpacity>
          )}
          {company.phone && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${company.phone}`)}
              accessibilityRole="link"
              accessibilityLabel={`Call ${company.phone}`}
              className="flex-row items-center mb-1.5"
            >
              <Ionicons name="call-outline" size={14} color="#b45309" />
              <Text className="text-amber-700 text-sm ml-2">{company.phone}</Text>
            </TouchableOpacity>
          )}
          {company.website && (
            <TouchableOpacity
              onPress={() => Linking.openURL(company.website!)}
              accessibilityRole="link"
              accessibilityLabel={`Open website ${company.website}`}
              className="flex-row items-center"
            >
              <Ionicons name="globe-outline" size={14} color="#b45309" />
              <Text className="text-amber-700 text-sm ml-2">{company.website}</Text>
            </TouchableOpacity>
          )}
          {!company.contact_name && !company.email && !company.phone && !company.website && (
            <Text className="text-stone-400 text-sm">No contact details added</Text>
          )}
          {company.notes && (
            <View className="mt-3 pt-3 border-t border-stone-100">
              <Text className="text-stone-500 text-sm">{company.notes}</Text>
            </View>
          )}
        </View>

        {/* Stats — 2×2 grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total Events', value: String(events.length) },
            { label: 'Accepted', value: `${accepted} (${acceptanceRate}%)` },
            { label: 'Total Revenue', value: formatCurrency(totalRevenue) },
            { label: 'Net Profit', value: formatCurrency(totalNet) },
          ].map((stat) => (
            <View
              key={stat.label}
              style={{ flexBasis: '48%', flexGrow: 1 }}
              className="bg-white rounded-xl p-3.5 border border-stone-100"
            >
              <Text className="text-stone-400 text-xs">{stat.label}</Text>
              <Text className="font-bold text-stone-900 text-lg mt-1">{stat.value}</Text>
            </View>
          ))}
        </View>

        {/* Events */}
        <Text className="font-bold text-stone-900 mb-3">Events</Text>
        {events.length === 0 ? (
          <EmptyState icon="🎪" title="No events yet" description="No events linked to this company." />
        ) : (
          events.map((event) => <EventCard key={event.id} event={event} />)
        )}

        <View className="bg-white rounded-2xl p-4 border border-stone-100 mt-4">
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'Delete Company',
                `Delete "${company.name}"? Events linked to this company will remain but will be unlinked. This cannot be undone.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: handleDelete },
                ],
              )
            }
            className="border border-red-200 py-3 rounded-xl items-center"
          >
            <Text className="text-red-500 font-medium text-sm">Delete Company</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
