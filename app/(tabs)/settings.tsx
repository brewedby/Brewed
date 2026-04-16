import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { useProfile, useUpdateProfile } from '@/lib/queries/profile';

const BUSINESS_TYPES = ['Coffee', 'Street Food', 'Pizza', 'Burgers', 'Desserts', 'Bakery', 'Other'];
const CURRENCIES = [{ code: 'GBP', symbol: '£', label: 'GBP (£)' }, { code: 'EUR', symbol: '€', label: 'EUR (€)' }, { code: 'USD', symbol: '$', label: 'USD ($)' }];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const updateProfile = useUpdateProfile();

  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Coffee');
  const [currency, setCurrency] = useState('GBP');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setBusinessName(profile.business_name ?? '');
      setBusinessType(profile.business_type ?? 'Coffee');
      setCurrency(profile.currency ?? 'GBP');
    }
  }, [profile]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        updates: { business_name: businessName.trim() || null, business_type: businessType, currency },
      });
      Alert.alert('Saved', 'Your settings have been updated.');
    } catch {
      Alert.alert('Error', 'Could not save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      <View className="px-4 pt-2 pb-3 bg-white border-b border-stone-100">
        <Text className="text-2xl font-bold text-stone-900">Settings</Text>
        <Text className="text-stone-400 text-xs mt-0.5">{user?.email}</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
        <Text className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Business Profile</Text>
        <View className="bg-white rounded-2xl p-4 border border-stone-100 gap-4 mb-4">
          <View>
            <Text className="text-sm font-medium text-stone-700 mb-1.5">Business Name</Text>
            <TextInput
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="e.g. Brewed by Boon"
              className="border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-stone-700 mb-2">Business Type</Text>
            <View className="flex-row flex-wrap gap-2">
              {BUSINESS_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setBusinessType(t)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1,
                    backgroundColor: businessType === t ? '#78350f' : '#ffffff',
                    borderColor: businessType === t ? '#78350f' : '#e7e5e4',
                  }}
                >
                  <Text style={{ color: businessType === t ? '#ffffff' : '#57534e', fontWeight: '500', fontSize: 13 }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text className="text-sm font-medium text-stone-700 mb-2">Currency</Text>
            <View className="flex-row gap-2">
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  onPress={() => setCurrency(c.code)}
                  style={{
                    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, borderWidth: 1,
                    backgroundColor: currency === c.code ? '#78350f' : '#ffffff',
                    borderColor: currency === c.code ? '#78350f' : '#e7e5e4',
                  }}
                >
                  <Text style={{ fontWeight: '700', fontSize: 16, color: currency === c.code ? '#ffffff' : '#57534e' }}>{c.symbol}</Text>
                  <Text style={{ fontSize: 11, color: currency === c.code ? '#fde68a' : '#9ca3af' }}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="bg-amber-700 py-3.5 rounded-2xl items-center mb-4"
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-base">Save Changes</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={signOut}
          className="bg-white border border-stone-200 py-3.5 rounded-2xl items-center mb-8"
        >
          <Text className="text-stone-600 font-medium">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
