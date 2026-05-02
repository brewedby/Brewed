import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Share, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useReports } from '@/lib/queries/reports';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/queries/profile';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { FarMasthead } from '@/components/far/Masthead';
import { FarSectionRule } from '@/components/far/SectionRule';
import { useTheme } from '@/lib/themeContext';
import { TONE } from '@/lib/theme';
import { formatDate } from '@/lib/formatters';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tokens } = useTheme();
  const p = tokens.palette;
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, refetch } = useReports(year);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleExport() {
    if (!data) return;
    const header = 'Event,Date,End Date,Location,Company,Status,Gross Sales,Cost of Goods,Pitch Fee,Power Fee,Travel,Camping,Equipment,Other,Staffing,Net Profit,Margin%\n';
    const rows = data.topEvents.map((e) => [
      `"${e.name.replace(/"/g, '""')}"`,
      e.date,
      e.end_date ?? '',
      `"${e.location.replace(/"/g, '""')}"`,
      `"${(e.concessions_companies?.name ?? '').replace(/"/g, '""')}"`,
      e.status,
      e.event_financials?.gross_sales ?? 0,
      e.event_financials?.cost_of_goods ?? 0,
      e.event_financials?.pitch_fee ?? 0,
      e.event_financials?.power_fee ?? 0,
      e.event_financials?.travel_costs ?? 0,
      e.event_financials?.camping_costs ?? 0,
      e.event_financials?.equipment_costs ?? 0,
      e.event_financials?.other_costs ?? 0,
      e.event_financials?.staffing_costs ?? 0,
      e.calculations.netProfit.toFixed(2),
      e.calculations.profitMargin.toFixed(1),
    ].join(',')).join('\n');
    const csv = header + rows;
    try {
      await Share.share({ message: csv, title: `${profile?.business_name ?? 'My Business'} - ${year} Report` });
    } catch {
      Alert.alert('Error', 'Could not export report');
    }
  }

  const ExportButton = (
    <TouchableOpacity
      onPress={handleExport}
      accessibilityRole="button"
      accessibilityLabel="Export report as CSV"
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 4,
        borderWidth: 1, borderColor: p.text,
        paddingHorizontal: 10, paddingVertical: 4, minHeight: 32,
      }}
    >
      <Ionicons name="document-outline" size={11} color={p.text} />
      <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: p.text }}>{'EXPORT'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <FarMasthead
        eyebrow="The year in numbers"
        title="Reports"
        sub="Yearly P&L, your top events, exportable for the accountant."
        right={ExportButton}
      />

      {isLoading ? (
        <LoadingSpinner message="Loading report..." />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={p.brand} />}
        >
          <View style={{ padding: 20, gap: 20 }}>

            {/* Year selector */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {YEARS.map((y) => {
                const active = year === y;
                return (
                  <TouchableOpacity
                    key={y}
                    onPress={() => setYear(y)}
                    accessibilityRole="radio"
                    accessibilityLabel={`Show reports for ${y}`}
                    accessibilityState={{ selected: active }}
                    style={{
                      paddingHorizontal: 10, paddingVertical: 4,
                      borderWidth: 1,
                      backgroundColor: active ? p.text : 'transparent',
                      borderColor: active ? p.text : p.borderStrong,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: active ? p.bg : p.textMuted }}>
                      {String(y)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {!data || data.totalEvents === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={{ fontFamily: tokens.type.display, fontSize: 24, color: p.textMuted }}>No data for {year}</Text>
                <Text style={{ fontSize: 12, color: p.textFaint, fontStyle: 'italic', marginTop: 6 }}>Add events and trading financials to see your report.</Text>
              </View>
            ) : (
              <>
                {/* Big P&L */}
                <View>
                  <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 2, fontWeight: '700' }}>
                    {'NET P&L ' + year}
                  </Text>
                  <Text style={{
                    fontFamily: tokens.type.display, fontSize: 56, lineHeight: 60,
                    letterSpacing: -1.5,
                    color: data.totalNet >= 0 ? TONE.good : TONE.bad,
                    fontVariant: ['tabular-nums'],
                  }}>
                    {data.totalNet < 0 ? '−' : ''}£{Math.abs(data.totalNet).toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                  </Text>
                  {data.avgMargin !== 0 && (
                    <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic', marginTop: 4 }}>
                      Avg margin {data.avgMargin.toFixed(0)}% across {data.totalEvents} event{data.totalEvents !== 1 ? 's' : ''}.
                    </Text>
                  )}
                </View>

                <FarSectionRule label="P&L breakdown" />

                {/* P&L rows */}
                <View style={{ gap: 0 }}>
                  {[
                    { l: 'Gross sales',    v: data.totalGross,                              bold: true },
                    { l: 'Net profit',     v: data.totalNet,                                bold: true, hero: true },
                  ].map((r, i) => (
                    <View key={r.l} style={{
                      flexDirection: 'row', justifyContent: 'space-between',
                      paddingVertical: r.hero ? 10 : 6,
                      borderTopWidth: r.hero ? 2 : i > 0 ? 1 : 0,
                      borderTopColor: r.hero ? p.text : p.border,
                    }}>
                      <Text style={{
                        fontSize: r.bold ? 14 : 12, fontWeight: r.bold ? '600' : '400',
                        fontFamily: r.hero ? tokens.type.display : tokens.type.text,
                        color: r.bold ? p.text : p.textMuted,
                      }}>{r.l}</Text>
                      <Text style={{
                        fontFamily: r.hero ? tokens.type.display : tokens.type.mono,
                        fontSize: r.hero ? 20 : r.bold ? 14 : 13,
                        fontWeight: r.bold ? '700' : '400',
                        color: r.v < 0 ? TONE.bad : r.bold ? p.text : p.textMuted,
                        fontVariant: ['tabular-nums'],
                      }}>
                        {r.v < 0 ? '−' : ''}£{Math.abs(r.v).toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Monthly breakdown */}
                {data.monthly.some((m) => m.eventCount > 0) && (
                  <>
                    <FarSectionRule label="Monthly" />
                    <View style={{ borderWidth: 1, borderColor: p.borderStrong, overflow: 'hidden' }}>
                      {/* Header */}
                      <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: p.borderStrong, backgroundColor: p.surfaceAlt }}>
                        <Text style={{ flex: 1, fontSize: 9, color: p.textMuted, fontWeight: '700', letterSpacing: 1 }}>{'MONTH'}</Text>
                        <Text style={{ width: 44, fontSize: 9, color: p.textMuted, fontWeight: '700', letterSpacing: 1, textAlign: 'right' }}>{'EVT'}</Text>
                        <Text style={{ width: 70, fontSize: 9, color: p.textMuted, fontWeight: '700', letterSpacing: 1, textAlign: 'right' }}>{'GROSS'}</Text>
                        <Text style={{ width: 70, fontSize: 9, color: p.textMuted, fontWeight: '700', letterSpacing: 1, textAlign: 'right' }}>{'NET'}</Text>
                      </View>
                      {data.monthly.filter((m) => m.eventCount > 0).map((m, i, arr) => (
                        <View key={m.month} style={{
                          flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10,
                          borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                          borderBottomColor: p.border,
                          backgroundColor: i % 2 === 0 ? 'transparent' : p.surface,
                        }}>
                          <Text style={{ flex: 1, fontSize: 12, color: p.text }}>{m.monthLabel}</Text>
                          <Text style={{ width: 44, fontSize: 12, color: p.textMuted, textAlign: 'right', fontFamily: tokens.type.mono }}>{m.eventCount}</Text>
                          <Text style={{ width: 70, fontSize: 12, textAlign: 'right', fontFamily: tokens.type.mono, fontVariant: ['tabular-nums'], color: p.text }}>
                            £{m.grossSales.toFixed(0)}
                          </Text>
                          <Text style={{ width: 70, fontSize: 12, textAlign: 'right', fontFamily: tokens.type.mono, fontVariant: ['tabular-nums'], color: m.netProfit >= 0 ? TONE.good : TONE.bad }}>
                            {m.netProfit < 0 ? '−' : ''}£{Math.abs(m.netProfit).toFixed(0)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}

                {/* Top events */}
                {data.topEvents.length > 0 && (
                  <>
                    <FarSectionRule label="Top 5 events" />
                    <View style={{ gap: 12 }}>
                      {data.topEvents.slice(0, 5).map((event, i) => {
                        const maxGross = Math.max(...data.topEvents.slice(0, 5).map((e) => e.event_financials?.gross_sales ?? 0));
                        const gross = event.event_financials?.gross_sales ?? 0;
                        const barPct = maxGross > 0 ? gross / maxGross : 0;
                        return (
                          <TouchableOpacity
                            key={event.id}
                            onPress={() => router.push(`/(tabs)/events/${event.id}`)}
                            activeOpacity={0.7}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                              <Text style={{ fontFamily: tokens.type.display, fontSize: 15, flex: 1, lineHeight: 18 }} numberOfLines={1}>
                                <Text style={{ color: p.textMuted }}>{i + 1}. </Text>
                                {event.name}
                              </Text>
                              <Text style={{ fontFamily: tokens.type.mono, fontSize: 13, fontVariant: ['tabular-nums'], color: event.calculations.netProfit >= 0 ? TONE.good : TONE.bad }}>
                                {event.calculations.netProfit >= 0 ? '+' : '−'}£{Math.abs(event.calculations.netProfit).toFixed(0)}
                              </Text>
                            </View>
                            <View style={{ height: 6, marginTop: 4, backgroundColor: p.surfaceAlt, borderWidth: 1, borderColor: p.borderStrong }}>
                              <View style={{ width: `${barPct * 100}%`, height: '100%', backgroundColor: p.text }} />
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                              <Text style={{ fontSize: 10, color: p.textMuted, fontStyle: 'italic' }}>
                                {event.concessions_companies?.name ?? ''} · {formatDate(event.date)}
                              </Text>
                              <Text style={{ fontSize: 10, color: p.textMuted, fontFamily: tokens.type.mono }}>
                                gross £{gross.toFixed(0)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                {/* Company performance */}
                {data.companyPerformance.length > 0 && (
                  <>
                    <FarSectionRule label="By company" />
                    <View style={{ gap: 0 }}>
                      {data.companyPerformance.map((cp, i) => (
                        <TouchableOpacity
                          key={cp.company.id}
                          onPress={() => router.push(`/(tabs)/companies/${cp.company.id}`)}
                          activeOpacity={0.7}
                          style={{
                            flexDirection: 'row', alignItems: 'center',
                            paddingVertical: 12,
                            borderBottomWidth: 1, borderBottomColor: p.border,
                            borderTopWidth: i === 0 ? 1 : 0, borderTopColor: p.border,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: tokens.type.display, fontSize: 16 }}>{cp.company.name}</Text>
                            <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic', marginTop: 1 }}>
                              {cp.totalEvents} events · {cp.acceptedEvents} accepted · {cp.acceptanceRate.toFixed(0)}% acceptance
                            </Text>
                          </View>
                          <Text style={{ fontFamily: tokens.type.mono, fontSize: 14, fontVariant: ['tabular-nums'], color: p.text }}>
                            £{cp.totalRevenue.toFixed(0)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}
