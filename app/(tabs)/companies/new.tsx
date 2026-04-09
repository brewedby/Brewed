import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CompanyForm } from '@/components/companies/CompanyForm';
import { useCreateCompany } from '@/lib/mutations/companies';
import { useAuth } from '@/lib/auth';

export default function NewCompanyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const createCompany = useCreateCompany();

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-stone-100">
        <Text className="text-lg font-bold text-stone-900">New Company</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-stone-500">Cancel</Text>
        </TouchableOpacity>
      </View>
      <CompanyForm
        onSubmit={async (data) => { await createCompany.mutateAsync({ data, userId: user!.id }); }}
        submitLabel="Add Company"
      />
    </View>
  );
}
