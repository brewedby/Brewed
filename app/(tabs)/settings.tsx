import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { useProfile, useUpdateProfile } from '@/lib/queries/profile';
import type { Metric } from '@/lib/queries/profile';

const BUSINESS_TYPES = ['Coffee', 'Street Food', 'Pizza', 'Burgers', 'Desserts', 'Bakery', 'Other'];
const CURRENCIES = [
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
];
const DEFAULT_METRICS: Metric[] = [
  { id: 'revenue',  name: 'Revenue',      unit: '£',      enabled: true,  builtin: true },
  { id: 'profit',   name: 'Net Profit',   unit: '£',      enabled: true,  builtin: true },
  { id: 'covers',   name: 'Covers',       unit: 'covers', enabled: true,  builtin: true },
  { id: 'drinks',   name: 'Drinks Sold',  unit: 'drinks', enabled: false, builtin: true },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const updateProfile = useUpdateProfile();

  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Coffee');
  const [currency, setCurrency] = useState('GBP');
  const [metrics, setMetrics] = useState<Metric[]>(DEFAULT_METRICS);
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setBusinessName(profile.business_name ?? '');
      setBusinessType(profile.business_type ?? 'Coffee');
      setCurrency(profile.currency ?? 'GBP');
      if (profile.custom_metrics?.length > 0) {
        setMetrics(profile.custom_metrics);
      } else {
        setMetrics(DEFAULT_METRICS);
      }
    }
  }, [profile]);

  function toggleMetric(id: string, enabled: boolean) {
    setMetrics((prev) => prev.map((m) => m.id === id ? { ...m, enabled } : m));
  }

  function deleteMetric(id: string) {
    setMetrics((prev) => prev.filter((m) => m.id !== id));
  }

  function addMetric() {
    if (!newName.trim()) return;
    const metric: Metric = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      unit: newUnit.trim() || 'units',
      enabled: true,
    };
    setMetrics((prev) => [...prev, metric]);
    setNewName('');
    setNewUnit('');
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        updates: {
          business_name: businessName.trim() || null,
          business_type: businessType,
          currency,
          custom_metrics: metrics,
        },
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

        {/* ── Business Profile ── */}
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
                  <Text style={{ fontSize: 11, color: currency === c.code ? '#ffffff' : '#9ca3af' }}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Metrics ── */}
        <Text className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Metrics</Text>
        <View className="bg-white rounded-2xl p-4 border border-stone-100 mb-4">
          <Text className="text-stone-500 text-xs mb-3">Choose which metrics to track across the app.</Text>

          {metrics.map((metric, idx) => (
            <View
              key={metric.id}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: idx < metrics.length - 1 ? 1 : 0,
                borderBottomColor: '#f5f5f4',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#1c1917' }}>{metric.name}</Text>
                <Text style={{ fontSize: 11, color: '#a8a29e', marginTop: 1 }}>{metric.unit}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {!metric.builtin && (
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert('Delete Metric', `Remove "${metric.name}"?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteMetric(metric.id) },
                      ])
                    }
                  >
                    <Text style={{ fontSize: 12, color: '#ef4444' }}>Delete</Text>
                  </TouchableOpacity>
                )}
                <Switch
                  value={metric.enabled}
                  onValueChange={(v) => toggleMetric(metric.id, v)}
                  trackColor={{ false: '#e7e5e4', true: '#78350f' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          ))}

          {/* Add custom metric */}
          <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f5f5f4' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#57534e', marginBottom: 8 }}>Add Custom Metric</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Name (e.g. Coffees Sold)"
                placeholderTextColor="#a8a29e"
                style={{
                  flex: 1, borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 10,
                  paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#1c1917',
                }}
              />
              <TextInput
                value={newUnit}
                onChangeText={setNewUnit}
                placeholder="Unit"
                placeholderTextColor="#a8a29e"
                style={{
                  width: 64, borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 10,
                  paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#1c1917',
                }}
              />
              <TouchableOpacity
                onPress={addMetric}
                style={{
                  backgroundColor: '#1c1917', borderRadius: 10,
                  paddingHorizontal: 14, justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Save */}
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
