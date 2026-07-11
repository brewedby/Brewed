import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCompanies } from '@/lib/queries/companies';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { QueryError } from '@/components/shared/QueryError';
import { FarMasthead } from '@/components/far/Masthead';
import { FarSectionRule } from '@/components/far/SectionRule';
import { useTheme } from '@/lib/themeContext';
import { TONE, netMarginTone } from '@/lib/theme';
import { formatDate } from '@/lib/formatters';
import { encodeTrail } from '@/lib/navTrail';
import type { CompanyWithStats } from '@/types';

const COMPANIES_TRAIL = encodeTrail([
  { label: 'Companies', pathname: '/(tabs)/companies' },
]);

function companyScore(c: CompanyWithStats): number {
  if (c.completedEventCount === 0 || c.avgProfitMargin == null) return -Infinity;
  const marginFactor = Math.max(0, c.avgProfitMargin);
  const revenueFactor = Math.log10(1 + c.totalRevenue);
  const reliabilityFactor = Math.log10(1 + c.completedEventCount);
  return marginFactor * revenueFactor * reliabilityFactor;
}

// Net-margin colouring goes through the central helper in lib/theme
// (20/0 thresholds) so Companies always matches event financials.

export default function CompaniesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tokens, isDark } = useTheme();
  const p = tokens.palette;
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

  const count = companies?.length ?? 0;

  const AddButton = (
    <TouchableOpacity
      onPress={() => router.push('/(tabs)/companies/new')}
      accessibilityRole="button"
      accessibilityLabel="Add new company"
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 4,
        borderWidth: 1, borderColor: p.text,
        paddingHorizontal: 10, paddingVertical: 4, minHeight: 32,
      }}
    >
      <Ionicons name="add" size={11} color={p.text} />
      <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: p.text }}>{'ADD'}</Text>
    </TouchableOpacity>
  );

  const TopPerformers = rankedCompanies.length >= 2 ? (
    <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <Ionicons name="trophy-outline" size={16} color={p.brand} />
        <Text style={{ fontFamily: tokens.type.display, fontSize: 18, color: p.text }}>Top performers</Text>
        <Text style={{ fontSize: 10, color: p.textMuted, letterSpacing: 1 }}>{'MARGIN · VOLUME · RELIABILITY'}</Text>
      </View>
      {rankedCompanies.map((c, i) => (
        <TouchableOpacity
          key={c.id}
          onPress={() => router.push({ pathname: `/(tabs)/companies/${c.id}`, params: { trail: COMPANIES_TRAIL } })}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${c.name}, ${(c.avgProfitMargin ?? 0).toFixed(0)}% average margin`}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            paddingVertical: 10,
            borderBottomWidth: 1, borderBottomColor: p.border,
          }}
        >
          <View style={{
            width: 28, height: 28,
            borderRadius: 14,
            borderWidth: 1.5, borderColor: p.brand,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontFamily: tokens.type.display, fontSize: 14, color: p.brand }}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: tokens.type.display, fontSize: 17, lineHeight: 20, color: p.text }}>{c.name}</Text>
            <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic', marginTop: 2 }}>
              {c.completedEventCount} events · £{c.totalRevenue >= 1000 ? `${(c.totalRevenue / 1000).toFixed(1)}k` : c.totalRevenue.toFixed(0)} revenue
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: tokens.type.display, fontSize: 22, color: netMarginTone(c.avgProfitMargin, isDark), fontVariant: ['tabular-nums'] }}>
              {(c.avgProfitMargin ?? 0).toFixed(0)}%
            </Text>
            <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1 }}>{'AVG MARGIN'}</Text>
          </View>
        </TouchableOpacity>
      ))}
      <View style={{ paddingTop: 20, paddingBottom: 4 }}>
        <FarSectionRule label="All organisers" />
      </View>
    </View>
  ) : (
    <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 }}>
      <FarSectionRule label="All organisers" />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <FarMasthead
        eyebrow={`The Roster · ${count} on file`}
        title="Companies"
        sub="Trading history with every organiser."
        right={AddButton}
      />

      {isLoading ? (
        <LoadingSpinner message="Loading companies..." />
      ) : isError ? (
        <QueryError error={error} onRetry={refetch} message="Couldn't load companies" />
      ) : (
        <FlatList
          data={companies ?? []}
          keyExtractor={(item) => item.id}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          style={{ flex: 1 }}
          ListHeaderComponent={TopPerformers}
          ListFooterComponent={<View style={{ height: 40 }} />}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          ListEmptyComponent={
            <View style={{ paddingTop: 20 }}>
              <EmptyState
                icon="🏢"
                title="No companies yet"
                description="Add concessions companies you apply to for events."
                action={{ label: '+ Add Company', onPress: () => router.push('/(tabs)/companies/new') }}
              />
            </View>
          }
          renderItem={({ item: company }) => (
            <TouchableOpacity
              onPress={() => router.push({ pathname: `/(tabs)/companies/${company.id}`, params: { trail: COMPANIES_TRAIL } })}
              accessibilityRole="button"
              accessibilityLabel={`Open company ${company.name}`}
              activeOpacity={0.7}
              style={{
                borderWidth: 1, borderColor: p.borderStrong,
                backgroundColor: p.surface,
                padding: 14, marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontFamily: tokens.type.display, fontSize: 20, letterSpacing: -0.4, lineHeight: 24, color: p.text }}>
                    {company.name}
                  </Text>
                  {company.lastEventDate && (
                    <Text style={{ fontSize: 10, color: p.textMuted, letterSpacing: 1, marginTop: 3 }}>
                      {'LAST EVENT · ' + formatDate(company.lastEventDate).toUpperCase()}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={p.textFaint} />
              </View>

              <View style={{
                flexDirection: 'row',
                paddingTop: 10,
                borderTopWidth: 1, borderTopColor: p.border,
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1, fontWeight: '600' }}>{'EVENTS'}</Text>
                  <Text style={{ fontFamily: tokens.type.display, fontSize: 18, marginTop: 2, fontVariant: ['tabular-nums'], color: p.text }}>
                    {company.totalEvents}
                  </Text>
                  {company.acceptedEvents > 0 && (
                    <Text style={{ fontSize: 10, color: TONE.good, marginTop: 1 }}>{company.acceptedEvents} accepted</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1, fontWeight: '600' }}>{'AVG MARGIN'}</Text>
                  {company.completedEventCount > 0 ? (
                    <Text style={{ fontFamily: tokens.type.display, fontSize: 18, marginTop: 2, color: netMarginTone(company.avgProfitMargin, isDark), fontVariant: ['tabular-nums'] }}>
                      {(company.avgProfitMargin ?? 0).toFixed(0)}%
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 12, color: p.textFaint, fontStyle: 'italic', marginTop: 4 }}>No data</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1, fontWeight: '600' }}>{'REVENUE'}</Text>
                  {company.totalRevenue > 0 ? (
                    <Text style={{ fontFamily: tokens.type.display, fontSize: 18, marginTop: 2, fontVariant: ['tabular-nums'], color: p.text }}>
                      £{company.totalRevenue >= 1000 ? `${(company.totalRevenue / 1000).toFixed(1)}k` : company.totalRevenue.toFixed(0)}
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 12, color: p.textFaint, fontStyle: 'italic', marginTop: 4 }}>—</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
