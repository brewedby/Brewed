import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useProfile, useUpdateProfile } from '@/lib/queries/profile';
import type { Metric } from '@/lib/queries/profile';
import { useSubscription } from '@/lib/iap/SubscriptionContext';
import { ProductCatalogScreen } from '@/components/cogs/ProductCatalogScreen';
import { FarMasthead } from '@/components/far/Masthead';
import { useTheme } from '@/lib/themeContext';
import type { ThemeMode } from '@/lib/themeContext';
import { BUSINESS_TYPES } from '@/constants';
import { normalizeTradeType } from '@/lib/tradeTypeConfig';
import { TRADE_CATEGORIES, DEFAULT_CATEGORIES, CATEGORY_DEFINITIONS } from '@/types/cogs';

const APPLE_MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';
const SUPPORT_EMAIL = 'support@brewedbyboon.com';

const CURRENCIES = [
  { code: 'GBP', symbol: '£', label: 'GBP' },
  { code: 'EUR', symbol: '€', label: 'EUR' },
  { code: 'USD', symbol: '$', label: 'USD' },
];

const DEFAULT_METRICS: Metric[] = [
  { id: 'revenue',  name: 'Revenue',      unit: '£',      enabled: true,  builtin: true },
  { id: 'profit',   name: 'Net Profit',   unit: '£',      enabled: true,  builtin: true },
  { id: 'covers',   name: 'Covers',       unit: 'covers', enabled: true,  builtin: true },
  { id: 'drinks',   name: 'Drinks Sold',  unit: 'drinks', enabled: false, builtin: true },
];

// Forecast display prefs — stored alongside dashboard metrics in custom_metrics
// (prefix 'forecast_' distinguishes them). All default ON so the full card
// is visible until the user explicitly trims it.
const DEFAULT_FORECAST_PREFS: Metric[] = [
  { id: 'forecast_weather',    name: 'Weather impact',   unit: 'show/hide', enabled: true,  builtin: true },
  { id: 'forecast_drivers',    name: 'Demand drivers',   unit: 'show/hide', enabled: true,  builtin: true },
  { id: 'forecast_plan_stock', name: 'Stock prep guide', unit: 'show/hide', enabled: true,  builtin: true },
];

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const THEME_OPTIONS: Array<{ id: ThemeMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
  { id: 'auto',  label: 'Auto',  icon: 'phone-portrait-outline' },
  { id: 'light', label: 'Light', icon: 'sunny-outline' },
  { id: 'dark',  label: 'Dark',  icon: 'moon-outline' },
];

const QUICK_ACCESS = [
  { icon: 'pricetag-outline' as const, label: 'Menu & Product Costs', sub: 'Selling prices and COGS per item', key: 'catalog' },
  { icon: 'car-outline' as const,      label: 'Your Fleet',           sub: 'MOT, tax, service dates & unit status', key: 'fleet' },
  { icon: 'bar-chart-outline' as const, label: 'Reports',             sub: 'Annual P&L, top events, export CSV', key: 'reports' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { tokens, themeMode, setThemeMode } = useTheme();
  const p = tokens.palette;
  const { data: profile, refetch } = useProfile(user?.id);
  const updateProfile = useUpdateProfile();
  const subscription = useSubscription();

  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [currency, setCurrency] = useState('GBP');
  const [metrics, setMetrics] = useState<Metric[]>(DEFAULT_METRICS);
  const [forecastMetrics, setForecastMetrics] = useState<Metric[]>(DEFAULT_FORECAST_PREFS);
  // Saved per-category forecast toggles (ids: forecast_cat_<category>).
  const [savedCategoryPrefs, setSavedCategoryPrefs] = useState<Metric[]>([]);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  // Hydrate local form state ONCE from the profile. Refetches must not
  // overwrite live edits — that was the source of the "lost my settings" bug.
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (profile && !hydratedRef.current) {
      hydratedRef.current = true;
      setBusinessName(profile.business_name ?? '');
      // Settings hydrates the picker from the canonical resolver, NOT a
      // raw '?? Coffee' fallback. The previous fallback hid the "no
      // trade type set" state and silently chose Coffee for the user.
      // normalizeTradeType returns 'Other' for empty/null — which is
      // the right starting point for the user to make an explicit
      // choice. (Imported as a top-level singleton to keep this hot
      // path cheap.)
      setBusinessType(normalizeTradeType(profile.business_type));
      setCurrency(profile.currency ?? 'GBP');
      const allMetrics = profile.custom_metrics ?? [];
      const dashMetrics = allMetrics.filter((m) => !m.id.startsWith('forecast_'));
      const fcastPrefs  = allMetrics.filter((m) =>  m.id.startsWith('forecast_') && !m.id.startsWith('forecast_cat_'));
      const catPrefs    = allMetrics.filter((m) =>  m.id.startsWith('forecast_cat_'));
      setMetrics(dashMetrics.length > 0 ? dashMetrics : DEFAULT_METRICS);
      setForecastMetrics(fcastPrefs.length > 0 ? fcastPrefs : DEFAULT_FORECAST_PREFS);
      setSavedCategoryPrefs(catPrefs);
    }
  }, [profile]);

  function handleDeleteAccount() {
    // Two-step destructive confirmation (App Review 5.1.1(v): account
    // deletion must be available in-app). The RPC deletes the auth user;
    // every table cascades, so all financial data goes with it.
    Alert.alert(
      'Delete your account?',
      'This permanently erases your account and ALL data — events, financials, products, imports and fleet. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => Alert.alert(
            'Are you absolutely sure?',
            'Your data cannot be recovered after this. Consider exporting your reports first (Reports → Export).',
            [
              { text: 'Keep my account', style: 'cancel' },
              {
                text: 'Delete everything',
                style: 'destructive',
                onPress: async () => {
                  setDeletingAccount(true);
                  try {
                    const { error } = await supabase.rpc('delete_own_account');
                    if (error) throw error;
                    await signOut();
                  } catch (e) {
                    Alert.alert(
                      'Could not delete account',
                      (e instanceof Error ? e.message : 'Please try again.') +
                      `\n\nIf this keeps failing, email ${SUPPORT_EMAIL} and we'll erase your data within 30 days.`,
                    );
                  } finally {
                    setDeletingAccount(false);
                  }
                },
              },
            ],
          ),
        },
      ],
    );
  }

  async function handleRefresh() {
    setRefreshing(true);
    // Reset so the form re-hydrates from the fresh server data.
    // The user explicitly pulled to refresh — they want latest values.
    hydratedRef.current = false;
    await refetch();
    setRefreshing(false);
  }

  function toggleMetric(id: string, enabled: boolean) {
    setMetrics((prev) => prev.map((m) => m.id === id ? { ...m, enabled } : m));
  }

  function toggleForecastMetric(id: string, enabled: boolean) {
    setForecastMetrics((prev) => prev.map((m) => m.id === id ? { ...m, enabled } : m));
  }

  // Per-category forecast visibility for the CURRENT trade type. Follows
  // the picker live, preserving any saved toggles by id; unlisted
  // categories default to visible.
  const forecastCategoryPrefs: Metric[] = (
    (TRADE_CATEGORIES[businessType] ?? DEFAULT_CATEGORIES).filter((k) => k !== 'other')
  ).map((k) => {
    const saved = savedCategoryPrefs.find((m) => m.id === `forecast_cat_${k}`);
    return {
      id: `forecast_cat_${k}`,
      name: CATEGORY_DEFINITIONS[k]?.label ?? k,
      unit: 'show/hide',
      enabled: saved?.enabled ?? true,
      builtin: true,
    };
  });

  function toggleForecastCategory(id: string, enabled: boolean) {
    setSavedCategoryPrefs((prev) => {
      const existing = prev.find((m) => m.id === id);
      if (existing) return prev.map((m) => m.id === id ? { ...m, enabled } : m);
      const display = forecastCategoryPrefs.find((m) => m.id === id);
      return [...prev, { ...(display ?? { id, name: id, unit: 'show/hide', builtin: true, enabled }), enabled }];
    });
  }

  async function handleSave() {
    if (!user) return;
    const trimmedName = businessName.trim();
    if (!trimmedName) {
      Alert.alert('Required', 'Business name cannot be empty.');
      return;
    }
    if (!businessType) {
      Alert.alert('Required', 'Please select a business type.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        updates: {
          business_name: trimmedName,
          business_type: businessType,
          currency,
          custom_metrics: [...forecastMetrics, ...forecastCategoryPrefs, ...metrics],
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Saved', 'Your settings have been updated.');
    } catch (e) {
      Alert.alert(
        'Error',
        e instanceof Error ? e.message : 'Could not save settings. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  function handleQuickAccess(key: string) {
    if (key === 'catalog') setShowCatalog(true);
    else if (key === 'fleet') router.push('/(modal)/fleet');
    else if (key === 'reports') router.push('/(modal)/reports');
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <FarMasthead eyebrow="The Workshop" title="Settings" sub={user?.email} />

      <ScrollView
        style={{ flex: 1 }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={p.brand} />}
      >
        <View style={{ padding: 20, gap: 24 }}>

          {/* ── Appearance ── */}
          <View>
            <Text style={{ fontSize: 10, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 10 }}>
              {'APPEARANCE'}
            </Text>
            <View style={{ borderWidth: 1, borderColor: p.borderStrong, backgroundColor: p.surface, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Ionicons name="contrast-outline" size={20} color={p.text} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: tokens.type.display, fontSize: 17, color: p.text }}>Theme</Text>
                  <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic', marginTop: 1 }}>Auto follows your iOS setting.</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: p.borderStrong }}>
                {THEME_OPTIONS.map((opt, i) => {
                  const active = themeMode === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => setThemeMode(opt.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Theme: ${opt.label}`}
                      accessibilityState={{ selected: active }}
                      style={{
                        flex: 1, paddingVertical: 10, minHeight: 44,
                        borderLeftWidth: i === 0 ? 0 : 1,
                        borderLeftColor: p.borderStrong,
                        backgroundColor: active ? p.text : 'transparent',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Ionicons name={opt.icon} size={16} color={active ? p.bg : p.text} />
                      <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: active ? p.bg : p.text }}>
                        {opt.label.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ── Quick Access ── */}
          <View>
            <Text style={{ fontSize: 10, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 10 }}>
              {'QUICK ACCESS'}
            </Text>
            <View>
              {QUICK_ACCESS.map((item, i) => (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => handleQuickAccess(item.key)}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 14,
                    paddingVertical: 12,
                    borderTopWidth: 1, borderTopColor: p.border,
                    borderBottomWidth: i === QUICK_ACCESS.length - 1 ? 1 : 0,
                    borderBottomColor: p.border,
                  }}
                >
                  <View style={{ width: 32, height: 32, borderWidth: 1, borderColor: p.text, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={item.icon} size={16} color={p.text} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: tokens.type.display, fontSize: 16, color: p.text }}>{item.label}</Text>
                    <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic', marginTop: 1 }}>{item.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={p.textFaint} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Subscription ── */}
          <View>
            <Text style={{ fontSize: 10, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 10 }}>
              {'SUBSCRIPTION'}
            </Text>
            <View style={{ borderWidth: 1, borderColor: p.borderStrong, backgroundColor: p.surface, padding: 14, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontFamily: tokens.type.display, fontSize: 18, color: p.text }}>
                    {subscription.tier === 'trader' ? 'Brewed Trader' : 'Brewed Pro'}
                  </Text>
                  <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic', marginTop: 2 }}>
                    {profile?.reviewer_grandfathered
                      ? 'Reviewer access · always entitled'
                      : profile?.subscription_status === 'active' || profile?.subscription_status === 'in_grace_period'
                        ? `${profile.subscription_status === 'in_grace_period' ? 'Grace period · ' : 'Active · '}${profile.subscription_will_renew ? 'renews' : 'expires'} ${profile.subscription_expires_at ? new Date(profile.subscription_expires_at).toLocaleDateString('en-GB') : ''}`
                        : profile?.subscription_status === 'expired' || profile?.subscription_status === 'in_billing_retry'
                          ? 'Lapsed — re-subscribe in App Store'
                          : 'Not subscribed'}
                  </Text>
                </View>
                <View style={{
                  borderWidth: 1, borderColor: p.text, paddingHorizontal: 8, paddingVertical: 3,
                  backgroundColor: subscription.isEntitled ? p.text : 'transparent',
                }}>
                  <Text style={{
                    fontSize: 9, fontWeight: '700', letterSpacing: 1.5,
                    color: subscription.isEntitled ? p.bg : p.text,
                  }}>
                    {subscription.isEntitled ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => Linking.openURL(APPLE_MANAGE_SUBSCRIPTIONS_URL)}
                  accessibilityRole="link"
                  accessibilityLabel="Manage subscription in App Store"
                  style={{ flex: 1, borderWidth: 1, borderColor: p.text, paddingVertical: 10, alignItems: 'center', minHeight: 44, justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.text }}>{'MANAGE ↗'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={subscription.restore}
                  disabled={subscription.isRestoring}
                  accessibilityRole="button"
                  accessibilityLabel="Restore purchases"
                  style={{ flex: 1, borderWidth: 1, borderColor: p.borderStrong, paddingVertical: 10, alignItems: 'center', minHeight: 44, justifyContent: 'center' }}
                >
                  {subscription.isRestoring
                    ? <ActivityIndicator size="small" color={p.text} />
                    : <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.text }}>{'RESTORE'}</Text>}
                </TouchableOpacity>
              </View>

              {subscription.tier === 'trader' && (
                <TouchableOpacity
                  onPress={() => router.push('/(modal)/paywall')}
                  accessibilityRole="button"
                  accessibilityLabel="Upgrade to Brewed Pro"
                  style={{ backgroundColor: p.text, paddingVertical: 10, alignItems: 'center', minHeight: 44, justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.bg }}>
                    {'UPGRADE TO PRO — FORECASTS, PDF IMPORT, FLEET REMINDERS'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Business Profile ── */}
          <View>
            <Text style={{ fontSize: 10, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 10 }}>
              {'BUSINESS PROFILE'}
            </Text>

            <View style={{ gap: 16 }}>
              <View>
                <Text style={{ fontSize: 10, color: p.textMuted, letterSpacing: 1, fontWeight: '600', marginBottom: 6 }}>
                  {'BUSINESS NAME'}
                </Text>
                <TextInput
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="e.g. Brewed by Boon"
                  placeholderTextColor={p.textFaint}
                  accessibilityLabel="Business name"
                  style={{
                    borderWidth: 1, borderColor: p.borderStrong, backgroundColor: p.surface,
                    paddingHorizontal: 12, paddingVertical: 10,
                    fontFamily: tokens.type.display, fontSize: 18, color: p.text,
                    minHeight: 44,
                  }}
                />
              </View>

              <View>
                <Text style={{ fontSize: 10, color: p.textMuted, letterSpacing: 1, fontWeight: '600', marginBottom: 8 }}>
                  {'BUSINESS TYPE'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {BUSINESS_TYPES.map((t) => {
                    const active = businessType === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setBusinessType(t)}
                        accessibilityRole="radio"
                        accessibilityLabel={t}
                        accessibilityState={{ selected: active }}
                        style={{
                          paddingHorizontal: 10, paddingVertical: 5,
                          borderWidth: 1,
                          backgroundColor: active ? p.text : 'transparent',
                          borderColor: active ? p.text : p.borderStrong,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: active ? p.bg : p.text }}>{t}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 10, color: p.textMuted, letterSpacing: 1, fontWeight: '600', marginBottom: 6 }}>
                  {'CURRENCY'}
                </Text>
                <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: p.borderStrong }}>
                  {CURRENCIES.map((c, i) => {
                    const active = currency === c.code;
                    return (
                      <TouchableOpacity
                        key={c.code}
                        onPress={() => setCurrency(c.code)}
                        accessibilityRole="radio"
                        accessibilityLabel={c.label}
                        accessibilityState={{ selected: active }}
                        style={{
                          flex: 1, paddingVertical: 10, alignItems: 'center',
                          borderLeftWidth: i === 0 ? 0 : 1,
                          borderLeftColor: p.borderStrong,
                          backgroundColor: active ? p.text : 'transparent',
                          minHeight: 44,
                        }}
                      >
                        <Text style={{ fontFamily: tokens.type.display, fontSize: 18, color: active ? p.bg : p.text }}>{c.symbol}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: active ? p.bg : p.textMuted }}>{c.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {/* ── Metrics ── */}
          <View>
            <Text style={{ fontSize: 10, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 4 }}>
              {'METRICS'}
            </Text>
            <Text style={{ fontSize: 12, color: p.textMuted, fontStyle: 'italic', marginBottom: 10 }}>
              Choose which metrics to track across the app.
            </Text>
            {metrics.map((metric, idx) => (
              <View
                key={metric.id}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingVertical: 12,
                  borderTopWidth: 1, borderTopColor: p.border,
                  borderBottomWidth: idx === metrics.length - 1 ? 1 : 0,
                  borderBottomColor: p.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: tokens.type.display, fontSize: 16, color: p.text }}>{metric.name}</Text>
                  <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic', marginTop: 1 }}>{metric.unit}</Text>
                </View>
                {/* Hand-stamped ON/OFF segmented control */}
                <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: p.text }}>
                  {[
                    { id: 'on' as const, label: 'ON' },
                    { id: 'off' as const, label: 'OFF' },
                  ].map((opt, i) => {
                    const active = (opt.id === 'on') === metric.enabled;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        onPress={() => toggleMetric(metric.id, opt.id === 'on')}
                        accessibilityRole="button"
                        accessibilityLabel={`${opt.id === 'on' ? 'Enable' : 'Disable'} ${metric.name}`}
                        accessibilityState={{ selected: active }}
                        style={{
                          paddingHorizontal: 12, paddingVertical: 6, minWidth: 44,
                          alignItems: 'center', justifyContent: 'center',
                          borderLeftWidth: i === 0 ? 0 : 1,
                          borderLeftColor: p.text,
                          backgroundColor: active ? p.text : 'transparent',
                        }}
                      >
                        <Text style={{
                          fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
                          color: active ? p.bg : p.text,
                        }}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          {/* ── Forecast Preferences ── */}
          <View>
            <Text style={{ fontSize: 10, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 4 }}>
              {'FORECAST PREFERENCES'}
            </Text>
            <Text style={{ fontSize: 12, color: p.textMuted, fontStyle: 'italic', marginBottom: 10 }}>
              Choose which sections appear on the demand forecast card.
            </Text>
            {forecastMetrics.map((metric, idx) => (
              <View
                key={metric.id}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingVertical: 12,
                  borderTopWidth: 1, borderTopColor: p.border,
                  borderBottomWidth: idx === forecastMetrics.length - 1 ? 1 : 0,
                  borderBottomColor: p.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: tokens.type.display, fontSize: 16, color: p.text }}>{metric.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: p.text }}>
                  {([{ id: 'on', label: 'ON' }, { id: 'off', label: 'OFF' }] as const).map((opt, i) => {
                    const active = (opt.id === 'on') === metric.enabled;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        onPress={() => toggleForecastMetric(metric.id, opt.id === 'on')}
                        accessibilityRole="button"
                        accessibilityLabel={`${opt.id === 'on' ? 'Show' : 'Hide'} ${metric.name} on forecast`}
                        accessibilityState={{ selected: active }}
                        style={{
                          paddingHorizontal: 12, paddingVertical: 6, minWidth: 44,
                          alignItems: 'center', justifyContent: 'center',
                          borderLeftWidth: i === 0 ? 0 : 1,
                          borderLeftColor: p.text,
                          backgroundColor: active ? p.text : 'transparent',
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: active ? p.bg : p.text }}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            <Text style={{ fontSize: 10, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginTop: 18, marginBottom: 4 }}>
              {'FORECAST CATEGORIES'}
            </Text>
            <Text style={{ fontSize: 12, color: p.textMuted, fontStyle: 'italic', marginBottom: 10 }}>
              Choose which categories appear in the stock prep guide.
            </Text>
            {forecastCategoryPrefs.map((metric, idx) => (
              <View
                key={metric.id}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingVertical: 12,
                  borderTopWidth: 1, borderTopColor: p.border,
                  borderBottomWidth: idx === forecastCategoryPrefs.length - 1 ? 1 : 0,
                  borderBottomColor: p.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: tokens.type.display, fontSize: 16, color: p.text }}>{metric.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: p.text }}>
                  {([{ id: 'on', label: 'ON' }, { id: 'off', label: 'OFF' }] as const).map((opt, i) => {
                    const active = (opt.id === 'on') === metric.enabled;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        onPress={() => toggleForecastCategory(metric.id, opt.id === 'on')}
                        accessibilityRole="button"
                        accessibilityLabel={`${opt.id === 'on' ? 'Show' : 'Hide'} ${metric.name} in forecast categories`}
                        accessibilityState={{ selected: active }}
                        style={{
                          paddingHorizontal: 12, paddingVertical: 6, minWidth: 44,
                          alignItems: 'center', justifyContent: 'center',
                          borderLeftWidth: i === 0 ? 0 : 1,
                          borderLeftColor: p.text,
                          backgroundColor: active ? p.text : 'transparent',
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: active ? p.bg : p.text }}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          {/* ── Save ── */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Save settings"
            accessibilityState={{ disabled: saving }}
            style={{
              backgroundColor: p.text, paddingVertical: 14,
              alignItems: 'center', minHeight: 48,
            }}
          >
            {saving ? (
              <ActivityIndicator color={p.bg} />
            ) : (
              <Text style={{ color: p.bg, fontWeight: '700', fontSize: 13, letterSpacing: 1.5 }}>
                {'SAVE CHANGES'}
              </Text>
            )}
          </TouchableOpacity>

          {/* ── Privacy & Legal ── */}
          <View>
            <Text style={{ fontSize: 10, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 10 }}>
              {'PRIVACY & LEGAL'}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(modal)/privacy')}
              accessibilityRole="button"
              accessibilityLabel="How your data is handled"
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                paddingVertical: 12,
                borderTopWidth: 1, borderTopColor: p.border,
              }}
            >
              <View style={{ width: 32, height: 32, borderWidth: 1, borderColor: p.text, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="lock-closed-outline" size={16} color={p.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: tokens.type.display, fontSize: 16, color: p.text }}>Privacy summary</Text>
                <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic', marginTop: 1 }}>
                  How your data is handled — in plain English.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={p.textFaint} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Brewed%20-%20Support`)}
              accessibilityRole="link"
              accessibilityLabel="Contact support"
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                paddingVertical: 12,
                borderTopWidth: 1, borderTopColor: p.border,
                borderBottomWidth: 1, borderBottomColor: p.border,
              }}
            >
              <View style={{ width: 32, height: 32, borderWidth: 1, borderColor: p.text, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="mail-outline" size={16} color={p.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: tokens.type.display, fontSize: 16, color: p.text }}>Contact support</Text>
                <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic', marginTop: 1 }}>
                  {SUPPORT_EMAIL}
                </Text>
              </View>
              <Ionicons name="open-outline" size={14} color={p.textFaint} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={signOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            style={{
              borderWidth: 1, borderColor: p.borderStrong,
              paddingVertical: 14, alignItems: 'center', minHeight: 48,
            }}
          >
            <Text style={{ color: p.textMuted, fontWeight: '600', fontSize: 13, letterSpacing: 1 }}>
              {'SIGN OUT'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
            accessibilityRole="button"
            accessibilityLabel="Delete account and all data permanently"
            style={{
              borderWidth: 1, borderColor: '#dc2626',
              paddingVertical: 14, alignItems: 'center', minHeight: 48,
              opacity: deletingAccount ? 0.5 : 1,
            }}
          >
            {deletingAccount ? (
              <ActivityIndicator size="small" color="#dc2626" />
            ) : (
              <Text style={{ color: '#dc2626', fontWeight: '600', fontSize: 13, letterSpacing: 1 }}>
                {'DELETE ACCOUNT'}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={{ color: p.textFaint, fontSize: 11, textAlign: 'center', fontStyle: 'italic' }}>
            Version {APP_VERSION}
          </Text>
          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      <ProductCatalogScreen visible={showCatalog} onClose={() => setShowCatalog(false)} />
    </View>
  );
}
