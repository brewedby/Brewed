import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CompanyForm } from '@/components/companies/CompanyForm';
import { useCreateCompany } from '@/lib/mutations/companies';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/themeContext';

export default function NewCompanyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { tokens } = useTheme();
  const p = tokens.palette;
  const createCompany = useCreateCompany();

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: p.text }}>
        <Text style={{ fontFamily: tokens.type.display, fontSize: 24, letterSpacing: -0.5, color: p.text }}>New Company</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 16, right: 8 }}>
          <Text style={{ fontSize: 13, color: p.brand, fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
      <CompanyForm
        onSubmit={async (data) => { await createCompany.mutateAsync({ data, userId: user!.id }); }}
        submitLabel="Add Company"
      />
    </View>
  );
}
