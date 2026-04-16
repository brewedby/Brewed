import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useUpdateProfile } from '@/lib/queries/profile';

const BUSINESS_TYPES = ['Coffee', 'Street Food', 'Pizza', 'Burgers', 'Desserts', 'Bakery', 'Other'];

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
    <ScrollView className="flex-1 bg-stone-50" contentContainerStyle={{ padding: 24, paddingTop: 80 }}>
      <View className="items-center mb-8">
        <View className="w-16 h-16 bg-amber-700 rounded-2xl items-center justify-center mb-4">
          <Text style={{ fontSize: 32 }}>☕</Text>
        </View>
        <Text className="text-2xl font-bold text-stone-900">Welcome!</Text>
        <Text className="text-stone-500 text-sm mt-1 text-center">Let's set up your business profile</Text>
      </View>

      <Text className="text-sm font-semibold text-stone-700 mb-2">Business Name</Text>
      <TextInput
        value={businessName}
        onChangeText={setBusinessName}
        placeholder="e.g. Brewed by Boon"
        className="bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-900 mb-6"
        autoCapitalize="words"
      />

      <Text className="text-sm font-semibold text-stone-700 mb-2">Business Type</Text>
      <View className="flex-row flex-wrap gap-2 mb-8">
        {BUSINESS_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setBusinessType(t)}
            style={{
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
              backgroundColor: businessType === t ? '#78350f' : '#ffffff',
              borderColor: businessType === t ? '#78350f' : '#e7e5e4',
            }}
          >
            <Text style={{ color: businessType === t ? '#ffffff' : '#57534e', fontWeight: '500', fontSize: 14 }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        className="bg-amber-700 py-4 rounded-2xl items-center"
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-base">Get Started →</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}
