// Trade-aware prediction surface.
//
// Picks the right prediction renderer (drink-split for coffee, weather-led
// guidance for ice cream / juice, mains-attach guidance for food traders,
// etc.) based on the trade type configured in lib/tradeTypeConfig.
//
// Coffee gets the data-driven drink-split engine. Other trades currently
// receive directional weather/timing guidance — the data-driven engines
// for those (mains attachment rates, footfall-weighted demand) are
// scaffolded here as a follow-up; see TODOs at the bottom.

import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/themeContext';
import { FarSectionRule } from '@/components/far/SectionRule';
import { DrinkSplitInsightCard } from '@/components/events/DrinkSplitInsightCard';
import { getTradeConfig, type PredictionLens, type TradeTypeConfig } from '@/lib/tradeTypeConfig';
import { CATEGORY_DEFINITIONS } from '@/types/cogs';

interface Props {
  tradeType: string | null;
  forecastTempC: number;
  expectedTakings?: number;
}

export function PredictionInsightCard({ tradeType, forecastTempC, expectedTakings }: Props) {
  const config = getTradeConfig(tradeType);

  return (
    <>
      {config.predictionLenses.map((lens, i) => (
        <View key={`${lens.kind}-${i}`} style={{ marginBottom: i < config.predictionLenses.length - 1 ? 16 : 0 }}>
          <FarSectionRule label={lens.title} />
          <View style={{ marginTop: 12 }}>
            <LensRenderer
              lens={lens}
              config={config}
              forecastTempC={forecastTempC}
              expectedTakings={expectedTakings}
            />
          </View>
        </View>
      ))}
    </>
  );
}

function LensRenderer({
  lens, config, forecastTempC, expectedTakings,
}: {
  lens: PredictionLens;
  config: TradeTypeConfig;
  forecastTempC: number;
  expectedTakings?: number;
}) {
  switch (lens.kind) {
    case 'drink_split':
      return <DrinkSplitInsightCard forecastTempC={forecastTempC} expectedTakings={expectedTakings} />;
    case 'cold_demand':
    case 'food_attach':
    case 'morning_bake':
    case 'evening_sweet':
    case 'beverage_mix':
    case 'general_demand':
    default:
      return (
        <DirectionalForecastCard
          lens={lens}
          config={config}
          forecastTempC={forecastTempC}
        />
      );
  }
}

/**
 * Renderer for trades without a fully-trained data engine (yet).
 *
 * Surfaces the temperature, the trade's weather sensitivity, and the
 * lens drivers as a punch-list so the trader knows what to plan around.
 * Once we have enough historical data per trade type we can replace this
 * with proper attachment-rate / cold-demand engines.
 */
function DirectionalForecastCard({
  lens, config, forecastTempC,
}: {
  lens: PredictionLens;
  config: TradeTypeConfig;
  forecastTempC: number;
}) {
  const { tokens, isDark } = useTheme();
  const p = tokens.palette;

  const tempBucket = forecastTempC < 12 ? 'cold' : forecastTempC < 18 ? 'cool' : forecastTempC < 23 ? 'warm' : 'hot';
  const tempLabel = ({ cold: '❄️ Cold', cool: '🌤 Cool', warm: '☀️ Warm', hot: '🔥 Hot' } as const)[tempBucket];

  const sensitivityColor = config.weatherSensitivity === 'high'
    ? (isDark ? '#fbbf24' : '#b45309')
    : config.weatherSensitivity === 'medium'
      ? p.brand
      : p.textMuted;

  const swing = directionalSwing(lens.kind, forecastTempC, config.weatherSensitivity);

  return (
    <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 16, marginBottom: 12 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: p.textMuted, fontStyle: 'italic', lineHeight: 18 }}>{lens.tagline}</Text>
        </View>
        <View style={{ borderWidth: 1, borderColor: sensitivityColor, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.5, color: sensitivityColor, textTransform: 'uppercase' }}>
            {config.weatherSensitivity} weather sensitivity
          </Text>
        </View>
      </View>

      {/* Forecast strip */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: p.surfaceAlt, padding: 10,
        borderWidth: 1, borderColor: p.border, marginBottom: 10,
      }}>
        <Text style={{ fontSize: 11, color: p.textMuted }}>{tempLabel}</Text>
        <Text style={{ fontSize: 11, color: p.textFaint }}>·</Text>
        <Text style={{ fontSize: 11, color: p.text, fontWeight: '600' }}>{forecastTempC.toFixed(0)}°C forecast</Text>
        <Text style={{ fontSize: 11, color: p.textFaint }}>·</Text>
        <Text style={{ fontSize: 11, color: swing.color, fontWeight: '600' }}>{swing.label}</Text>
      </View>

      {/* Drivers */}
      <View style={{ gap: 6 }}>
        {lens.drivers.map((d, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Ionicons name="ellipse" size={5} color={p.textFaint} style={{ marginTop: 6 }} />
            <Text style={{ fontSize: 12, color: p.text, flex: 1, lineHeight: 18 }}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Plan stock for — visible per-trade category chips */}
      {config.menuCategories.length > 0 && (
        <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: p.border, borderStyle: 'dashed' }}>
          <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1, fontWeight: '700', marginBottom: 6 }}>
            PLAN STOCK FOR
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {config.menuCategories
              .filter((cat) => cat !== 'other')
              .map((cat) => {
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
      )}

      {/* Demand pattern footnote */}
      <View style={{ borderTopWidth: 1, borderTopColor: p.border, borderStyle: 'dashed', marginTop: 12, paddingTop: 10 }}>
        <Text style={{ fontSize: 10, color: p.textFaint, fontStyle: 'italic', lineHeight: 15 }}>
          {config.demandPattern}
        </Text>
      </View>
    </View>
  );
}

/** Heuristic: for non-coffee lenses, what direction should demand swing
 *  given the forecast? Used purely for the headline strip — not stock
 *  guidance. */
function directionalSwing(
  kind: PredictionLens['kind'],
  tempC: number,
  sensitivity: TradeTypeConfig['weatherSensitivity'],
): { label: string; color: string } {
  // Cold-demand / juice: heat = strong, cold = weak
  if (kind === 'cold_demand') {
    if (tempC >= 23) return { label: 'demand likely strong', color: '#16a34a' };
    if (tempC >= 18) return { label: 'demand normal', color: '#16a34a' };
    if (tempC >= 12) return { label: 'demand soft', color: '#b45309' };
    return { label: 'demand weak', color: '#dc2626' };
  }
  // Food: meal-time-led, only mild weather effect
  if (kind === 'food_attach') {
    if (tempC >= 23) return { label: 'lift drinks attach', color: '#16a34a' };
    if (tempC < 12) return { label: 'softer footfall', color: '#b45309' };
    return { label: 'normal trading', color: '#16a34a' };
  }
  // Bakery: weather mostly irrelevant
  if (kind === 'morning_bake') {
    if (tempC < 5) return { label: 'cold lift on hot bakes', color: '#b45309' };
    return { label: 'plan to morning peak', color: '#16a34a' };
  }
  // Dessert: evening-led, mild weather effect
  if (kind === 'evening_sweet') {
    if (tempC >= 22) return { label: 'cold desserts up', color: '#b45309' };
    if (tempC < 10) return { label: 'hot desserts up', color: '#b45309' };
    return { label: 'normal evening trade', color: '#16a34a' };
  }
  // Bar / drinks
  if (kind === 'beverage_mix') {
    if (tempC >= 22) return { label: 'cold-soft attach up', color: '#b45309' };
    return { label: 'normal evening trade', color: '#16a34a' };
  }
  // Generic
  if (sensitivity === 'high') {
    if (tempC >= 22) return { label: 'demand likely strong', color: '#16a34a' };
    if (tempC < 12) return { label: 'demand soft', color: '#b45309' };
  }
  return { label: 'normal trading', color: '#16a34a' };
}

// ── Future improvements ────────────────────────────────────────────────
// 1. Trade-specific historical engines:
//    - food_attach: train an attachment-rate model (sides ÷ mains, drinks
//      ÷ mains) per event_financials row, weight-adjusted for footfall.
//    - cold_demand: regress total_takings against avg_temp_c for ice
//      cream / juice traders, then forecast units from forecast temp.
//    - morning_bake: predict sell-out time from past daily_takings.
// 2. Confidence scores per prediction line.
// 3. Day-of-week trend overlay (use event date weekday).
// 4. Seasonal trend (month-of-year baseline).
// 5. "Recommended stock" outputs once we have a unit-cost pathway in
//    product_catalog (already exists) and forecast units (TODO).
// 6. Waste-reduction warnings: if predicted < last week, suggest reducing
//    perishable prep by N%.
