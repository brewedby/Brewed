import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCompany } from '@/lib/queries/companies';
import { useEvents, useDeleteEvent } from '@/lib/queries/events';
import { useDeleteCompany } from '@/lib/queries/companies';
import { EventCard } from '@/components/events/EventCard';
import { ConfirmSheet } from '@/components/shared/ConfirmSheet';
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
  const [showDelete, setShowDelete] = useState(false);

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
          <TouchableOpacity onPress={() => router.back()} className="p-1">
            <Text className="text-amber-600 text-base">‹ Companies</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/(tabs)/companies/${id}/edit`)}
            className="bg-amber-700 px-4 py-1.5 rounded-xl"
          >
            <Text className="text-white font-semibold text-sm">Edit</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-xl font-bold text-stone-900">{company.name}</Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />}
      >
        {/* Contact card */}
        <View className="bg-white rounded-2xl p-4 border border-stone-100 mb-4">
          <Text className="font-bold text-stone-900 mb-3">Contact</Text>
          {company.contact_name && <Text className="text-stone-700 text-sm mb-1">👤 {company.contact_name}</Text>}
          {company.email && (
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${company.email}`)}>
              <Text className="text-amber-700 text-sm mb-1">✉️ {company.email}</Text>
            </TouchableOpacity>
          )}
          {company.phone && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${company.phone}`)}>
              <Text className="text-amber-700 text-sm mb-1">📞 {company.phone}</Text>
            </TouchableOpacity>
          )}
          {company.website && (
            <TouchableOpacity onPress={() => Linking.openURL(company.website!)}>
              <Text className="text-amber-700 text-sm">🌐 {company.website}</Text>
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

        {/* Stats */}
        <View className="flex-row gap-3 mb-4">
          {[
            { label: 'Total Events', value: String(events.length) },
            { label: 'Accepted', value: `${accepted} (${acceptanceRate}%)` },
            { label: 'Total Revenue', value: formatCurrency(totalRevenue) },
            { label: 'Net Profit', value: formatCurrency(totalNet) },
          ].map((stat) => (
            <View key={stat.label} className="flex-1 bg-white rounded-xl p-3 border border-stone-100 items-center">
              <Text className="font-bold text-stone-900 text-base">{stat.value}</Text>
              <Text className="text-stone-400 text-xs mt-0.5 text-center">{stat.label}</Text>
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

        {/* Danger zone */}
        <View className="bg-white rounded-2xl p-4 border border-red-100 mt-4">
          <Text className="font-semibold text-stone-700 mb-3">Danger Zone</Text>
          <TouchableOpacity
            onPress={() => setShowDelete(true)}
            className="border border-red-300 py-3 rounded-xl items-center"
          >
            <Text className="text-red-600 font-medium">Delete Company</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ConfirmSheet
        visible={showDelete}
        title="Delete Company"
        message={`Delete "${company.name}"? Events linked to this company will remain but will be unlinked.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </View>
  );
}
