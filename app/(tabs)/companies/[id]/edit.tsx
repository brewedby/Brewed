import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CompanyForm } from '@/components/companies/CompanyForm';
import { useCompany } from '@/lib/queries/companies';
import { useUpdateCompany } from '@/lib/mutations/companies';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function EditCompanyScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: company, isLoading } = useCompany(id);
  const updateCompany = useUpdateCompany();

  if (isLoading) return <LoadingSpinner message="Loading company..." />;
  if (!company) return null;

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-stone-100">
        <Text className="text-lg font-bold text-stone-900">Edit Company</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-stone-500">Cancel</Text>
        </TouchableOpacity>
      </View>
      <CompanyForm
        defaultValues={{
          name: company.name,
          contact_name: company.contact_name ?? '',
          email: company.email ?? '',
          phone: company.phone ?? '',
          website: company.website ?? '',
          notes: company.notes ?? '',
        }}
        onSubmit={(data) => updateCompany.mutateAsync({ id, data })}
        submitLabel="Save Changes"
      />
    </View>
  );
}
