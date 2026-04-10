import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { UnitForm } from '@/components/units/UnitForm';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useUnit } from '@/lib/queries/units';
import { useUpdateUnit } from '@/lib/mutations/units';
import type { UnitFormValues } from '@/types';

export default function EditUnitScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: unit, isLoading } = useUnit(id);
  const updateUnit = useUpdateUnit();

  if (isLoading) return <LoadingSpinner message="Loading unit..." />;
  if (!unit) return null;

  async function handleSubmit(data: UnitFormValues) {
    await updateUnit.mutateAsync({ id, data });
    router.back();
  }

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      <View className="bg-white border-b border-stone-100">
        <PageHeader title="Edit Unit" backButton />
      </View>
      <UnitForm
        defaultValues={{
          name: unit.name,
          registration: unit.registration ?? '',
          notes: unit.notes ?? '',
          status: unit.status as any,
        }}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      />
    </View>
  );
}
