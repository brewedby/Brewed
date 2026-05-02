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
import { FarSectionRule } from '@/components/far/SectionRule';
import { FarStamp } from '@/components/far/Stamp';
import { FarDivider } from '@/components/far/Divider';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/queries/profile';
import { useTheme } from '@/lib/themeContext';
import { TONE, farStatus } from '@/lib/theme';
import type { UnitWithStatus } from '@/types';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TODAY = new Date();
const ISSUE_NUMBER = String(TODAY.getMonth() + 1).padStart(2, '0');
const TODAY_LABEL = TODAY.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

// Playful taglines — rotate on each toggle
const SEAL_TAGLINES_LOCK = [
  "Sealed. Eyes off the books.",
  "Books closed. The accountant is asleep.",
  "Vault locked — even the tax man can't see.",
  "Ledger shut. Drink your coffee in peace.",
  "Numbers under the counter. Walk on by.",
  "Discretion is the better part of margin.",
];
const SEAL_TAGLINES_OPEN = [
  "Books open. Read 'em and weep.",
  "The numbers, in full daylight.",
  "Ledger broken open. Brace yourself.",
  "Seal cracked. The truth, with VAT.",
  "Receipts unrolled. Brew yourself a strong one.",
];

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

function Redacted({ width = 120, height = 44, label = '£ ▒▒▒' }: {
  width?: number; height?: number; label?: string;
}) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  return (
    <View style={{
      alignSelf: 'flex-start',
      minWidth: width, height,
      backgroundColor: p.text,
      paddingHorizontal: 10,
      alignItems: 'center', justifyContent: 'center',
      transform: [{ rotate: '-1deg' }],
      shadowColor: p.borderStrong,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    }}>
      <Text style={{
        color: p.bg,
        fontFamily: tokens.type.mono,
        fontSize: Math.min(13, Math.max(10, height * 0.28)),
        fontWeight: '700',
        letterSpacing: 2,
      }}>
        {label}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tokens, isDark } = useTheme();
  const p = tokens.palette;
  const S = farStatus(isDark);
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFees, setShowFees] = useState(false);
  const [quickSalesOpen, setQuickSalesOpen] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [sealed, setSealed] = useState(false);
  const [tagIdx, setTagIdx] = useState(0);
  const { data: stats, isLoading, isError, error, refetch } = useDashboard(year);

  const toggleSeal = () => {
    setSealed((s) => !s);
    setTagIdx((i) => i + 1);
  };

  const tagline = sealed
    ? SEAL_TAGLINES_LOCK[tagIdx % SEAL_TAGLINES_LOCK.length]
    : SEAL_TAGLINES_OPEN[tagIdx % SEAL_TAGLINES_OPEN.length];

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
          result.push({ text: `${u.name} ${label} expired`, color: S.red });
          alertedKeys.add(key);
        } else if (days <= 30) {
          result.push({ text: `${u.name} ${label} due in ${days}d`, color: S.amber });
          alertedKeys.add(key);
        }
      });
    });
    return result;
  }, [stats, S.red, S.amber]);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const maxMonthlyGross = useMemo(() => {
    if (!stats) return 0;
    return Math.max(0, ...stats.monthlyRevenue.map((m) => m.grossSales));
  }, [stats]);

  const businessName = profile?.business_name ?? 'My Business';

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      {/* ── Custom masthead with seal ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: p.text }}>
        {/* Eyebrow row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => setYearPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Year ${year}. Tap to change.`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 }}
          >
            <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 2, fontWeight: '600' }}>
              {`VOL. ${year} · ISSUE ${ISSUE_NUMBER}`}
            </Text>
            <Ionicons name="chevron-down" size={10} color={p.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowCatalog(true)}
            accessibilityRole="button"
            accessibilityLabel="Open menu and product costs"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ minHeight: 32, justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1.5 }}>
              {TODAY_LABEL.toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Title row + seal */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 4 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{
              fontFamily: tokens.type.display,
              fontWeight: tokens.type.displayWeight,
              fontSize: 36,
              letterSpacing: -0.7,
              lineHeight: 36,
              color: p.text,
            }}>
              Brewed
            </Text>
            <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic', marginTop: 2 }}>
              {businessName} · the trader's ledger
            </Text>
          </View>

          {/* Wax-seal toggle */}
          <TouchableOpacity
            onPress={toggleSeal}
            accessibilityRole="button"
            accessibilityLabel={sealed ? 'Unseal ledger — show financial figures' : 'Seal ledger — hide financial figures'}
            accessibilityState={{ checked: sealed }}
            activeOpacity={0.85}
            style={{
              width: 56, height: 56, flexShrink: 0,
              borderWidth: 2, borderColor: p.text,
              borderRadius: 28,
              backgroundColor: sealed ? p.text : 'transparent',
              alignItems: 'center', justifyContent: 'center',
              transform: [{ rotate: sealed ? '-6deg' : '4deg' }],
              shadowColor: p.borderStrong,
              shadowOffset: { width: 2, height: 2 },
              shadowOpacity: sealed ? 1 : 0,
              shadowRadius: 0,
              elevation: sealed ? 2 : 0,
            }}
          >
            <Ionicons
              name={sealed ? 'lock-closed' : 'eye-outline'}
              size={16}
              color={sealed ? p.bg : p.text}
            />
            <Text style={{
              fontSize: 7.5, fontWeight: '700', letterSpacing: 1.2,
              color: sealed ? p.bg : p.text, marginTop: 1,
            }}>
              {sealed ? 'SEALED' : 'OPEN'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tagline strip */}
        <View style={{
          marginTop: 10, paddingTop: 6,
          borderTopWidth: 1, borderTopColor: p.border,
          flexDirection: 'row', alignItems: 'center', gap: 6,
        }}>
          <View style={{
            width: 6, height: 6, borderRadius: 3,
            backgroundColor: sealed ? p.brand : S.green,
          }} />
          <Text style={{
            flex: 1, fontSize: 11,
            color: sealed ? p.brand : p.textMuted,
            fontStyle: 'italic',
          }}>
            {tagline}
          </Text>
          <Text style={{
            fontSize: 9, color: p.textFaint, letterSpacing: 1, fontWeight: '700',
          }}>
            {sealed ? 'TAP SEAL TO OPEN' : 'TAP TO SEAL'}
          </Text>
        </View>
      </View>

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
              <View style={{ minHeight: 64, justifyContent: 'flex-start' }}>
                {sealed ? (
                  <View style={{ marginTop: 4 }}>
                    <Redacted width={200} height={56} label="£ ▒▒▒,▒▒▒" />
                  </View>
                ) : (
                  <Text style={{
                    fontFamily: tokens.type.display,
                    fontWeight: tokens.type.displayWeight,
                    fontSize: 64,
                    lineHeight: 64,
                    letterSpacing: -1.5,
                    color: (stats?.netProfitYtd ?? 0) >= 0 ? S.green : S.red,
                    fontVariant: ['tabular-nums'],
                  }}>
                    {formatCurrencyCompact(stats?.netProfitYtd ?? 0)}
                  </Text>
                )}
              </View>
              <Text style={{
                fontSize: 12, color: p.textMuted, marginTop: 10,
                fontStyle: 'italic', lineHeight: 18,
              }}>
                {sealed
                  ? 'Out of sight. Eyes back on the road.'
                  : (stats?.netProfitYtd ?? 0) >= 0
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
              <KPI
                label="Gross sales"
                value={formatCurrencyCompact(stats?.grossSalesYtd ?? 0)}
                tokens={tokens}
                redacted={sealed}
              />
              <KPI
                label="Events traded"
                value={String(stats?.totalEventsYtd ?? 0)}
                tokens={tokens}
              />
              <KPI
                label="Avg take"
                value={formatCurrencyCompact(stats?.avgRevenuePerEvent ?? 0)}
                tokens={tokens}
                redacted={sealed}
              />
              <KPI
                label="Acceptance"
                value={`${(stats?.acceptanceRate ?? 0).toFixed(0)}%`}
                tokens={tokens}
                color={S.green}
              />
            </View>

            {/* Stamp + Committed Fees */}
            {stats && stats.committedFees > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <TouchableOpacity onPress={() => setShowFees((v) => !v)} activeOpacity={0.7} disabled={sealed}>
                  <FarStamp
                    primary={`${stats.upcomingCommitments.length} events committed`}
                    secondary={sealed ? '£ ▒▒▒ pitched' : `${formatCurrencyCompact(stats.committedFees)} pitched`}
                  />
                </TouchableOpacity>
                {!sealed && (
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
                )}
              </View>
            )}

            {!sealed && showFees && stats && stats.upcomingCommitments.length > 0 && (
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

            {/* Fleet — never financial, always visible */}
            {stats && stats.unitStatuses.length > 0 ? (
              stats.unitStatuses.map((unit, i) => (
                <FleetRow key={unit.id} unit={unit} tokens={tokens} S={S} isLast={i === stats.unitStatuses.length - 1} />
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

            {/* Monthly bars — silhouette only when sealed */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 80, position: 'relative' }}>
              {(stats?.monthlyRevenue ?? []).map((m, i) => {
                const heightPct = maxMonthlyGross > 0 ? (m.grossSales / maxMonthlyGross) * 60 : 0;
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <View style={{
                      width: '70%',
                      height: sealed ? 14 : Math.max(2, heightPct),
                      backgroundColor: sealed ? p.borderStrong : p.text,
                      opacity: sealed ? 0.6 : (m.grossSales > 0 ? 1 : 0.15),
                    }} />
                    <Text style={{ fontSize: 8, color: p.textMuted, fontWeight: '600' }}>
                      {MONTHS_SHORT[i][0]}
                    </Text>
                  </View>
                );
              })}
              {sealed && (
                <View style={{
                  position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <View style={{
                    borderWidth: 1.5, borderColor: p.brand, borderStyle: 'dashed',
                    paddingHorizontal: 10, paddingVertical: 4,
                    backgroundColor: p.bg,
                    transform: [{ rotate: '-3deg' }],
                  }}>
                    <Text style={{
                      fontSize: 10, fontWeight: '700', letterSpacing: 2, color: p.brand,
                    }}>
                      TRADING CURVE · SEALED
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {!sealed && (
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
            )}

            <FarSectionRule label="What's coming" />

            {/* Upcoming events — names always visible */}
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

function KPI({ label, value, tokens, color, redacted }: {
  label: string; value: string;
  tokens: ReturnType<typeof useTheme>['tokens'];
  color?: string; redacted?: boolean;
}) {
  const p = tokens.palette;
  return (
    <View style={{ width: '47%', flexGrow: 1 }}>
      <Text style={{
        fontSize: 9, color: p.textMuted, letterSpacing: 1, fontWeight: '600',
        marginBottom: 4,
      }}>
        {label.toUpperCase()}
      </Text>
      {redacted ? (
        <View style={{ height: 32, justifyContent: 'flex-start' }}>
          <Redacted width={100} height={28} label="£ ▒▒▒" />
        </View>
      ) : (
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
      )}
    </View>
  );
}

function FleetRow({ unit, tokens, S, isLast }: {
  unit: UnitWithStatus;
  tokens: ReturnType<typeof useTheme>['tokens'];
  S: ReturnType<typeof farStatus>;
  isLast: boolean;
}) {
  const p = tokens.palette;
  const status = unit.status;
  const statusColor = status === 'active' ? S.green : status === 'maintenance' ? S.amber : p.textFaint;
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
