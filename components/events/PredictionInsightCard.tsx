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

import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/themeContext';
import { FarSectionRule } from '@/components/far/SectionRule';
import { useEventObservations } from '@/lib/queries/eventObservations';
import { useAllDailyTakings } from '@/lib/queries/dailyTakings';
import { getTradeConfig, normalizeTradeType } from '@/lib/tradeTypeConfig';
import { CATEGORY_DEFINITIONS } from '@/types/cogs';
import { predict, type PredictionResult, type Confidence } from '@/lib/predictionEngine';
import { useSavePrediction } from '@/lib/mutations/predictions';
import { useAuth } from '@/lib/auth';

// Categories shown in "PLAN STOCK FOR" when the engine returns drink_split.
// Coffee/drink traders never see food mains/sides/extras chips.
const DRINK_SPLIT_PLAN_CATEGORIES = ['hot_drinks', 'cold_drinks', 'bakes'];

interface Props {
  tradeType: string | null;
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
}

export function PredictionInsightCard({ tradeType, forecastTempC, eventDate, eventId, isProfileLoading }: Props) {
  const config = getTradeConfig(tradeType);
  const canonicalTradeType = normalizeTradeType(tradeType);
  const { tokens, isDark } = useTheme();
  const p = tokens.palette;
  const router = useRouter();

  const { user } = useAuth();
  const savePrediction = useSavePrediction();
  const savedRef = useRef<string | null>(null);

  const { data: observations = [], isLoading: obsLoading } = useEventObservations();
  const { data: dailyTakings = [], isLoading: dtLoading } = useAllDailyTakings();
  const loading = obsLoading || dtLoading || !!isProfileLoading;

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
  // compare against actuals later. The ref guard prevents re-saving on re-renders.
  useEffect(() => {
    if (!result || !user || !eventId) return;
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
  }, [result, user, eventId, forecastTempC, canonicalTradeType]); // eslint-disable-line react-hooks/exhaustive-deps

  const lens = config.predictionLenses[0];
  if (!lens) return null;

  // Derive section label from prediction result kind when available,
  // so a coffee trader with no profile trade type set still sees a
  // sensible label once the engine resolves.
  const sectionLabel = result?.kind === 'drink_split'
    ? 'Hot vs Iced Forecast'
    : result?.kind === 'general_demand'
      ? 'Demand Forecast'
      : lens.title;

  return (
    <View style={{ marginBottom: 16 }}>
      <FarSectionRule label={sectionLabel} />
      <View style={{ marginTop: 12 }}>
        {loading || !result ? (
          <LoadingForecast tagline={lens.tagline} />
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
            onOpenSettings={() => router.push('/(tabs)/settings')}
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
  canonicalTradeType, onOpenSettings,
}: {
  result: PredictionResult;
  tagline: string;
  tradeLabel: string;
  tradeMenuCategories: string[];
  forecastTempC: number;
  isDark: boolean;
  palette: ReturnType<typeof useTheme>['tokens']['palette'];
  canonicalTradeType: string;
  onOpenSettings: () => void;
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
          <TouchableOpacity onPress={onOpenSettings} accessibilityRole="button" accessibilityLabel="Open settings to set trade type">
            <Text style={{ fontSize: 11, color: p.brand, fontWeight: '700' }}>Change →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Prominent CTA when trade type isn't set — this is the actual fix for
          users who never realised the engine fell back to General. */}
      {isUnsetTradeType && (
        <TouchableOpacity
          onPress={onOpenSettings}
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
              Set your trade type for a sharper forecast
            </Text>
            <Text style={{ fontSize: 11, color: p.textMuted, marginTop: 2, lineHeight: 15 }}>
              Coffee gets a hot/iced split, food gets attach rates, ice cream is weather-led.
              We're using the conservative general forecast for now.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={p.brand} />
        </TouchableOpacity>
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

      {/* Weather impact */}
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

      {/* Drivers */}
      <View style={{ marginTop: 12, gap: 6 }}>
        {result.drivers.map((d, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Ionicons name="ellipse" size={5} color={p.textFaint} style={{ marginTop: 6 }} />
            <Text style={{ fontSize: 11, color: p.textMuted, flex: 1, lineHeight: 16 }}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Confidence reason + privacy note */}
      <View style={{ borderTopWidth: 1, borderTopColor: p.border, borderStyle: 'dashed', marginTop: 12, paddingTop: 10, gap: 6 }}>
        <Text style={{ fontSize: 10, color: p.textFaint, fontStyle: 'italic', lineHeight: 14 }}>
          {result.confidenceReason}
        </Text>
        <Text style={{ fontSize: 10, color: p.textFaint, lineHeight: 14 }}>
          {'Predictions use your own event history only. Your data is never pooled with other traders or sent to an AI service.'}
        </Text>
      </View>

      {/* Plan-stock-for chip strip.
          Hidden for general_demand — the top CTA already conveys the prompt.
          drink_split (Coffee): only drink categories, never food. */}
      {result.kind === 'general_demand' ? null : planCategories.length > 0 ? (
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
