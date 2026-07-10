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
    body: 'Gross sales, costs, margins, staffing rates and supplier prices are stored in your account on our cloud database (Supabase, hosted in the EU). Never sold, shared with advertisers, or used for marketing. Not analysed by us for any purpose other than syncing your devices and producing your reports.',
  },
  {
    eyebrow: 'PAYMENTS',
    title: 'Apple handles the money.',
    body: 'Your Brewed subscription (Trader or Pro) is processed by Apple via the App Store. We never see your card number, billing address or full payment details — only a confirmation of which plan is active.',
  },
  {
    eyebrow: 'BREWED DISCOVER',
    title: 'Public events only.',
    body: 'The Discover tab uses Brave Search to find publicly listed UK festivals and concessions companies. Your personal financial data is never sent to Brave. Search queries are generic ("UK street food market 2025"), not personalised.',
  },
  {
    eyebrow: 'WHAT WE DO COLLECT',
    title: "Your account, and that's it.",
    body: 'Email address (for sign-in), business name (for the dashboard), and the events / financials / fleet / documents you choose to enter. Event date and location are used with a public weather service (Open-Meteo, GDPR-compliant) to fetch forecasts. No analytics, no crash trackers, no advertising IDs, no device fingerprinting.',
  },
  {
    eyebrow: 'SALES REPORT & DOCUMENT IMPORTS',
    title: 'Read on your device.',
    body: 'Sales reports, settlement statements, deduction statements and contracts you import (CSV or PDF) are read and parsed entirely on your device. The file itself is never uploaded, never stored, never sent to an OCR or AI service, and never logged — only a fingerprint (hash) is kept to warn about duplicate imports. Personal details found in reports, such as customer emails or card numbers, are discarded before anything is shown or saved. Only the structured values you review and confirm are saved to your account, exactly like data you type in yourself.',
  },
  {
    eyebrow: 'PREDICTIONS & LEARNING',
    title: 'Local learning. Your data only.',
    body: 'The Brewed prediction engine uses your own completed event history — actual sales quantities, weather snapshots, event dates, and past forecast accuracy — to improve your forecasts over time. This learning is isolated to your account. The developer does not pool your data with other traders, does not use it to train predictions for other businesses, and does not share or sell it. Cost of goods (COGS) is set only by you — typed in directly, or calculated from a sales report you review and confirm. The prediction engine never infers, changes, or uploads it. No financial, product, or sales data is sent to an external AI or machine-learning service.',
  },
  {
    eyebrow: 'YOUR RIGHTS',
    title: 'Export or delete, any time.',
    body: 'Under UK GDPR you can export your data (Reports → CSV export), correct anything wrong, or permanently delete your account and every piece of data in Settings → Delete Account — it takes effect immediately. You can also email us and we will erase everything within 30 days.',
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

        {/* ── INSIDE — table of contents strip ── */}
        <View style={{
          paddingHorizontal: 20, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: p.borderStrong,
          backgroundColor: p.surface,
        }}>
          <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 8 }}>
            {'INSIDE'}
          </Text>
          {SECTIONS.map((s, i) => (
            <View key={s.eyebrow} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingVertical: 4 }}>
              <Text style={{ fontFamily: tokens.type.mono, fontSize: 10, color: p.textFaint, minWidth: 22 }}>
                {String(i + 1).padStart(2, '0')}
              </Text>
              <Text style={{ flex: 1, fontSize: 12, color: p.text }}>{s.title}</Text>
            </View>
          ))}
        </View>

        {/* ── Sections with § rules and drop cap on the first ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          {SECTIONS.map((s, i) => (
            <View key={s.eyebrow} style={{ marginBottom: 28 }}>
              {/* § rule */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Text style={{ fontFamily: tokens.type.mono, fontSize: 10, color: p.textMuted, fontWeight: '700' }}>
                  {`§ ${String(i + 1).padStart(2, '0')}`}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: p.borderStrong }} />
                <Text style={{ fontSize: 9, color: p.brand, letterSpacing: 1.6, fontWeight: '700' }}>
                  {s.eyebrow}
                </Text>
              </View>
              <Text style={{
                fontFamily: tokens.type.display,
                fontSize: 22, lineHeight: 26, letterSpacing: -0.3,
                color: p.text, marginTop: 4,
              }}>
                {s.title}
              </Text>
              {/* Drop cap on the first section only */}
              {i === 0 ? (
                <View style={{ marginTop: 8, flexDirection: 'row' }}>
                  <Text style={{
                    fontFamily: tokens.type.display,
                    fontSize: 38, lineHeight: 32,
                    color: p.text, paddingRight: 6, paddingTop: 2,
                  }}>
                    {s.body.charAt(0)}
                  </Text>
                  <Text style={{ flex: 1, fontSize: 13, color: p.text, lineHeight: 20 }}>
                    {s.body.slice(1)}
                  </Text>
                </View>
              ) : (
                <Text style={{ fontSize: 13, color: p.text, marginTop: 8, lineHeight: 20 }}>
                  {s.body}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* ── Closing stamp ── */}
        <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 24 }}>
          <View style={{
            borderWidth: 2, borderColor: p.brand,
            paddingHorizontal: 16, paddingVertical: 8,
            transform: [{ rotate: '-1.5deg' }],
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 9, color: p.brand, letterSpacing: 2, fontWeight: '700' }}>
              {'BREWED · IN TRUST'}
            </Text>
            <Text style={{ fontFamily: tokens.type.display, fontSize: 14, color: p.brand, marginTop: 1 }}>
              Your books, your business.
            </Text>
          </View>
        </View>

        {/* ── Links ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 8, gap: 12 }}>
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
