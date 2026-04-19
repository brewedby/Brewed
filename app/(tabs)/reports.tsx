import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Share, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useReports } from '@/lib/queries/reports';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EventStatusBadge } from '@/components/shared/EventStatusBadge';
import { formatCurrency, formatPercent, formatDate } from '@/lib/formatters';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
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

    // Export all events for the year from companyPerformance + topEvents combined, de-duped
    const allReportEvents = data.topEvents;
    const rows = allReportEvents.map((e) => [
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
      await Share.share({ message: csv, title: `Brewed by Boon - ${year} Report` });
    } catch {
      Alert.alert('Error', 'Could not export report');
    }
  }

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      <View className="bg-white px-4 pt-2 pb-3 border-b border-stone-100">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-bold text-stone-900">Reports</Text>
          <TouchableOpacity
            onPress={handleExport}
            accessibilityRole="button"
            accessibilityLabel="Export report as CSV"
            className="border border-amber-300 px-3 py-1.5 rounded-xl"
          >
            <Text className="text-amber-700 font-medium text-sm">Export CSV</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row gap-2" accessibilityRole="radiogroup">
          {YEARS.map((y) => (
            <TouchableOpacity
              key={y}
              onPress={() => setYear(y)}
              accessibilityRole="radio"
              accessibilityLabel={`Show reports for ${y}`}
              accessibilityState={{ selected: year === y }}
              className={`px-4 py-1.5 rounded-full ${year === y ? 'bg-amber-700' : 'bg-stone-100'}`}
            >
              <Text className={`text-sm font-medium ${year === y ? 'text-white' : 'text-stone-600'}`}>{y}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <LoadingSpinner message="Loading report..." />
      ) : !data || data.totalEvents === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-5xl mb-3">📊</Text>
          <Text className="text-stone-600 font-semibold">No data for {year}</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#f59e0b" />}
        >
          {/* Annual summary */}
          <View className="flex-row flex-wrap gap-3 mb-4">
            {[
              { label: 'Total Revenue', value: formatCurrency(data.totalGross), color: 'text-amber-700' },
              { label: 'Total Net Profit', value: formatCurrency(data.totalNet), color: data.totalNet >= 0 ? 'text-green-700' : 'text-red-600' },
              { label: 'Events', value: String(data.totalEvents), color: 'text-stone-900' },
              { label: 'Avg Margin', value: formatPercent(data.avgMargin), color: data.avgMargin >= 0 ? 'text-green-700' : 'text-red-600' },
            ].map((s) => (
              <View key={s.label} className="bg-white rounded-xl p-3 border border-stone-100 min-w-[45%] flex-1">
                <Text className={`text-lg font-bold ${s.color}`}>{s.value}</Text>
                <Text className="text-stone-400 text-xs mt-0.5">{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Monthly breakdown */}
          <View className="bg-white rounded-2xl border border-stone-100 mb-4 overflow-hidden">
            <Text className="font-bold text-stone-900 px-4 pt-4 pb-2">Monthly Breakdown</Text>
            <View className="flex-row px-4 pb-2 border-b border-stone-100">
              {['Month', 'Events', 'Gross', 'Net', 'Margin'].map((h) => (
                <Text key={h} className="text-stone-400 text-xs font-medium flex-1 text-right first:text-left">{h}</Text>
              ))}
            </View>
            {data.monthly.filter((m) => m.eventCount > 0).map((m) => (
              <View key={m.month} className="flex-row px-4 py-2.5 border-b border-stone-50">
                <Text className="text-stone-700 text-xs font-medium flex-1">{m.monthLabel}</Text>
                <Text className="text-stone-600 text-xs flex-1 text-right">{m.eventCount}</Text>
                <Text className="text-stone-700 text-xs flex-1 text-right font-medium">£{m.grossSales.toFixed(0)}</Text>
                <Text className={`text-xs flex-1 text-right font-medium ${m.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  £{m.netProfit.toFixed(0)}
                </Text>
                <Text className={`text-xs flex-1 text-right ${m.profitMargin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {m.profitMargin.toFixed(0)}%
                </Text>
              </View>
            ))}
          </View>

          {/* Top events */}
          {data.topEvents.length > 0 && (
            <View className="mb-4">
              <Text className="font-bold text-stone-900 mb-3">Top Events by Net Profit</Text>
              {data.topEvents.slice(0, 5).map((event, i) => (
                <TouchableOpacity
                  key={event.id}
                  onPress={() => router.push(`/(tabs)/events/${event.id}`)}
                  className="bg-white rounded-xl p-3.5 mb-2 border border-stone-100 flex-row items-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-stone-400 text-sm font-bold w-6">{i + 1}</Text>
                  <View className="flex-1 mx-3">
                    <Text className="font-medium text-stone-900 text-sm" numberOfLines={1}>{event.name}</Text>
                    <Text className="text-stone-400 text-xs mt-0.5">{formatDate(event.date)}</Text>
                  </View>
                  <View className="items-end">
                    <Text className={`font-bold text-sm ${event.calculations.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {formatCurrency(event.calculations.netProfit)}
                    </Text>
                    <Text className="text-stone-400 text-xs">{formatCurrency(event.event_financials?.gross_sales ?? 0)} gross</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Company performance */}
          {data.companyPerformance.length > 0 && (
            <View className="mb-4">
              <Text className="font-bold text-stone-900 mb-3">Company Performance</Text>
              <View className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
                {data.companyPerformance.map((cp, i) => (
                  <TouchableOpacity
                    key={cp.company.id}
                    onPress={() => router.push(`/(tabs)/companies/${cp.company.id}`)}
                    className={`px-4 py-3.5 flex-row items-center ${i < data.companyPerformance.length - 1 ? 'border-b border-stone-50' : ''}`}
                  >
                    <View className="flex-1">
                      <Text className="font-medium text-stone-900 text-sm">{cp.company.name}</Text>
                      <Text className="text-stone-400 text-xs mt-0.5">
                        {cp.totalEvents} events · {cp.acceptedEvents} accepted
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-semibold text-stone-900 text-sm">{formatCurrency(cp.totalRevenue)}</Text>
                      <Text className="text-stone-400 text-xs">
                        {cp.acceptanceRate.toFixed(0)}% acceptance
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}
