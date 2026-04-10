import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { unitSchema } from '@/lib/validations/unit.schema';
import { FormField } from '@/components/shared/FormField';
import { UNIT_STATUSES, UNIT_STATUS_LABELS, UNIT_STATUS_COLORS } from '@/constants';
import type { UnitFormValues } from '@/types';
import type { UnitStatus } from '@/types';

interface Props {
  defaultValues?: Partial<UnitFormValues>;
  onSubmit: (data: UnitFormValues) => Promise<void>;
  submitLabel?: string;
}

export function UnitForm({ defaultValues, onSubmit, submitLabel = 'Save Unit' }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { control, handleSubmit, formState: { errors } } = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema) as any,
    defaultValues: {
      name: '',
      registration: '',
      notes: '',
      status: 'active',
      ...defaultValues,
    },
  });

  async function handleFormSubmit(data: UnitFormValues) {
    setLoading(true);
    try {
      await onSubmit(data);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save unit');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-stone-50">
      <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
        <View className="gap-4">
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <FormField
                label="Unit Name"
                required
                value={field.value}
                onChangeText={field.onChange}
                error={errors.name?.message}
                placeholder="e.g. The Bean Machine"
              />
            )}
          />

          <Controller
            control={control}
            name="registration"
            render={({ field }) => (
              <FormField
                label="Registration / Plate Number"
                value={field.value ?? ''}
                onChangeText={(text) => field.onChange(text.toUpperCase())}
                error={errors.registration?.message}
                placeholder="e.g. AB12 CDE"
                autoCapitalize="characters"
              />
            )}
          />

          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <View>
                <Text className="text-stone-600 text-sm font-medium mb-2">Status</Text>
                <View className="flex-row gap-2">
                  {UNIT_STATUSES.map((s) => {
                    const colors = UNIT_STATUS_COLORS[s as UnitStatus];
                    const isSelected = field.value === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => field.onChange(s)}
                        className={`flex-1 flex-row items-center justify-center px-3 py-2.5 rounded-xl border ${
                          isSelected ? `${colors.bg} border-transparent` : 'bg-white border-stone-200'
                        }`}
                        activeOpacity={0.7}
                      >
                        <View
                          style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dot, marginRight: 6 }}
                        />
                        <Text
                          className={`text-xs font-semibold ${isSelected ? colors.text : 'text-stone-500'}`}
                          numberOfLines={1}
                        >
                          {UNIT_STATUS_LABELS[s as UnitStatus]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          />

          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <FormField
                label="Notes"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                placeholder="Any notes about this unit..."
                multiline
                numberOfLines={4}
                style={{ textAlignVertical: 'top', minHeight: 96 }}
              />
            )}
          />
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <View className="px-4 pb-6 pt-3 bg-white border-t border-stone-100">
        <TouchableOpacity
          onPress={handleSubmit(handleFormSubmit)}
          className="bg-amber-700 py-4 rounded-xl items-center"
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">{submitLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
