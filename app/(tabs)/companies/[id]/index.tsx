import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCompany } from '@/lib/queries/companies';
import { useEvents } from '@/lib/queries/events';
import { useDeleteCompany } from '@/lib/queries/companies';
import { EventCard } from '@/components/events/EventCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency, toISODateString } from '@/lib/formatters';
import { useTheme } from '@/lib/themeContext';
import { BackBar } from '@/components/shared/BackBar';
import { pushTrail } from '@/lib/navTrail';

export default function CompanyDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id, trail } = useLocalSearchParams<{ id: string; trail?: string }>();
  const router = useRouter();
  const { tokens } = useTheme();
  const p = tokens.palette;
  const { data: company, isLoading, refetch } = useCompany(id);
  const { data: allEvents } = useEvents({ companyId: id });
  const deleteCompany = useDeleteCompany();
  const [refreshing, setRefreshing] = useState(false);

  // Trail to pass forward when drilling into events from this company.
  const childTrail = useMemo(
    () => company
      ? pushTrail(trail, {
          label: company.name,
          pathname: '/(tabs)/companies/[id]',
          params: { id, trail: trail ?? '' },
        })
      : trail ?? '',
    [trail, company, id],
  );

  const today = toISODateString(new Date());
  const events = allEvents ?? [];

  const { upcomingEvents, completedEvents } = useMemo(() => {
    const upcoming = events
      .filter((e) => e.date >= today && e.status !== 'rejected' && e.status !== 'withdrawn')
      .sort((a, b) => a.date.localeCompare(b.date));
    const completed = events
      .filter((e) => e.date < today || e.status === 'rejected' || e.status === 'withdrawn')
      .sort((a, b) => b.calculations.netProfit - a.calculations.netProfit);
    return { upcomingEvents: upcoming, completedEvents: completed };
  }, [events, today]);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleDelete() {
    try {
      await deleteCompany.mutateAsync(id);
      router.back();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  if (isLoading) return <LoadingSpinner message="Loading company..." />;
  if (!company) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.bg }}>
      <Text style={{ color: p.textMuted }}>Company not found</Text>
    </View>
  );

  const totalRevenue = events.reduce((s, e) => s + (e.event_financials?.gross_sales ?? 0), 0);
  const totalNet = events.reduce((s, e) => {
    const hasSales =
      (e.event_financials?.gross_sales ?? 0) > 0 ||
      (e.event_financials?.standard_rated_sales ?? 0) > 0 ||
      (e.event_financials?.zero_rated_sales ?? 0) > 0;
    return hasSales ? s + e.calculations.netProfit : s;
  }, 0);
  const accepted = events.filter((e) => e.status === 'accepted').length;
  const decided = events.filter((e) => e.status === 'accepted' || e.status === 'rejected').length;
  const acceptanceRate = decided > 0 ? `${((accepted / decided) * 100).toFixed(0)}%` : '—';

  const hasContact = !!(company.contact_name || company.email || company.phone || company.website);

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      {/* Nav bar — back label and target come from the URL trail. */}
      <View style={{ borderBottomWidth: 2, borderBottomColor: p.text }}>
        <BackBar
          trail={trail}
          fallbackLabel="Companies"
          showCrumbs
          rightAction={
            <TouchableOpacity
              onPress={() => router.push({ pathname: `/(tabs)/companies/${id}/edit`, params: { trail: childTrail } })}
              style={{ borderWidth: 2, borderColor: p.text, paddingHorizontal: 14, paddingVertical: 5 }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.5, color: p.text }}>EDIT</Text>
            </TouchableOpacity>
          }
        />
      </View>

      {/* Company name heading */}
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: p.border }}>
        <Text style={{ fontFamily: tokens.type.display, fontSize: 28, letterSpacing: -0.5, color: p.text }}>{company.name}</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={p.brand} colors={[p.brand]} />}
      >
        {/* Stats — 2×2 grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'TOTAL EVENTS', value: String(events.length) },
            { label: 'ACCEPTED', value: `${accepted} (${acceptanceRate})` },
            { label: 'REVENUE', value: formatCurrency(totalRevenue) },
            { label: 'NET PROFIT', value: formatCurrency(totalNet) },
          ].map((stat) => (
            <View
              key={stat.label}
              style={{ flexBasis: '48%', flexGrow: 1, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 14 }}
            >
              <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1, color: p.textMuted, marginBottom: 6 }}>{stat.label}</Text>
              <Text style={{ fontFamily: tokens.type.display, fontSize: 22, color: p.text }}>{stat.value}</Text>
            </View>
          ))}
        </View>

        {/* Contact */}
        <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 16, marginBottom: 20 }}>
          <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: p.textMuted, marginBottom: 12 }}>CONTACT</Text>
          {hasContact ? (
            <>
              {company.contact_name && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ fontSize: 12, color: p.textMuted, width: 16 }}>✦</Text>
                  <Text style={{ fontSize: 14, color: p.text, marginLeft: 8 }}>{company.contact_name}</Text>
                </View>
              )}
              {company.email && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`mailto:${company.email}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
                >
                  <Text style={{ fontSize: 12, color: p.textMuted, width: 16 }}>@</Text>
                  <Text style={{ fontSize: 14, color: p.brand, marginLeft: 8 }}>{company.email}</Text>
                </TouchableOpacity>
              )}
              {company.phone && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${company.phone}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
                >
                  <Text style={{ fontSize: 12, color: p.textMuted, width: 16 }}>☏</Text>
                  <Text style={{ fontSize: 14, color: p.brand, marginLeft: 8 }}>{company.phone}</Text>
                </TouchableOpacity>
              )}
              {company.website && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(company.website!)}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 12, color: p.textMuted, width: 16 }}>⊕</Text>
                  <Text style={{ fontSize: 14, color: p.brand, marginLeft: 8 }}>{company.website}</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={{ fontSize: 13, color: p.textFaint }}>No contact details added</Text>
          )}
          {company.notes && (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: p.border, borderStyle: 'dashed' }}>
              <Text style={{ fontSize: 13, color: p.textMuted, lineHeight: 20 }}>{company.notes}</Text>
            </View>
          )}
        </View>

        {/* Events */}
        {events.length === 0 ? (
          <EmptyState icon="🎪" title="No events yet" description="No events linked to this company." />
        ) : (
          <>
            {upcomingEvents.length > 0 && (
              <>
                <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: p.textMuted, marginBottom: 12 }}>UPCOMING</Text>
                {upcomingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onPress={() => router.push({ pathname: `/(tabs)/events/${event.id}`, params: { companyName: company.name, trail: childTrail } })}
                  />
                ))}
                <View style={{ height: 20 }} />
              </>
            )}
            {completedEvents.length > 0 && (
              <>
                <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: p.textMuted, marginBottom: 12 }}>
                  {completedEvents.length === 1 ? 'PAST & DECIDED' : `PAST & DECIDED · RANKED BY NET PROFIT`}
                </Text>
                {completedEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onPress={() => router.push({ pathname: `/(tabs)/events/${event.id}`, params: { companyName: company.name, trail: childTrail } })}
                  />
                ))}
              </>
            )}
          </>
        )}

        {/* Delete */}
        <View style={{ marginTop: 24, borderWidth: 1, borderColor: p.border, borderStyle: 'dashed' }}>
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
            style={{ padding: 16, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 13, color: '#dc2626', fontWeight: '600', letterSpacing: 0.5 }}>DELETE COMPANY</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
