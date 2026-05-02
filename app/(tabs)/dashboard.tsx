import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDashboard } from '@/lib/queries/dashboard';
import { formatCurrencyCompact, formatCurrency, formatDateRange } from '@/lib/formatters';
import { QuickSalesSheet } from '@/components/dashboard/QuickSalesSheet';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { QueryError } from '@/components/shared/QueryError';
import { ProductCatalogScreen } from '@/components/cogs/ProductCatalogScreen';
import { FarMasthead } from '@/components/far/Masthead';
import { FarSectionRule } from '@/components/far/SectionRule';
import { FarStamp } from '@/components/far/Stamp';
import { FarDivider } from '@/components/far/Divider';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/queries/profile';
import { useTheme } from '@/lib/themeContext';
import { TONE } from '@/lib/theme';
import type { UnitWithStatus } from '@/types';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TODAY = new Date();
const ISSUE_NUMBER = String(TODAY.getMonth() + 1).padStart(2, '0');
const TODAY_LABEL = TODAY.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

function YearPickerModal({ visible, current, onSelect, onClose }: {
  visible: boolean; current: number;
  onSelect: (y: number) => void; onClose: () => void;
}) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}
        onPress={onClose}
      >
        <View style={{
          backgroundColor: p.surface, borderRadius: 4, overflow: 'hidden',
          width: 220, borderWidth: 1, borderColor: p.borderStrong,
        }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: p.text }}>
            <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 2, fontWeight: '600' }}>
              SELECT YEAR
            </Text>
          </View>
          {YEARS.map((y) => (
            <TouchableOpacity
              key={y}
              onPress={() => { onSelect(y); onClose(); }}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 20, paddingVertical: 14, minHeight: 44,
                backgroundColor: y === current ? p.brandSoft : 'transparent',
              }}
            >
              <Text style={{
                fontFamily: tokens.type.display,
                fontSize: 18,
                color: y === current ? p.brand : p.text,
              }}>
                {y}
              </Text>
              {y === current && <Ionicons name="checkmark" size={16} color={p.brand} />}
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tokens } = useTheme();
  const p = tokens.palette;
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFees, setShowFees] = useState(false);
  const [quickSalesOpen, setQuickSalesOpen] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const { data: stats, isLoading, isError, error, refetch } = useDashboard(year);

  const insights = useMemo<{ text: string; color: string }[]>(() => {
    if (!stats) return [];
    const result: { text: string; color: string }[] = [];

    const today = new Date();
    const alertedKeys = new Set<string>();
    stats.unitStatuses.forEach((u) => {
      [{ label: 'MOT', d: u.mot_date }, { label: 'Tax', d: u.tax_date }].forEach(({ label, d }) => {
        if (!d) return;
        const key = `${u.id}:${label}`;
        if (alertedKeys.has(key)) return;
        const days = Math.ceil((new Date(d).getTime() - today.getTime()) / 86400000);
        if (days < 0) {
          result.push({ text: `${u.name} ${label} expired`, color: TONE.bad });
          alertedKeys.add(key);
        } else if (days <= 30) {
          result.push({ text: `${u.name} ${label} due in ${days}d`, color: TONE.caution });
          alertedKeys.add(key);
        }
      });
    });
    return result;
  }, [stats]);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  // Monthly bars — derive max for scaling
  const maxMonthlyGross = useMemo(() => {
    if (!stats) return 0;
    return Math.max(0, ...stats.monthlyRevenue.map((m) => m.grossSales));
  }, [stats]);

  // Display business name (fallback)
  const businessName = profile?.business_name ?? 'My Business';

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <FarMasthead
        eyebrow={`Vol. ${year} · Issue ${ISSUE_NUMBER}`}
        title="Brewed"
        sub={`${businessName} · the trader's ledger`}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setShowCatalog(true)}
              accessibilityLabel="Open menu and product costs"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ minHeight: 32, justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 2, fontWeight: '600' }}>
                MENU
              </Text>
            </TouchableOpacity>
            <View style={{ width: 1, height: 12, backgroundColor: p.border }} />
            <TouchableOpacity
              onPress={() => setYearPickerOpen(true)}
              accessibilityLabel={`Year ${year}. Tap to change.`}
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                minHeight: 32, justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 11, color: p.text, letterSpacing: 1, fontWeight: '600' }}>
                {TODAY_LABEL.toUpperCase()}
              </Text>
              <Ionicons name="chevron-down" size={11} color={p.textMuted} />
            </TouchableOpacity>
          </View>
        }
      />

      <YearPickerModal
        visible={yearPickerOpen}
        current={year}
        onSelect={setYear}
        onClose={() => setYearPickerOpen(false)}
      />

      {isLoading ? (
        <LoadingSpinner message="Loading dashboard..." />
      ) : isError ? (
        <QueryError error={error} onRetry={refetch} message="Couldn't load dashboard" />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={p.brand} />}
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 18 }}>

            {/* Headline P&L */}
            <View>
              <Text style={{
                fontSize: 10, color: p.textMuted, letterSpacing: 1.5,
                marginBottom: 4, fontWeight: '600',
              }}>
                THE BOTTOM LINE
              </Text>
              <Text style={{
                fontFamily: tokens.type.display,
                fontWeight: tokens.type.displayWeight,
                fontSize: 64,
                lineHeight: 64,
                letterSpacing: -1.5,
                color: (stats?.netProfitYtd ?? 0) >= 0 ? TONE.good : TONE.bad,
                fontVariant: ['tabular-nums'],
              }}>
                {formatCurrencyCompact(stats?.netProfitYtd ?? 0)}
              </Text>
              <Text style={{
                fontSize: 12, color: p.textMuted, marginTop: 10,
                fontStyle: 'italic', lineHeight: 18,
              }}>
                {(stats?.netProfitYtd ?? 0) >= 0
                  ? 'Net profit for the year. The season is delivering.'
                  : 'Net loss for the year. Margin will improve as committed events come in.'}
              </Text>
            </View>

            {/* Insights — small alert lines */}
            {insights.length > 0 && (
              <View style={{ gap: 4 }}>
                {insights.map((ins, i) => (
                  <Text key={i} style={{ fontSize: 11, color: ins.color, fontStyle: 'italic' }}>
                    · {ins.text}
                  </Text>
                ))}
              </View>
            )}

            <FarSectionRule label="By the numbers" />

            {/* Two-column figures */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
              <KPI label="Gross sales" value={formatCurrencyCompact(stats?.grossSalesYtd ?? 0)} tokens={tokens} />
              <KPI label="Events traded" value={String(stats?.totalEventsYtd ?? 0)} tokens={tokens} />
              <KPI label="Avg take" value={formatCurrencyCompact(stats?.avgRevenuePerEvent ?? 0)} tokens={tokens} />
              <KPI label="Acceptance" value={`${(stats?.acceptanceRate ?? 0).toFixed(0)}%`} tokens={tokens} color={TONE.good} />
            </View>

            {/* Stamp + Committed Fees */}
            {stats && stats.committedFees > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <TouchableOpacity onPress={() => setShowFees((v) => !v)} activeOpacity={0.7}>
                  <FarStamp
                    primary={`${stats.upcomingCommitments.length} events committed`}
                    secondary={`${formatCurrencyCompact(stats.committedFees)} pitched`}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowFees((v) => !v)}
                  style={{ flex: 1, paddingVertical: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={showFees ? 'Hide commitment breakdown' : 'Show commitment breakdown'}
                >
                  <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic' }}>
                    {showFees ? 'Hide breakdown' : 'View breakdown →'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {showFees && stats && stats.upcomingCommitments.length > 0 && (
              <View style={{ paddingTop: 4 }}>
                {stats.upcomingCommitments.map((c, idx) => (
                  <View
                    key={c.id}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingVertical: 8,
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{
                        fontFamily: tokens.type.display,
                        fontSize: 15,
                        color: p.text,
                      }} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic', marginTop: 1 }}>
                        {formatDateRange(c.date, c.end_date)}
                      </Text>
                    </View>
                    <Text style={{
                      fontFamily: tokens.type.mono,
                      fontVariant: ['tabular-nums'],
                      fontSize: 13, fontWeight: '600', color: p.brand,
                    }}>
                      {formatCurrency(c.committedFee)}
                    </Text>
                    {idx < stats.upcomingCommitments.length - 1 && (
                      <FarDivider style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} />
                    )}
                  </View>
                ))}
              </View>
            )}

            <FarSectionRule label="Fleet" />

            {/* Fleet */}
            {stats && stats.unitStatuses.length > 0 ? (
              stats.unitStatuses.map((unit, i) => (
                <FleetRow key={unit.id} unit={unit} tokens={tokens} isLast={i === stats.unitStatuses.length - 1} />
              ))
            ) : (
              <Text style={{ fontSize: 12, color: p.textMuted, fontStyle: 'italic' }}>
                No fleet units yet. Add one in Fleet.
              </Text>
            )}

            <TouchableOpacity
              onPress={() => router.push('/(tabs)/fleet')}
              accessibilityRole="button"
              accessibilityLabel="Manage fleet"
              style={{ alignSelf: 'flex-end', paddingVertical: 4 }}
            >
              <Text style={{ fontSize: 11, color: p.brand, fontWeight: '600', letterSpacing: 0.5 }}>
                MANAGE FLEET →
              </Text>
            </TouchableOpacity>

            <FarSectionRule label="Trading season" />

            {/* Monthly bars */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 80 }}>
              {(stats?.monthlyRevenue ?? []).map((m, i) => {
                const heightPct = maxMonthlyGross > 0 ? (m.grossSales / maxMonthlyGross) * 60 : 0;
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <View style={{
                      width: '70%',
                      height: Math.max(2, heightPct),
                      backgroundColor: p.text,
                      opacity: m.grossSales > 0 ? 1 : 0.15,
                    }} />
                    <Text style={{ fontSize: 8, color: p.textMuted, fontWeight: '600' }}>
                      {MONTHS_SHORT[i][0]}
                    </Text>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(tabs)/reports')}
              accessibilityRole="button"
              accessibilityLabel="View reports"
              style={{ alignSelf: 'flex-end', paddingVertical: 4 }}
            >
              <Text style={{ fontSize: 11, color: p.brand, fontWeight: '600', letterSpacing: 0.5 }}>
                VIEW REPORTS →
              </Text>
            </TouchableOpacity>

            <FarSectionRule label="What's coming" />

            {/* Upcoming events */}
            {stats && stats.upcomingEvents.length > 0 ? (
              stats.upcomingEvents.slice(0, 5).map((event, i) => (
                <UpcomingRow
                  key={event.id}
                  event={event}
                  tokens={tokens}
                  onPress={() => router.push(`/(tabs)/events/${event.id}`)}
                  isLast={i === Math.min(stats.upcomingEvents.length, 5) - 1}
                />
              ))
            ) : (
              <Text style={{ fontSize: 12, color: p.textMuted, fontStyle: 'italic' }}>
                No upcoming events. Book one to get going.
              </Text>
            )}

            {stats && stats.upcomingEvents.length > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/events')}
                accessibilityRole="button"
                accessibilityLabel="View all events"
                style={{ alignSelf: 'flex-end', paddingVertical: 4 }}
              >
                <Text style={{ fontSize: 11, color: p.brand, fontWeight: '600', letterSpacing: 0.5 }}>
                  ALL EVENTS →
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      )}

      {/* Quick Sales FAB */}
      <TouchableOpacity
        onPress={() => setQuickSalesOpen(true)}
        accessibilityLabel="Log today's sales"
        accessibilityRole="button"
        style={{
          position: 'absolute',
          bottom: 24 + insets.bottom,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: p.brand,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 6,
        }}
      >
        <Text style={{ fontSize: 22, color: '#fff', fontFamily: tokens.type.display }}>£</Text>
      </TouchableOpacity>

      <QuickSalesSheet visible={quickSalesOpen} onClose={() => setQuickSalesOpen(false)} />
      <ProductCatalogScreen visible={showCatalog} onClose={() => setShowCatalog(false)} />
    </View>
  );
}

function KPI({ label, value, tokens, color }: { label: string; value: string; tokens: ReturnType<typeof useTheme>['tokens']; color?: string }) {
  const p = tokens.palette;
  return (
    <View style={{ width: '47%', flexGrow: 1 }}>
      <Text style={{
        fontSize: 9, color: p.textMuted, letterSpacing: 1, fontWeight: '600',
        marginBottom: 2,
      }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{
        fontFamily: tokens.type.display,
        fontWeight: tokens.type.displayWeight,
        fontSize: 28,
        lineHeight: 32,
        letterSpacing: -0.5,
        color: color ?? p.text,
        fontVariant: ['tabular-nums'],
      }}>
        {value}
      </Text>
    </View>
  );
}

function FleetRow({ unit, tokens, isLast }: { unit: UnitWithStatus; tokens: ReturnType<typeof useTheme>['tokens']; isLast: boolean }) {
  const p = tokens.palette;
  const status = unit.status;
  const statusColor = status === 'active' ? TONE.good : status === 'maintenance' ? TONE.caution : p.textFaint;
  const statusLabel = status === 'active' ? 'ACTIVE' : status === 'maintenance' ? 'IN MAINT' : 'RETIRED';
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 10 }}>
        <Ionicons name="bus-outline" size={20} color={p.text} />
        <View style={{ flex: 1 }}>
          <Text style={{
            fontFamily: tokens.type.display,
            fontWeight: tokens.type.displayWeight,
            fontSize: 17,
            color: p.text,
          }}>
            {unit.name}
          </Text>
          <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic' }} numberOfLines={1}>
            {unit.registration ? `${unit.registration} — ` : ''}
            {unit.currentEvent ? `pitched at ${unit.currentEvent.name}` : status === 'active' ? 'available' : 'off the road'}
          </Text>
        </View>
        <View style={{
          paddingHorizontal: 7, paddingVertical: 2,
          borderWidth: 1, borderColor: statusColor,
        }}>
          <Text style={{ fontSize: 10, color: statusColor, fontWeight: '600', letterSpacing: 0.5 }}>
            {statusLabel}
          </Text>
        </View>
      </View>
      {!isLast && <FarDivider />}
    </View>
  );
}

function UpcomingRow({ event, tokens, onPress, isLast }: {
  event: { id: string; name: string; date: string; end_date: string | null; location: string; concessions_companies?: { name: string } | null };
  tokens: ReturnType<typeof useTheme>['tokens'];
  onPress: () => void;
  isLast: boolean;
}) {
  const p = tokens.palette;
  const startDate = new Date(event.date);
  const dayNum = startDate.getDate();
  const monthShort = MONTHS_SHORT[startDate.getMonth()];
  const orgName = event.concessions_companies?.name;
  return (
    <View>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flexDirection: 'row', gap: 14, paddingBottom: 12 }}>
        <View style={{ width: 50, alignItems: 'center', flexShrink: 0 }}>
          <Text style={{
            fontFamily: tokens.type.display,
            fontWeight: tokens.type.displayWeight,
            fontSize: 24,
            lineHeight: 26,
            color: p.text,
          }}>
            {dayNum}
          </Text>
          <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1, marginTop: 2, fontWeight: '600' }}>
            {monthShort.toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontFamily: tokens.type.display,
            fontWeight: tokens.type.displayWeight,
            fontSize: 17,
            letterSpacing: -0.2,
            color: p.text,
          }} numberOfLines={1}>
            {event.name}
          </Text>
          <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic', marginTop: 2 }} numberOfLines={1}>
            {event.location}{orgName ? ` — w/ ${orgName}` : ''}
          </Text>
        </View>
      </TouchableOpacity>
      {!isLast && <FarDivider />}
    </View>
  );
}
