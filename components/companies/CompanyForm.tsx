import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useForm, Controller, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { companySchema, CompanyFormValues } from '@/lib/validations/company.schema';
import { FormField } from '@/components/shared/FormField';
import { useTheme } from '@/lib/themeContext';

interface Props {
  defaultValues?: Partial<CompanyFormValues>;
  onSubmit: (data: CompanyFormValues) => Promise<void>;
  submitLabel?: string;
}

export function CompanyForm({ defaultValues, onSubmit, submitLabel = 'Save Company' }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { tokens } = useTheme();
  const p = tokens.palette;

  const { control, handleSubmit, formState: { errors } } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema) as Resolver<CompanyFormValues>,
    defaultValues: { name: '', contact_name: '', email: '', phone: '', website: '', notes: '', ...defaultValues },
  });

  async function handleFormSubmit(data: CompanyFormValues) {
    setLoading(true);
    try {
      await onSubmit(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save company');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={{ gap: 16 }}>
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

      <View style={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12, backgroundColor: p.bg, borderTopWidth: 1, borderTopColor: p.border }}>
        <TouchableOpacity
          onPress={handleSubmit(handleFormSubmit)}
          style={{ backgroundColor: p.text, paddingVertical: 16, alignItems: 'center' }}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={p.bg} /> : (
            <Text style={{ color: p.bg, fontWeight: '700', fontSize: 14, letterSpacing: 1 }}>{submitLabel.toUpperCase()}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
