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
const CURRENT_YEAR = new Date().getFullYear();

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

  React.useEffect(() => {
    if (isEntitled) router.replace('/(tabs)/dashboard');
  }, [isEntitled, router]);

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        keyboardDismissMode="on-drag"
      >
        {/* ── Top masthead ── */}
        <View style={{
          paddingHorizontal: 24, paddingTop: 28, paddingBottom: 18,
          borderBottomWidth: 2, borderBottomColor: p.text, alignItems: 'center',
        }}>
          <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 3, fontWeight: '700' }}>
            {`EST. 2024 · VOL. ${CURRENT_YEAR}`}
          </Text>
          <Text style={{
            fontFamily: tokens.type.display,
            fontWeight: tokens.type.displayWeight,
            fontSize: 56, letterSpacing: -1.7, lineHeight: 56,
            marginTop: 6, color: p.text,
          }}>
            Brewed
          </Text>
          <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic', marginTop: 6 }}>
            The trader's ledger — for the road.
          </Text>
        </View>

        {/* ── Hero ── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 26, paddingBottom: 4 }}>
          <Text style={{ fontSize: 10, color: p.textMuted, letterSpacing: 2, fontWeight: '700' }}>
            {'BREWED PRO · MONTHLY'}
          </Text>
          <Text style={{
            fontFamily: tokens.type.display,
            fontWeight: tokens.type.displayWeight,
            fontSize: 32, letterSpacing: -0.7, lineHeight: 34,
            marginTop: 6, color: p.text,
          }}>
            {'Open the books.\nKeep the round on time.'}
          </Text>
        </View>

        {/* ── Price stamp ── */}
        <View style={{ alignItems: 'center', marginTop: 26 }}>
          <View style={{
            borderWidth: 2, borderColor: p.text,
            paddingHorizontal: 26, paddingTop: 10, paddingBottom: 12,
            transform: [{ rotate: '-1.5deg' }],
            shadowColor: p.borderStrong,
            shadowOffset: { width: 2, height: 2 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 2,
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 2, fontWeight: '700' }}>
              {'PITCH FEE'}
            </Text>
            <Text style={{
              fontFamily: tokens.type.display,
              fontWeight: tokens.type.displayWeight,
              fontSize: 44, letterSpacing: -1, lineHeight: 46,
              color: p.text, marginTop: 2,
              fontVariant: ['tabular-nums'],
            }}>
              {displayPrice}
            </Text>
          </View>
          <Text style={{ marginTop: 12, fontSize: 11, color: p.textMuted, fontStyle: 'italic' }}>
            Auto-renews monthly. Cancel anytime in Settings.
          </Text>
        </View>

        {/* ── Newspaper rule ── */}
        <View style={{ paddingHorizontal: 24, marginTop: 28, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: p.borderStrong }} />
          <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 2, fontWeight: '700' }}>
            {'WHAT YOU GET'}
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: p.borderStrong }} />
        </View>

        {/* ── Feature list ── */}
        <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
          {detail.features.map((feature, i) => (
            <View
              key={feature}
              style={{
                flexDirection: 'row', alignItems: 'flex-start', gap: 12,
                paddingVertical: 10,
                borderBottomWidth: i === detail.features.length - 1 ? 0 : 1,
                borderBottomColor: p.border,
                borderStyle: 'dashed',
              }}
            >
              <View style={{
                width: 14, height: 14, marginTop: 3,
                borderWidth: 1.5, borderColor: p.text,
                alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <View style={{ width: 8, height: 8, backgroundColor: p.text }} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, color: p.text, lineHeight: 20 }}>
                {feature}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Privacy reassurance stamp ── */}
        <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
          <View style={{
            borderWidth: 1, borderColor: p.borderStrong,
            paddingHorizontal: 14, paddingVertical: 14,
            backgroundColor: p.surface,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Ionicons name="lock-closed-outline" size={12} color={p.brand} />
              <Text style={{ fontSize: 10, color: p.brand, letterSpacing: 1.5, fontWeight: '700' }}>
                {'YOUR FINANCIALS, YOUR EYES'}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: p.text, lineHeight: 18 }}>
              Sales, costs, margins — never sold, never shared, never used for ads. Apple processes the
              payment; we don't see your card. Read the full{' '}
              <Text
                onPress={() => router.push('/(modal)/privacy')}
                style={{ color: p.brand, fontWeight: '700' }}
              >
                privacy summary
              </Text>.
            </Text>
          </View>
        </View>

        {/* ── CTA ── */}
        <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
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
                {Platform.OS === 'ios' ? 'OPEN THE LEDGER' : 'SUBSCRIPTIONS REQUIRE iOS'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={restore}
            disabled={isRestoring || !isReady}
            accessibilityRole="button"
            accessibilityLabel="Restore previous purchases"
            style={{
              alignItems: 'center', justifyContent: 'center',
              paddingVertical: 12, minHeight: 44, marginTop: 8,
              borderWidth: 1, borderColor: p.text,
            }}
          >
            {isRestoring ? (
              <ActivityIndicator color={p.text} size="small" />
            ) : (
              <Text style={{ color: p.text, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>
                {'RESTORE PURCHASES'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Legal small print (App Store mandatory) ── */}
        <View style={{ paddingHorizontal: 24, marginTop: 18, gap: 10 }}>
          <Text style={{ fontSize: 11, color: p.textMuted, lineHeight: 16, fontStyle: 'italic' }}>
            Payment will be charged to your Apple ID at confirmation. Subscription auto-renews unless turned
            off at least 24 hours before the period ends. Manage or cancel any time in your Apple ID Settings;
            unused free trial is forfeited when a subscription is purchased.
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 4 }}>
            <TouchableOpacity onPress={() => Linking.openURL(APPLE_EULA_URL)} accessibilityRole="link" accessibilityLabel="Terms of Use">
              <Text style={{ fontSize: 11, color: p.brand, fontWeight: '600' }}>Terms of Use</Text>
            </TouchableOpacity>
            <Text style={{ color: p.textFaint }}>·</Text>
            <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link" accessibilityLabel="Privacy Policy">
              <Text style={{ fontSize: 11, color: p.brand, fontWeight: '600' }}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Footer — sign-out escape hatch ── */}
        <View style={{
          paddingHorizontal: 24, paddingTop: 22, paddingBottom: 14,
          marginTop: 28, borderTopWidth: 1, borderTopColor: p.border,
          alignItems: 'center',
        }}>
          <Text style={{ fontSize: 12, color: p.textMuted, fontStyle: 'italic' }}>
            Not the right time?
          </Text>
          <TouchableOpacity
            onPress={signOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            style={{ paddingVertical: 6, marginTop: 2 }}
          >
            <Text style={{
              color: p.brand, fontFamily: tokens.type.display,
              fontSize: 16, letterSpacing: 0.3,
            }}>
              Sign out for now →
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
