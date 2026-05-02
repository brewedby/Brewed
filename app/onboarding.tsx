import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { useUpdateProfile } from '@/lib/queries/profile';
import { useTheme } from '@/lib/themeContext';
import { BUSINESS_TYPES } from '@/constants';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tokens } = useTheme();
  const p = tokens.palette;
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Coffee');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!businessName.trim()) { Alert.alert('Required', 'Please enter your business name.'); return; }
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        updates: { business_name: businessName.trim(), business_type: businessType, currency: 'GBP', custom_metrics: [] },
      });
      router.replace('/(tabs)/dashboard');
    } catch {
      Alert.alert('Error', 'Could not save your details. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 + insets.bottom }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Step header ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14 }}>
          <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 2, fontWeight: '700' }}>
            {'SETUP · 1 OF 1'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Progress rule */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <View style={{ flex: 1, height: 3, backgroundColor: p.text }} />
          </View>
        </View>

        {/* ── Title ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: p.text }}>
          <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 2, fontWeight: '700' }}>
            {'THE SIGNPOST'}
          </Text>
          <Text style={{
            fontFamily: tokens.type.display,
            fontWeight: tokens.type.displayWeight,
            fontSize: 36, letterSpacing: -0.7, lineHeight: 38,
            marginTop: 6, color: p.text,
          }}>
            What do you trade?
          </Text>
          <Text style={{ fontSize: 12, color: p.textMuted, fontStyle: 'italic', marginTop: 8, lineHeight: 18 }}>
            Your stall, your story. We'll set the menu, the COGS and the VAT bands to match.
          </Text>
        </View>

        {/* ── Form ── */}
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16, gap: 22 }}>
          {/* Business name */}
          <View>
            <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 6 }}>
              {'BUSINESS NAME'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: p.text, paddingBottom: 6 }}>
              <Ionicons name="business-outline" size={14} color={p.textMuted} />
              <TextInput
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="e.g. Brewed by Boon"
                placeholderTextColor={p.textFaint}
                autoCapitalize="words"
                accessibilityLabel="Business name"
                style={{ flex: 1, fontSize: 16, color: p.text, padding: 0, fontFamily: tokens.type.display }}
              />
            </View>
          </View>

          {/* Trade type */}
          <View>
            <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 8 }}>
              {'TRADE TYPE'}
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
                      paddingHorizontal: 14, paddingVertical: 8, minHeight: 36,
                      borderWidth: 1,
                      borderRadius: tokens.radius.pill,
                      backgroundColor: active ? p.text : 'transparent',
                      borderColor: active ? p.text : p.borderStrong,
                    }}
                  >
                    <Text style={{
                      fontSize: 12, fontWeight: '600',
                      color: active ? p.bg : p.text,
                    }}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Tip stamp */}
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: p.brand, borderStyle: 'dashed', transform: [{ rotate: '-1.5deg' }], maxWidth: '90%' }}>
            <Text style={{ fontSize: 10, color: p.brand, letterSpacing: 1.5, fontWeight: '700' }}>
              {'TIP FROM THE ROUND'}
            </Text>
            <Text style={{ fontSize: 12, color: p.text, fontStyle: 'italic', marginTop: 2, lineHeight: 18 }}>
              "Get the trade type right — it sets your VAT bands."
            </Text>
          </View>
        </View>

        {/* ── Bottom action ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: p.border }}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Open the ledger"
            accessibilityState={{ disabled: saving }}
            style={{
              backgroundColor: p.text, paddingVertical: 14,
              alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
              minHeight: 48,
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator color={p.bg} />
            ) : (
              <>
                <Text style={{ color: p.bg, fontWeight: '700', fontSize: 12, letterSpacing: 2 }}>
                  {'OPEN THE LEDGER'}
                </Text>
                <Ionicons name="arrow-forward" size={14} color={p.bg} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
