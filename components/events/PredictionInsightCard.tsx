// Trade-aware prediction surface.
//
// Reads the user's historical event observations, runs them through the
// trade-specific prediction engine, and renders the forecast lines,
// drivers, weather impact and confidence level in a single FAR-style
// card.
//
// Visibility rules enforced here (not just in the engine):
//   • drink_split (Coffee): shows only drink-relevant stock categories.
//     Never shows Mains / Sides / Extras / generic food chips.
//   • general_demand (trade type not set): hides the stock-planning chip
//     strip entirely and shows a "set your trade type" prompt instead.
//   • All other trade types: uses that trade's own menuCategories.
//
// COGS guarantee: we never display, suggest, or compute cost-of-goods
// here. The engine reads only quantities and revenue.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/lib/themeContext';
import { FarSectionRule } from '@/components/far/SectionRule';
import { useEventObservations } from '@/lib/queries/eventObservations';
import { useAllDailyTakings } from '@/lib/queries/dailyTakings';
import { getTradeConfig, normalizeTradeType } from '@/lib/tradeTypeConfig';
import { CATEGORY_DEFINITIONS } from '@/types/cogs';
import { predict, type PredictionResult, type Confidence } from '@/lib/predictionEngine';
import { useSavePrediction } from '@/lib/mutations/predictions';
import { useUpdateProfile, isExplicitTradeTypeFor } from '@/lib/queries/profile';
import { useAuth } from '@/lib/auth';
import { BUSINESS_TYPES } from '@/constants';

// Categories shown in "PLAN STOCK FOR" when the engine returns drink_split.
// Coffee/drink traders never see food mains/sides/extras chips.
const DRINK_SPLIT_PLAN_CATEGORIES = ['hot_drinks', 'cold_drinks', 'bakes'];

interface Props {
  tradeType: string | null;
  /** Raw, untransformed value of profile.business_type — used ONLY for
   *  the dev-strip diagnostic so devs can see exactly what's stored in
   *  the DB vs what the resolver returned. Optional: callers that don't
   *  have access can omit it. */
  rawBusinessType?: string | null;
  forecastTempC: number;
  /** Date of the upcoming event — used by the engine for recency
   *  weighting of historical observations. */
  eventDate?: string;
  /** ID of the event — used to persist the prediction snapshot. */
  eventId?: string;
  /** True while the user profile is still loading. Prevents the engine from
   *  computing a forecast against tradeType=null and showing a transient
   *  general_demand frame before the real trade type arrives. */
  isProfileLoading?: boolean;
  /** True when the profile query failed (network, RLS, etc.). Distinct
   *  from "loaded with no trade type set" — we show a recovery banner
   *  rather than the picker fallback when the profile itself didn't
   *  load, so the user understands the difference. */
  isProfileError?: boolean;
  /** True once the profile has actually resolved with a real row.
   *  Gates the [Prediction] log and the explicit-Other guard so we
   *  don't write a fallback-Other snapshot before profile arrives. */
  isProfileLoaded?: boolean;
  /** Display preferences from the profile's custom_metrics. Controls which
   *  sections appear on the forecast card. All default true so users who
   *  haven't set prefs see the full card. */
  forecastPrefs?: {
    showWeather:   boolean;
    showDrivers:   boolean;
    showPlanStock: boolean;
  };
}

export function PredictionInsightCard({
  tradeType,
  rawBusinessType,
  forecastTempC,
  eventDate,
  eventId,
  isProfileLoading,
  isProfileError,
  isProfileLoaded,
  forecastPrefs,
}: Props) {
  const config = getTradeConfig(tradeType);
  const canonicalTradeType = normalizeTradeType(tradeType);
  const { tokens, isDark } = useTheme();
  const p = tokens.palette;
  const router = useRouter();

  const { user } = useAuth();
  const qc = useQueryClient();
  const savePrediction = useSavePrediction();
  const updateProfile = useUpdateProfile();
  const savedRef = useRef<string | null>(null);
  const [showInlinePicker, setShowInlinePicker] = useState(false);
  const [savingTradeType, setSavingTradeType] = useState(false);
  const [pendingTradeType, setPendingTradeType] = useState<string | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [pickerSuccess, setPickerSuccess] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  // Force a fresh profile fetch when the user taps "Retry" on the error
  // banner. Without this, useProfile's 5-min staleTime keeps the cached
  // error state visible — even sign-out → sign-in could rehydrate into
  // the same sticky error if it happened recently. We invalidate AND
  // refetch synchronously so the user gets immediate feedback.
  async function retryProfile() {
    if (!user) return;
    setRetrying(true);
    try {
      await qc.invalidateQueries({ queryKey: ['profile', user.id] });
      await qc.refetchQueries({ queryKey: ['profile', user.id] });
    } finally {
      setRetrying(false);
    }
  }

  const { data: observations = [], isLoading: obsLoading } = useEventObservations();
  const { data: dailyTakings = [], isLoading: dtLoading } = useAllDailyTakings();
  const loading = obsLoading || dtLoading || !!isProfileLoading;

  // Dev-only logging — fires ONLY after the profile has actually
  // resolved with a real row. Three reasons for this gating:
  //   • isProfileLoading=true → the resolver returns 'Other' via the
  //     fallback path, which used to spam the console with a misleading
  //     "canonical: Other" line *before* the real profile arrived.
  //   • isProfileError=true → the resolver also returns 'Other', but
  //     it's a load failure (network/RLS), not "no trade set". Logging
  //     it as "Other" would be misleading; we surface the failure
  //     through the error banner instead.
  //   • isProfileLoaded=false → defensive guard for callers that don't
  //     pass the explicit loaded flag.
  // Logs only the diagnostic fields needed to debug a wrong-trade-type
  // bug — no user-identifying data, no observation data.
  useEffect(() => {
    if (!__DEV__) return;
    if (isProfileLoading) return;
    if (isProfileError) return;
    if (isProfileLoaded === false) return;
    // eslint-disable-next-line no-console
    console.log('[Prediction]', {
      rawBusinessType,
      canonical: canonicalTradeType,
      configLabel: config.label,
      eventId,
      source: rawBusinessType
        ? 'profile.business_type'
        : 'fallback (no value in profile)',
    });
  }, [canonicalTradeType, isProfileLoading, isProfileError, isProfileLoaded, eventId, rawBusinessType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Inline trade-type picker handler. When the user is sitting on the
  // OTHER fallback and they tap a real trade type from the picker, we
  // write it back to their profile so every screen converges to the
  // same answer immediately — no need to navigate to Settings.
  async function pickTradeType(picked: string) {
    if (!user) {
      setPickerError("You're not signed in. Sign in and try again.");
      return;
    }
    // Track the just-tapped tile so the picker can highlight it during
    // the save round-trip — otherwise the old selection stays highlighted
    // until the profile refetch arrives, which is confusing.
    setPendingTradeType(picked);
    setSavingTradeType(true);
    setPickerError(null);
    setPickerSuccess(null);
    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        updates: { business_type: picked },
      });
      setShowInlinePicker(false);
      setPickerSuccess(`Saved — ${picked} forecast loading…`);
      // Auto-clear the success badge after a few seconds.
      setTimeout(() => setPickerSuccess(null), 4000);
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      setPickerError(detail);
      // Also surface as Alert in case the inline state isn't visible.
      Alert.alert('Could not save', detail);
    } finally {
      setSavingTradeType(false);
      setPendingTradeType(null);
    }
  }

  const result: PredictionResult | null = useMemo(() => {
    if (loading) return null;
    return predict(
      tradeType,
      { forecastTempC, eventDate: eventDate ?? new Date().toISOString().slice(0, 10) },
      observations,
      dailyTakings,
    );
  }, [tradeType, forecastTempC, eventDate, observations, dailyTakings, loading]);

  // Persist the prediction snapshot once per event+temp so we can
  // compare against actuals later. The ref guard prevents re-saving on
  // re-renders.
  //
  // Don't persist a snapshot when the trade type is the fallback 'Other'
  // *and* the user hasn't actually chosen Other — i.e. the profile row
  // has no usable business_type yet. Otherwise event_predictions fills
  // up with rows tagged trade_type='Other' that don't reflect the
  // trader's real business, which corrupts later accuracy analysis.
  // A canonical 'Other' from an explicit raw='Other' is allowed through.
  // Also gate on isProfileLoaded — during load/error rawBusinessType
  // can be null (profile undefined) and we must not race a snapshot
  // write against a profile that hasn't arrived yet. The predicate
  // is exported from queries/profile.ts so the test suite asserts
  // exactly the runtime behaviour.
  const isExplicitTradeType = isExplicitTradeTypeFor(
    isProfileLoaded !== false,
    rawBusinessType,
  );
  useEffect(() => {
    if (!result || !user || !eventId) return;
    if (!isExplicitTradeType) return;
    const key = `${eventId}:${forecastTempC}`;
    if (savedRef.current === key) return;
    savedRef.current = key;
    savePrediction.mutate({
      eventId,
      userId: user.id,
      tradeType: canonicalTradeType,
      forecastTempC,
      weatherSummary: null,
      prediction: result,
    });
  }, [result, user, eventId, forecastTempC, canonicalTradeType, isExplicitTradeType]); // eslint-disable-line react-hooks/exhaustive-deps

  const lens = config.predictionLenses[0];
  if (!lens) return null;

  // Section label: derive from result kind once we have one.
  // While profile is loading (or errored), tradeType='Other' and lens.title
  // would be 'General demand forecast' — which shows as "GENERAL DEMAND
  // FORECAST" even for Coffee traders before their profile arrives. Gate it
  // to a neutral label so the heading doesn't flicker to the wrong trade.
  const sectionLabel = result?.kind === 'drink_split'
    ? 'Hot vs Iced Forecast'
    : result?.kind === 'general_demand'
      ? 'Demand Forecast'
      : (isProfileLoading || isProfileError)
        ? 'Demand Forecast'
        : lens.title;

  // Profile load failure: render a recovery banner instead of the
  // picker CTA. The Other fallback that the resolver returns during
  // an error state shouldn't be treated as a user choice to make —
  // it's a load failure and tapping the picker would just hit the
  // same broken loader. The card stays visible (so the rest of the
  // event detail still scrolls), but only as the banner.
  if (isProfileError) {
    return (
      <View style={{ marginBottom: 16 }}>
        <FarSectionRule label={sectionLabel} />
        <View style={{
          marginTop: 12,
          backgroundColor: p.surface,
          borderWidth: 1,
          borderColor: p.brand,
          padding: 14,
        }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: p.text, marginBottom: 4 }}>
            Couldn't load your trader profile
          </Text>
          <Text style={{ fontSize: 11, color: p.textMuted, lineHeight: 16, marginBottom: 10 }}>
            We can't compute a tailored forecast without it. Tap retry — or
            check your connection and try again.
          </Text>
          {/* Direct retry — invalidates + refetches the profile query
              without forcing a sign-out. useProfile's 5-min staleTime
              would otherwise pin a transient error for minutes. */}
          <TouchableOpacity
            onPress={retryProfile}
            disabled={retrying}
            accessibilityRole="button"
            accessibilityLabel="Retry loading trader profile"
            accessibilityState={{ disabled: retrying }}
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row', alignItems: 'center', gap: 8,
              borderWidth: 1, borderColor: p.text,
              paddingHorizontal: 12, paddingVertical: 8,
              minHeight: 36,
              opacity: retrying ? 0.5 : 1,
            }}
          >
            {retrying
              ? <ActivityIndicator color={p.text} size="small" />
              : <Ionicons name="refresh" size={12} color={p.text} />}
            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.text }}>
              {retrying ? 'RETRYING…' : 'RETRY'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <FarSectionRule label={sectionLabel} />
      <View style={{ marginTop: 12 }}>
        {loading || !result ? (
          <LoadingForecast tagline={isProfileLoading ? 'Loading your trading profile…' : lens.tagline} />
        ) : (
          <ForecastCard
            result={result}
            tagline={lens.tagline}
            tradeLabel={config.label}
            tradeMenuCategories={config.menuCategories}
            forecastTempC={forecastTempC}
            isDark={isDark}
            palette={p}
            canonicalTradeType={canonicalTradeType}
            rawBusinessType={rawBusinessType ?? null}
            onOpenSettings={() => router.push('/(tabs)/settings')}
            showInlinePicker={showInlinePicker}
            onTogglePicker={() => { setShowInlinePicker((v) => !v); setPickerError(null); }}
            onPickTradeType={pickTradeType}
            savingTradeType={savingTradeType}
            pendingTradeType={pendingTradeType}
            pickerError={pickerError}
            pickerSuccess={pickerSuccess}
            showWeather={forecastPrefs?.showWeather ?? true}
            showDrivers={forecastPrefs?.showDrivers ?? true}
            showPlanStock={forecastPrefs?.showPlanStock ?? true}
          />
        )}
      </View>
    </View>
  );
}

function LoadingForecast({ tagline }: { tagline: string }) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  return (
    <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 16 }}>
      <Text style={{ fontSize: 12, color: p.textMuted, fontStyle: 'italic' }}>{tagline}</Text>
      <Text style={{ fontSize: 11, color: p.textFaint, marginTop: 8 }}>Loading your past events…</Text>
    </View>
  );
}

function ForecastCard({
  result, tagline, tradeLabel, tradeMenuCategories, forecastTempC, isDark, palette,
  canonicalTradeType, rawBusinessType, onOpenSettings,
  showInlinePicker, onTogglePicker, onPickTradeType, savingTradeType, pendingTradeType,
  pickerError, pickerSuccess,
  showWeather, showDrivers, showPlanStock,
}: {
  result: PredictionResult;
  tagline: string;
  tradeLabel: string;
  tradeMenuCategories: string[];
  forecastTempC: number;
  isDark: boolean;
  palette: ReturnType<typeof useTheme>['tokens']['palette'];
  canonicalTradeType: string;
  rawBusinessType: string | null;
  onOpenSettings: () => void;
  showInlinePicker: boolean;
  onTogglePicker: () => void;
  onPickTradeType: (picked: string) => void;
  savingTradeType: boolean;
  pendingTradeType: string | null;
  pickerError: string | null;
  pickerSuccess: string | null;
  showWeather: boolean;
  showDrivers: boolean;
  showPlanStock: boolean;
}) {
  const p = palette;
  const conf = confidencePresentation(result.confidence, isDark, p);
  const isUnsetTradeType = canonicalTradeType === 'Other' || result.kind === 'general_demand';

  // Determine which stock categories to show in the "PLAN STOCK FOR" strip.
  // drink_split (Coffee): only coffee-relevant categories — never food mains/sides/extras.
  // general_demand (no trade type set): hide chips entirely, show set-trade-type prompt.
  // All other kinds: use the trade config's own categories (minus 'other').
  const planCategories: string[] = result.kind === 'drink_split'
    ? DRINK_SPLIT_PLAN_CATEGORIES
    : result.kind === 'general_demand'
      ? []
      : tradeMenuCategories.filter((cat) => cat !== 'other');

  return (
    <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 16 }}>
      {/* Trade type breadcrumb so the user can see what the engine is forecasting for. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1, color: p.textFaint }}>
          TRADE TYPE
        </Text>
        <View style={{
          borderWidth: 1, borderColor: isUnsetTradeType ? p.brand : p.border,
          paddingHorizontal: 6, paddingVertical: 2,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: isUnsetTradeType ? p.brand : p.textMuted, letterSpacing: 0.5 }}>
            {tradeLabel.toUpperCase()}
          </Text>
        </View>
        {isUnsetTradeType && (
          <TouchableOpacity onPress={onTogglePicker} accessibilityRole="button" accessibilityLabel="Pick trade type inline">
            <Text style={{ fontSize: 11, color: p.brand, fontWeight: '700' }}>{showInlinePicker ? 'Hide' : 'Change'} →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Prominent CTA when trade type isn't set — opens the inline picker
          right here so the user doesn't have to navigate to Settings. */}
      {isUnsetTradeType && !showInlinePicker && (
        <TouchableOpacity
          onPress={onTogglePicker}
          accessibilityRole="button"
          accessibilityLabel="Set your trade type for sharper forecasts"
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            borderWidth: 1, borderColor: p.brand,
            backgroundColor: p.surfaceAlt,
            paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
          }}
        >
          <Ionicons name="information-circle-outline" size={16} color={p.brand} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: p.text }}>
              Pick your trade type for a sharper forecast
            </Text>
            <Text style={{ fontSize: 11, color: p.textMuted, marginTop: 2, lineHeight: 15 }}>
              Coffee gets a hot/iced split, food gets attach rates, ice cream is weather-led.
              We're using the conservative general forecast for now.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={p.brand} />
        </TouchableOpacity>
      )}

      {/* Inline picker — let the user pick their trade type from the
          prediction card itself. Saves to profile.business_type and the
          card immediately re-renders with the right kind of forecast.

          Tap targets are 44pt minimum (iOS HIG) — the previous 22pt
          tiles missed taps frequently and the user couldn't pick Coffee. */}
      {isUnsetTradeType && showInlinePicker && (
        <View style={{
          borderWidth: 1, borderColor: p.brand,
          backgroundColor: p.surfaceAlt,
          padding: 14, marginBottom: 12,
        }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: p.text, marginBottom: 4 }}>
            What do you sell?
          </Text>
          <Text style={{ fontSize: 11, color: p.textMuted, marginBottom: 10, lineHeight: 15 }}>
            Tap any tile — the forecast updates as soon as we save.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {BUSINESS_TYPES.map((t) => {
              // While a save is in flight, prefer the just-tapped tile as
              // "selected" — otherwise the old canonical value stays
              // highlighted until the profile refetch arrives, which is
              // visually confusing right after the tap.
              const isCurrent = pendingTradeType
                ? t === pendingTradeType
                : t === canonicalTradeType;
              const isOtherDuringSave = savingTradeType && t !== pendingTradeType;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => onPickTradeType(t)}
                  disabled={savingTradeType}
                  accessibilityRole="radio"
                  accessibilityLabel={t}
                  accessibilityState={{ selected: isCurrent, disabled: savingTradeType }}
                  // 44pt minHeight = iOS recommended tap target. 14/12 padding
                  // gives a comfortable hit zone around the label text.
                  style={{
                    minHeight: 44,
                    paddingHorizontal: 14, paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: isCurrent ? p.brand : p.borderStrong,
                    backgroundColor: isCurrent ? p.brand : 'transparent',
                    opacity: isOtherDuringSave ? 0.4 : 1,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: isCurrent ? p.bg : p.text,
                  }}>
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {savingTradeType && (
            <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic', marginTop: 10 }}>
              Saving…
            </Text>
          )}
          {pickerError && !savingTradeType && (
            <View style={{
              borderTopWidth: 1, borderTopColor: p.border, borderStyle: 'dashed',
              marginTop: 10, paddingTop: 8,
            }}>
              <Text style={{ fontSize: 11, color: '#dc2626', fontWeight: '700', marginBottom: 2 }}>
                Couldn't save trade type
              </Text>
              <Text style={{ fontSize: 11, color: p.textMuted, lineHeight: 15 }}>
                {pickerError}
              </Text>
            </View>
          )}
          {__DEV__ && (
            <Text style={{ fontSize: 9, color: p.textFaint, marginTop: 10, fontFamily: 'Menlo' }}>
              dev: profile.business_type = {JSON.stringify(rawBusinessType)} → canonical {canonicalTradeType}
            </Text>
          )}
        </View>
      )}

      {/* Inline success badge — appears briefly after a successful save,
          before the card re-renders with the new trade type. */}
      {pickerSuccess && (
        <View style={{
          borderWidth: 1, borderColor: '#16a34a',
          backgroundColor: p.surfaceAlt,
          paddingHorizontal: 12, paddingVertical: 8,
          marginBottom: 12,
        }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#16a34a' }}>
            ✓ {pickerSuccess}
          </Text>
        </View>
      )}

      {/* Header: tagline + confidence badge */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: p.textMuted, fontStyle: 'italic', lineHeight: 18 }}>
            {tagline}
          </Text>
        </View>
        <View style={{ borderWidth: 1, borderColor: conf.color, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.5, color: conf.color, textTransform: 'uppercase' }}>
            {conf.label}
          </Text>
        </View>
      </View>

      {/* Learning state */}
      {result.learningMode && (
        <View style={{
          backgroundColor: p.surfaceAlt, padding: 10, marginBottom: 12,
          borderWidth: 1, borderColor: p.border,
        }}>
          <Text style={{ fontSize: 10, color: p.textMuted, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>
            LEARNING MODE
          </Text>
          <Text style={{ fontSize: 12, color: p.text, lineHeight: 18 }}>
            Add actual quantities sold after each event to improve future predictions. The more completed
            events you record, the sharper the {tradeLabel.toLowerCase()} forecast becomes.
          </Text>
        </View>
      )}

      {/* Forecast lines */}
      <View style={{ gap: 8 }}>
        {result.forecast.map((line, i) => (
          <View key={i} style={{
            flexDirection: 'row', alignItems: 'flex-start',
            paddingVertical: 8,
            borderBottomWidth: i < result.forecast.length - 1 ? 1 : 0,
            borderBottomColor: p.border,
            borderStyle: 'dashed',
          }}>
            {line.emoji && <Text style={{ fontSize: 18, marginRight: 10 }}>{line.emoji}</Text>}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: p.text, fontWeight: '600' }}>{line.label}</Text>
              {line.detail && (
                <Text style={{ fontSize: 11, color: p.textFaint, marginTop: 1 }}>{line.detail}</Text>
              )}
            </View>
            <Text style={{
              fontSize: 17, fontWeight: '700', color: p.text,
              fontVariant: ['tabular-nums'],
            }}>
              {line.value}
            </Text>
          </View>
        ))}
      </View>

      {showWeather && (
        /* Weather impact — respects forecast_weather preference */
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: p.surfaceAlt, padding: 10, marginTop: 12,
          borderWidth: 1, borderColor: p.border,
        }}>
          <Ionicons name="partly-sunny-outline" size={14} color={p.textMuted} />
          <Text style={{ fontSize: 11, color: p.text, flex: 1, lineHeight: 16 }}>
            {result.weatherImpact} (forecast {forecastTempC.toFixed(0)}°C)
          </Text>
        </View>
      )}

      {/* Drivers — respects forecast_drivers preference */}
      {showDrivers && (
        <View style={{ marginTop: 12, gap: 6 }}>
          {result.drivers.map((d, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Ionicons name="ellipse" size={5} color={p.textFaint} style={{ marginTop: 6 }} />
              <Text style={{ fontSize: 11, color: p.textMuted, flex: 1, lineHeight: 16 }}>{d}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Confidence reason + privacy note */}
      <View style={{ borderTopWidth: 1, borderTopColor: p.border, borderStyle: 'dashed', marginTop: 12, paddingTop: 10, gap: 6 }}>
        <Text style={{ fontSize: 10, color: p.textFaint, fontStyle: 'italic', lineHeight: 14 }}>
          {result.confidenceReason}
        </Text>
        <Text style={{ fontSize: 10, color: p.textFaint, lineHeight: 14 }}>
          {'Predictions use your own event history only. Your data is never pooled with other traders or sent to an AI service.'}
        </Text>
      </View>

      {/* Plan-stock-for chip strip — respects forecast_plan_stock preference.
          Hidden for general_demand — the top CTA already conveys the prompt.
          drink_split (Coffee): only drink categories, never food. */}
      {!showPlanStock || result.kind === 'general_demand' ? null : planCategories.length > 0 ? (
        <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: p.border, borderStyle: 'dashed' }}>
          <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1, fontWeight: '700', marginBottom: 6 }}>
            PLAN STOCK FOR
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {planCategories.map((cat) => {
              const def = CATEGORY_DEFINITIONS[cat];
              if (!def) return null;
              return (
                <View
                  key={cat}
                  style={{
                    borderWidth: 1, borderColor: p.border,
                    paddingHorizontal: 8, paddingVertical: 3,
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 10 }}>{def.emoji}</Text>
                  <Text style={{ fontSize: 10, color: p.textMuted, fontWeight: '600' }}>
                    {def.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function confidencePresentation(
  c: Confidence,
  isDark: boolean,
  p: ReturnType<typeof useTheme>['tokens']['palette'],
): { color: string; label: string } {
  if (c === 'high') return { color: '#16a34a', label: 'High confidence' };
  if (c === 'medium') return { color: p.brand, label: 'Medium confidence' };
  return { color: isDark ? '#fbbf24' : '#b45309', label: 'Low confidence' };
}
