import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { UnitForm } from '@/components/units/UnitForm';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useUnit } from '@/lib/queries/units';
import { useUpdateUnit } from '@/lib/mutations/units';
import { useTheme } from '@/lib/themeContext';
import type { UnitFormValues } from '@/types';

export default function EditUnitScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tokens } = useTheme();
  const p = tokens.palette;

  const { data: unit, isLoading } = useUnit(id);
  const updateUnit = useUpdateUnit();

  if (isLoading) return <LoadingSpinner message="Loading unit..." />;
  if (!unit) return null;

  async function handleSubmit(data: UnitFormValues) {
    try {
      await updateUnit.mutateAsync({ id, data });
      router.back();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save changes. Please try again.');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: p.text }}>
        <Text style={{ fontFamily: tokens.type.display, fontSize: 24, letterSpacing: -0.5, color: p.text }}>Edit Unit</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 16, right: 8 }}>
          <Text style={{ fontSize: 13, color: p.brand, fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
      <UnitForm
        defaultValues={{
          name: unit.name,
          registration: unit.registration ?? '',
          notes: unit.notes ?? '',
          status: unit.status,
          vehicle_type: unit.vehicle_type ?? '',
          height_m: unit.height_m ?? null,
          length_m: unit.length_m ?? null,
          width_m: unit.width_m ?? null,
          mot_date: unit.mot_date ?? '',
          tax_date: unit.tax_date ?? '',
          service_date: unit.service_date ?? '',
          service_interval: (unit.service_interval as '6months' | '1year') ?? '1year',
        }}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      />
    </View>
  );
}
