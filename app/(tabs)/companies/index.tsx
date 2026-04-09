import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCompanies } from '@/lib/queries/companies';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatCurrency, formatDate } from '@/lib/formatters';

export default function CompaniesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: companies, isLoading, refetch } = useCompanies();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      <View className="px-4 pt-2 pb-3 bg-white border-b border-stone-100">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-stone-900">Companies</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/companies/new')}
            className="bg-amber-700 px-4 py-2 rounded-xl"
          >
            <Text className="text-white font-semibold text-sm">+ Add Company</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <LoadingSpinner message="Loading companies..." />
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />}
        >
          {!companies || companies.length === 0 ? (
            <EmptyState
              icon="🏢"
              title="No companies yet"
              description="Add concessions companies you apply to for events."
              action={{ label: '+ Add Company', onPress: () => router.push('/(tabs)/companies/new') }}
            />
          ) : (
            companies.map((company) => (
              <TouchableOpacity
                key={company.id}
                onPress={() => router.push(`/(tabs)/companies/${company.id}`)}
                className="bg-white rounded-2xl p-4 mb-3 border border-stone-100 shadow-sm"
                activeOpacity={0.7}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="font-semibold text-stone-900 text-base">{company.name}</Text>
                    {company.contact_name && (
                      <Text className="text-stone-500 text-sm mt-0.5">👤 {company.contact_name}</Text>
                    )}
                    {company.email && (
                      <Text className="text-stone-400 text-xs mt-0.5">✉️ {company.email}</Text>
                    )}
                  </View>
                  <View className="items-end">
                    <View className="bg-amber-50 px-2.5 py-1 rounded-full">
                      <Text className="text-amber-800 text-xs font-medium">{company.totalEvents} events</Text>
                    </View>
                    {company.acceptedEvents > 0 && (
                      <Text className="text-green-600 text-xs mt-1 font-medium">{company.acceptedEvents} accepted</Text>
                    )}
                  </View>
                </View>

                {company.totalRevenue > 0 && (
                  <View className="flex-row mt-3 pt-3 border-t border-stone-100 gap-4">
                    <View>
                      <Text className="text-stone-400 text-xs">Total Revenue</Text>
                      <Text className="font-semibold text-stone-900 text-sm">{formatCurrency(company.totalRevenue)}</Text>
                    </View>
                    {company.lastEventDate && (
                      <View>
                        <Text className="text-stone-400 text-xs">Last Event</Text>
                        <Text className="font-semibold text-stone-700 text-sm">{formatDate(company.lastEventDate)}</Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}
