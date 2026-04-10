import React from 'react';
import { View, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { UnitForm } from '@/components/units/UnitForm';
import { PageHeader } from '@/components/shared/PageHeader';
import { useCreateUnit } from '@/lib/mutations/units';
import { useAuth } from '@/lib/auth';
import type { UnitFormValues } from '@/types';

export default function NewUnitScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const createUnit = useCreateUnit();

  async function handleSubmit(data: UnitFormValues) {
    if (!user) {
      Alert.alert('Error', 'You must be signed in to add a unit.');
      return;
    }
    await createUnit.mutateAsync({ data, userId: user.id });
    router.back();
  }

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      <View className="bg-white border-b border-stone-100">
        <PageHeader title="Add Unit" backButton />
      </View>
      <UnitForm onSubmit={handleSubmit} submitLabel="Add Unit" />
    </View>
  );
}
