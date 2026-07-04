import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/themeContext';
import { requiredPlanName, type FeatureKey } from '@/lib/iap/entitlements';

interface Props {
  feature: FeatureKey;
  /** One calm sentence describing what the feature does. */
  description: string;
  /** Compact renders a single-line row instead of a card. */
  compact?: boolean;
}

/**
 * Calm, non-aggressive inline upsell. Shown in place of a Pro feature
 * for Trader-tier users. Never blocks the rest of the screen.
 */
export function UpgradePrompt({ feature, description, compact = false }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  const router = useRouter();
  const plan = requiredPlanName(feature);

  if (compact) {
    return (
      <TouchableOpacity
        onPress={() => router.push('/(modal)/paywall')}
        accessibilityRole="button"
        accessibilityLabel={`${description} Included with ${plan}. View plans.`}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          borderWidth: 1, borderColor: p.border, borderStyle: 'dashed',
          backgroundColor: p.surface, paddingHorizontal: 12, paddingVertical: 10,
        }}
      >
        <Ionicons name="sparkles-outline" size={13} color={p.brand} />
        <Text style={{ flex: 1, fontSize: 12, color: p.textMuted }}>{description}</Text>
        <Text style={{ fontSize: 11, color: p.brand, fontWeight: '700' }}>{plan.toUpperCase()} →</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={{
      borderWidth: 1, borderColor: p.border,
      backgroundColor: p.surface, padding: 16, gap: 8,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="sparkles-outline" size={14} color={p.brand} />
        <Text style={{ fontSize: 10, color: p.brand, letterSpacing: 1.5, fontWeight: '700' }}>
          {`INCLUDED WITH ${plan.toUpperCase()}`}
        </Text>
      </View>
      <Text style={{ fontSize: 13, color: p.text, lineHeight: 19 }}>{description}</Text>
      <TouchableOpacity
        onPress={() => router.push('/(modal)/paywall')}
        accessibilityRole="button"
        accessibilityLabel={`View ${plan} plan`}
        style={{
          alignSelf: 'flex-start', marginTop: 4,
          borderWidth: 1, borderColor: p.text,
          paddingHorizontal: 14, paddingVertical: 8, minHeight: 36,
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 11, color: p.text, fontWeight: '700', letterSpacing: 1 }}>
          VIEW PLANS
        </Text>
      </TouchableOpacity>
    </View>
  );
}
