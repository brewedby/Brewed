import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/themeContext';
import { useSubscription } from '@/lib/iap/SubscriptionContext';
import { useAuth } from '@/lib/auth';
import { PRODUCT_IDS, SUBSCRIPTION_DETAILS } from '@/lib/iap/products';

const APPLE_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://brewedbyboon.com/privacy';

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tokens } = useTheme();
  const p = tokens.palette;
  const { signOut } = useAuth();
  const {
    isReady, isEntitled, isPurchasing, isRestoring,
    displayPrice, purchase, restore,
  } = useSubscription();

  const detail = SUBSCRIPTION_DETAILS[PRODUCT_IDS.proMonthly];

  // If user becomes entitled (e.g. via restore), close paywall
  React.useEffect(() => {
    if (isEntitled) router.replace('/(tabs)/dashboard');
  }, [isEntitled, router]);

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        keyboardDismissMode="on-drag"
      >
        {/* ── Masthead ── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 18, borderBottomWidth: 2, borderBottomColor: p.text, alignItems: 'center' }}>
          <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 3, fontWeight: '700' }}>
            {'BREWED · PRO SUBSCRIPTION'}
          </Text>
          <Text style={{
            fontFamily: tokens.type.display,
            fontWeight: tokens.type.displayWeight,
            fontSize: 44, letterSpacing: -1.2, lineHeight: 46,
            marginTop: 8, color: p.text, textAlign: 'center',
          }}>
            The trader's ledger
          </Text>
          <Text style={{ fontSize: 12, color: p.textMuted, fontStyle: 'italic', marginTop: 8, textAlign: 'center' }}>
            Open the books. Track every event. Keep the round on time.
          </Text>
        </View>

        {/* ── Price stamp ── */}
        <View style={{ alignItems: 'center', marginTop: 28, marginBottom: 8 }}>
          <View style={{
            borderWidth: 2, borderColor: p.text, paddingHorizontal: 22, paddingVertical: 14,
            transform: [{ rotate: '-1deg' }],
          }}>
            <Text style={{ fontFamily: tokens.type.display, fontSize: 36, color: p.text, letterSpacing: -0.5 }}>
              {displayPrice}
            </Text>
          </View>
          <Text style={{ marginTop: 10, fontSize: 11, color: p.textMuted, fontStyle: 'italic' }}>
            Auto-renews monthly. Cancel anytime in Settings.
          </Text>
        </View>

        {/* ── What you get ── */}
        <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
          <Text style={{ fontSize: 10, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 12 }}>
            {'WHAT YOU GET'}
          </Text>
          {detail.features.map((feature) => (
            <View key={feature} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <Ionicons name="checkmark" size={16} color={p.brand} style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, fontSize: 14, color: p.text, lineHeight: 20 }}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* ── Privacy reassurance ── */}
        <View style={{
          marginHorizontal: 24, marginTop: 24, padding: 14,
          borderWidth: 1, borderColor: p.borderStrong, backgroundColor: p.surface,
        }}>
          <Text style={{ fontSize: 10, color: p.brand, letterSpacing: 1.5, fontWeight: '700', marginBottom: 6 }}>
            {'YOUR FINANCIALS, YOUR EYES'}
          </Text>
          <Text style={{ fontSize: 12, color: p.text, lineHeight: 18 }}>
            Sales, costs, margins — never sold, never shared, never used for ads. Apple processes the payment;
            we don't see your card. Read the full{' '}
            <Text
              onPress={() => router.push('/(modal)/privacy')}
              style={{ color: p.brand, fontWeight: '700' }}
            >
              privacy summary
            </Text>.
          </Text>
        </View>

        {/* ── CTA ── */}
        <View style={{ paddingHorizontal: 24, marginTop: 28 }}>
          <TouchableOpacity
            onPress={() => purchase()}
            disabled={!isReady || isPurchasing}
            accessibilityRole="button"
            accessibilityLabel={`Subscribe for ${displayPrice}`}
            accessibilityState={{ disabled: !isReady || isPurchasing }}
            style={{
              backgroundColor: p.text, paddingVertical: 16, alignItems: 'center', minHeight: 52,
              opacity: !isReady || isPurchasing ? 0.5 : 1,
            }}
          >
            {isPurchasing ? (
              <ActivityIndicator color={p.bg} />
            ) : (
              <Text style={{ color: p.bg, fontWeight: '700', fontSize: 13, letterSpacing: 2 }}>
                {Platform.OS === 'ios' ? 'SUBSCRIBE' : 'SUBSCRIPTIONS REQUIRE iOS'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={restore}
            disabled={isRestoring || !isReady}
            accessibilityRole="button"
            accessibilityLabel="Restore previous purchases"
            style={{ alignItems: 'center', paddingVertical: 14, marginTop: 4 }}
          >
            {isRestoring ? (
              <ActivityIndicator color={p.brand} size="small" />
            ) : (
              <Text style={{ color: p.brand, fontSize: 13, fontWeight: '600', fontStyle: 'italic' }}>
                Restore purchases
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Legal small print (App Store mandatory) ── */}
        <View style={{ paddingHorizontal: 24, marginTop: 12, gap: 8 }}>
          <Text style={{ fontSize: 11, color: p.textMuted, lineHeight: 16, fontStyle: 'italic' }}>
            Payment will be charged to your Apple ID at confirmation. Subscription auto-renews unless turned
            off at least 24 hours before the period ends. Manage or cancel any time in your Apple ID Settings;
            unused free trial is forfeited when a subscription is purchased.
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 6 }}>
            <TouchableOpacity onPress={() => Linking.openURL(APPLE_EULA_URL)} accessibilityRole="link" accessibilityLabel="Terms of Use">
              <Text style={{ fontSize: 11, color: p.brand, fontWeight: '600' }}>Terms of Use</Text>
            </TouchableOpacity>
            <Text style={{ color: p.textFaint }}>·</Text>
            <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link" accessibilityLabel="Privacy Policy">
              <Text style={{ fontSize: 11, color: p.brand, fontWeight: '600' }}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Sign out (escape hatch) ── */}
        <View style={{ alignItems: 'center', marginTop: 32 }}>
          <TouchableOpacity
            onPress={signOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            style={{ paddingVertical: 8, paddingHorizontal: 16 }}
          >
            <Text style={{ fontSize: 12, color: p.textMuted, fontStyle: 'italic' }}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
