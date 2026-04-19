import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCompanies } from '@/lib/queries/companies';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { QueryError } from '@/components/shared/QueryError';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { CompanyWithStats } from '@/types';

function companyScore(c: CompanyWithStats): number {
  if (c.completedEventCount === 0 || c.avgProfitMargin == null) return -Infinity;
  const marginFactor = Math.max(0, c.avgProfitMargin);
  const revenueFactor = Math.log10(1 + c.totalRevenue);
  const reliabilityFactor = Math.log10(1 + c.completedEventCount);
  return marginFactor * revenueFactor * reliabilityFactor;
}

export default function CompaniesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: companies, isLoading, isError, error, refetch } = useCompanies();
  const [refreshing, setRefreshing] = useState(false);

  const rankedCompanies = useMemo(() => {
    if (!companies) return [];
    return [...companies]
      .filter((c) => c.completedEventCount > 0 && c.avgProfitMargin != null)
      .sort((a, b) => companyScore(b) - companyScore(a))
      .slice(0, 3);
  }, [companies]);

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
            accessibilityRole="button"
            accessibilityLabel="Add new company"
            className="bg-amber-700 px-4 py-2 rounded-xl"
          >
            <Text className="text-white font-semibold text-sm">+ Add Company</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <LoadingSpinner message="Loading companies..." />
      ) : isError ? (
        <QueryError error={error} onRetry={refetch} message="Couldn't load companies" />
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#f59e0b" colors={['#f59e0b']} />}
        >
          {!companies || companies.length === 0 ? (
            <EmptyState
              icon="🏢"
              title="No companies yet"
              description="Add concessions companies you apply to for events."
              action={{ label: '+ Add Company', onPress: () => router.push('/(tabs)/companies/new') }}
            />
          ) : (
            <>
            {rankedCompanies.length >= 2 && (
              <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f5f5f4', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1c1917' }}>Top Performers</Text>
                  <Text style={{ fontSize: 11, color: '#a8a29e', fontWeight: '500' }}>margin · volume · reliability</Text>
                </View>
                {rankedCompanies.map((c, i) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const isFirst = i === 0;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => router.push(`/(tabs)/companies/${c.id}`)}
                      activeOpacity={0.7}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
                        borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#fafaf9', gap: 12 }}
                    >
                      <Text style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{medals[i]}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: isFirst ? '700' : '600', color: '#1c1917' }} numberOfLines={1}>{c.name}</Text>
                        <Text style={{ fontSize: 11, color: '#a8a29e', marginTop: 1 }}>
                          {c.completedEventCount} event{c.completedEventCount !== 1 ? 's' : ''} · £{c.totalRevenue >= 1000 ? `${(c.totalRevenue / 1000).toFixed(1)}k` : c.totalRevenue.toFixed(0)} revenue
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: (c.avgProfitMargin ?? 0) >= 25 ? '#16a34a' : (c.avgProfitMargin ?? 0) >= 10 ? '#b45309' : '#dc2626' }}>
                          {(c.avgProfitMargin ?? 0).toFixed(0)}%
                        </Text>
                        <Text style={{ fontSize: 10, color: '#a8a29e' }}>avg margin</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {companies.map((company) => (
              <TouchableOpacity
                key={company.id}
                onPress={() => router.push(`/(tabs)/companies/${company.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Open company ${company.name}`}
                className="bg-white rounded-2xl p-4 mb-3 border border-stone-100"
                activeOpacity={0.7}
                style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="font-semibold text-stone-900 text-base">{company.name}</Text>
                    {company.contact_name && (
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="person-outline" size={12} color="#78716c" />
                        <Text className="text-stone-500 text-sm ml-1.5">{company.contact_name}</Text>
                      </View>
                    )}
                    {company.email && (
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="mail-outline" size={11} color="#a8a29e" />
                        <Text className="text-stone-400 text-xs ml-1.5">{company.email}</Text>
                      </View>
                    )}
                  </View>
                  <View className="items-end">
                    <View className="bg-amber-50 px-2.5 py-1 rounded-full">
                      <Text className="text-amber-800 text-xs font-medium">{company.totalEvents} events</Text>
                    </View>
                    {company.acceptedEvents > 0 && (
                      <Text className="text-green-600 text-xs mt-1 font-medium">{company.acceptedEvents} accepted</Text>
                    )}
                    {/* Margin badge */}
                    {company.completedEventCount > 0 ? (
                      <View style={{
                        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
                        backgroundColor: (company.avgProfitMargin ?? 0) >= 25 ? '#dcfce7' : (company.avgProfitMargin ?? 0) >= 10 ? '#fef9c3' : '#fee2e2',
                        marginTop: 4,
                      }}>
                        <Text style={{
                          fontSize: 11, fontWeight: '600',
                          color: (company.avgProfitMargin ?? 0) >= 25 ? '#166534' : (company.avgProfitMargin ?? 0) >= 10 ? '#854d0e' : '#991b1b',
                        }}>
                          {(company.avgProfitMargin ?? 0).toFixed(0)}% avg margin
                        </Text>
                      </View>
                    ) : (
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: '#f5f5f4', marginTop: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#78716c' }}>No data</Text>
                      </View>
                    )}
                    {company.completedEventCount > 0 && <Text className="text-stone-400 text-xs mt-1">Avg across {company.completedEventCount} event{company.completedEventCount !== 1 ? 's' : ''}</Text>}
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
            ))}
            </>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}
