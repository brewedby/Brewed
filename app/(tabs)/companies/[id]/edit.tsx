import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/lib/themeContext';
import { CompanyForm } from '@/components/companies/CompanyForm';
import { useCompany } from '@/lib/queries/companies';
import { useUpdateCompany } from '@/lib/mutations/companies';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function EditCompanyScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tokens } = useTheme();
  const p = tokens.palette;
  const { data: company, isLoading } = useCompany(id);
  const updateCompany = useUpdateCompany();

  if (isLoading) return <LoadingSpinner message="Loading company..." />;
  if (!company) return null;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: p.text }}>
        <Text style={{ fontFamily: tokens.type.display, fontSize: 24, letterSpacing: -0.5, color: p.text }}>Edit Company</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 16, right: 8 }}>
          <Text style={{ fontSize: 13, color: p.brand, fontWeight: '600' }}>Cancel</Text>
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
