import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { useUpdateProfile } from '@/lib/queries/profile';
import { BUSINESS_TYPES } from '@/constants';

export default function OnboardingScreen() {
  const router = useRouter();
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
    } catch (e: unknown) {
      Alert.alert('Error', 'Could not save your details. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-amber-50">
      {/* Decorative gradient-like background layers */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -120,
          right: -120,
          width: 340,
          height: 340,
          borderRadius: 170,
          backgroundColor: '#fed7aa',
          opacity: 0.6,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 80,
          left: -80,
          width: 240,
          height: 240,
          borderRadius: 120,
          backgroundColor: '#fef3c7',
          opacity: 0.8,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: -140,
          right: -60,
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: '#fde68a',
          opacity: 0.5,
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 88, paddingBottom: 48 }}>
        <View className="items-center mb-10">
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              backgroundColor: '#78350f',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
              elevation: 6,
              shadowColor: '#78350f',
              shadowOpacity: 0.35,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
            }}
          >
            <Ionicons name="cafe" size={40} color="#fbbf24" />
          </View>
          <Text className="text-3xl font-bold text-stone-900">Welcome!</Text>
          <Text className="text-stone-600 text-base mt-2 text-center">
            Let's set up your business profile
          </Text>
        </View>

        <View
          className="bg-white rounded-3xl p-5 border border-stone-100"
          style={{
            elevation: 3,
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <Text className="text-sm font-semibold text-stone-700 mb-2">Business Name</Text>
          <TextInput
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="e.g. Brewed by Boon"
            placeholderTextColor="#a8a29e"
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5 text-stone-900 mb-5"
            autoCapitalize="words"
            accessibilityLabel="Business name"
          />

          <Text className="text-sm font-semibold text-stone-700 mb-2">Business Type</Text>
          <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
            {BUSINESS_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setBusinessType(t)}
                accessibilityRole="radio"
                accessibilityLabel={t}
                accessibilityState={{ selected: businessType === t }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 20,
                  borderWidth: 1,
                  backgroundColor: businessType === t ? '#78350f' : '#ffffff',
                  borderColor: businessType === t ? '#78350f' : '#e7e5e4',
                }}
              >
                <Text
                  style={{
                    color: businessType === t ? '#ffffff' : '#57534e',
                    fontWeight: '500',
                    fontSize: 14,
                  }}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Get started"
          accessibilityState={{ disabled: saving }}
          style={{
            backgroundColor: '#b45309',
            paddingVertical: 16,
            borderRadius: 20,
            alignItems: 'center',
            marginTop: 24,
            elevation: 4,
            shadowColor: '#b45309',
            shadowOpacity: 0.3,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text className="text-white font-bold text-base">Get Started</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
