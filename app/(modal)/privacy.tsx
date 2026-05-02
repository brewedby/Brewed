import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/themeContext';

const FULL_POLICY_URL = 'https://brewedbyboon.com/privacy';
const SUPPORT_EMAIL = 'support@brewedbyboon.com';

const SECTIONS = [
  {
    eyebrow: 'YOUR FINANCIAL DATA',
    title: 'Stays where it belongs.',
    body: 'Gross sales, costs, margins, staffing rates and supplier prices are stored in your account on our cloud database (Supabase, hosted in the EU). They are never sold, shared with advertisers, or used for marketing. They are not analysed by us for any purpose other than syncing your devices and producing your reports.',
  },
  {
    eyebrow: 'PAYMENTS',
    title: "Apple handles the money.",
    body: 'Your Brewed Pro subscription is processed by Apple via the App Store. We never see your card number, billing address or full payment details — only a confirmation that your subscription is active.',
  },
  {
    eyebrow: 'BREWED DISCOVER',
    title: 'Public events only.',
    body: 'The Discover tab uses Brave Search to find publicly listed UK festivals and concessions companies. Your personal financial data is never sent to Brave. Search queries are generic (e.g. "UK street food market 2025"), not personalised.',
  },
  {
    eyebrow: 'WHAT WE DO COLLECT',
    title: 'Your account, and that\'s it.',
    body: 'Email address (for sign-in), business name (for the dashboard), and the events / financials / fleet / documents you choose to enter. No analytics, no crash trackers, no advertising IDs, no location tracking, no device fingerprinting.',
  },
  {
    eyebrow: 'YOUR RIGHTS',
    title: 'Export or delete, any time.',
    body: 'Under UK GDPR you can export your data (Reports → CSV export), correct anything wrong, or delete your account from Settings → Sign out then email us. We will erase all of your data within 30 days.',
  },
];

export default function PrivacySummaryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tokens } = useTheme();
  const p = tokens.palette;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 16 }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons name="chevron-back" size={14} color={p.brand} />
            <Text style={{ color: p.brand, fontSize: 13, fontWeight: '600' }}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* ── Title ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: p.text }}>
          <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 2, fontWeight: '700' }}>
            {'PRIVACY · IN BRIEF'}
          </Text>
          <Text style={{
            fontFamily: tokens.type.display,
            fontWeight: tokens.type.displayWeight,
            fontSize: 32, letterSpacing: -0.7, lineHeight: 34,
            marginTop: 6, color: p.text,
          }}>
            How your data is handled.
          </Text>
          <Text style={{ fontSize: 12, color: p.textMuted, fontStyle: 'italic', marginTop: 8, lineHeight: 18 }}>
            Plain English. The full policy lives on our website.
          </Text>
        </View>

        {/* ── Sections ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          {SECTIONS.map((s, i) => (
            <View
              key={s.eyebrow}
              style={{
                paddingVertical: 18,
                borderBottomWidth: i === SECTIONS.length - 1 ? 0 : 1,
                borderBottomColor: p.border,
                borderStyle: 'dashed',
              }}
            >
              <Text style={{ fontSize: 9, color: p.brand, letterSpacing: 1.8, fontWeight: '700' }}>
                {s.eyebrow}
              </Text>
              <Text style={{
                fontFamily: tokens.type.display,
                fontSize: 22, lineHeight: 26,
                color: p.text, marginTop: 4,
              }}>
                {s.title}
              </Text>
              <Text style={{ fontSize: 13, color: p.text, marginTop: 8, lineHeight: 20 }}>
                {s.body}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Closing stamp ── */}
        <View style={{ alignItems: 'center', marginTop: 22 }}>
          <View style={{
            borderWidth: 2, borderColor: p.brand,
            paddingHorizontal: 16, paddingVertical: 8,
            transform: [{ rotate: '-1.5deg' }],
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 9, color: p.brand, letterSpacing: 2, fontWeight: '700' }}>
              {'BREWED · IN TRUST'}
            </Text>
            <Text style={{
              fontFamily: tokens.type.display,
              fontSize: 14, color: p.brand, marginTop: 1,
            }}>
              Your books, your business.
            </Text>
          </View>
        </View>

        {/* ── Links ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 32, gap: 12 }}>
          <TouchableOpacity
            onPress={() => Linking.openURL(FULL_POLICY_URL)}
            accessibilityRole="link"
            accessibilityLabel="Read the full privacy policy"
            style={{ borderWidth: 1, borderColor: p.text, paddingVertical: 14, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 1.5, color: p.text }}>
              {'READ FULL PRIVACY POLICY'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Brewed%20-%20Privacy%20Question`)}
            accessibilityRole="link"
            accessibilityLabel="Email support about privacy"
            style={{ alignItems: 'center', paddingVertical: 8 }}
          >
            <Text style={{ fontSize: 12, color: p.brand, fontWeight: '600', fontStyle: 'italic' }}>
              {SUPPORT_EMAIL}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
