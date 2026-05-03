import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { UnitForm } from '@/components/units/UnitForm';
import { useCreateUnit } from '@/lib/mutations/units';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/themeContext';
import type { UnitFormValues } from '@/types';

export default function NewUnitScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { tokens } = useTheme();
  const p = tokens.palette;
  const createUnit = useCreateUnit();

  async function handleSubmit(data: UnitFormValues) {
    if (!user) {
      Alert.alert('Error', 'You must be signed in to add a unit.');
      return;
    }
    try {
      await createUnit.mutateAsync({ data, userId: user.id });
      // Always return to the Fleet index — back() can land on dashboard
      // or settings depending on entry point.
      router.replace('/(modal)/fleet');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save unit. Please try again.');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: p.text }}>
        <Text style={{ fontFamily: tokens.type.display, fontSize: 24, letterSpacing: -0.5, color: p.text }}>Add Unit</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 16, right: 8 }}>
          <Text style={{ fontSize: 13, color: p.brand, fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
      <UnitForm onSubmit={handleSubmit} submitLabel="Add Unit" />
    </View>
  );
}
