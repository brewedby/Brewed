import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { companySchema, CompanyFormValues } from '@/lib/validations/company.schema';
import { FormField } from '@/components/shared/FormField';

interface Props {
  defaultValues?: Partial<CompanyFormValues>;
  onSubmit: (data: CompanyFormValues) => Promise<void>;
  submitLabel?: string;
}

export function CompanyForm({ defaultValues, onSubmit, submitLabel = 'Save Company' }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { control, handleSubmit, formState: { errors } } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema) as any,
    defaultValues: { name: '', contact_name: '', email: '', phone: '', website: '', notes: '', ...defaultValues },
  });

  async function handleFormSubmit(data: CompanyFormValues) {
    setLoading(true);
    try {
      await onSubmit(data);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save company');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-stone-50">
      <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
        <View className="gap-4">
          <Controller
            control={control} name="name"
            render={({ field }) => (
              <FormField
                label="Company Name" required
                value={field.value} onChangeText={field.onChange}
                error={errors.name?.message}
                placeholder="Street Food Festivals Ltd"
              />
            )}
          />
          <Controller
            control={control} name="contact_name"
            render={({ field }) => (
              <FormField
                label="Contact Name"
                value={field.value ?? ''} onChangeText={field.onChange}
                placeholder="John Smith"
              />
            )}
          />
          <Controller
            control={control} name="email"
            render={({ field }) => (
              <FormField
                label="Email"
                value={field.value ?? ''} onChangeText={field.onChange}
                error={errors.email?.message}
                placeholder="hello@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}
          />
          <Controller
            control={control} name="phone"
            render={({ field }) => (
              <FormField
                label="Phone"
                value={field.value ?? ''} onChangeText={field.onChange}
                placeholder="+44 7700 900000"
                keyboardType="phone-pad"
              />
            )}
          />
          <Controller
            control={control} name="website"
            render={({ field }) => (
              <FormField
                label="Website"
                value={field.value ?? ''} onChangeText={field.onChange}
                error={errors.website?.message}
                placeholder="https://company.com"
                keyboardType="url"
                autoCapitalize="none"
              />
            )}
          />
          <Controller
            control={control} name="notes"
            render={({ field }) => (
              <FormField
                label="Notes"
                value={field.value ?? ''} onChangeText={field.onChange}
                placeholder="Any notes about this company..."
                multiline numberOfLines={4}
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
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text className="text-white font-bold text-base">{submitLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
