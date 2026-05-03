This file is a merged representation of the entire codebase, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
app/
  (auth)/
    _layout.tsx
    sign-in.tsx
    sign-up.tsx
  (tabs)/
    companies/
      [id]/
        edit.tsx
        index.tsx
      _layout.tsx
      index.tsx
      new.tsx
    events/
      [id]/
        edit.tsx
        index.tsx
      _layout.tsx
      index.tsx
      new.tsx
    fleet/
      [id]/
        edit.tsx
        index.tsx
      _layout.tsx
      index.tsx
      new.tsx
    _layout.tsx
    calendar.tsx
    dashboard.tsx
    discover.tsx
    reports.tsx
    settings.tsx
  _layout.tsx
  index.tsx
  onboarding.tsx
assets/
  adaptive-icon.png
  favicon.png
  icon.png
  splash-icon.png
components/
  companies/
    CompanyForm.tsx
  dashboard/
    RevenueBarChart.tsx
    StatCard.tsx
    StatusPieChart.tsx
  events/
    CalendarView.tsx
    EventCard.tsx
    EventForm.tsx
    FinancialsCard.tsx
    InfrastructureList.tsx
    OverlapModal.tsx
    StaffingList.tsx
    WeatherCard.tsx
  shared/
    ConfirmSheet.tsx
    CurrencyInput.tsx
    EmptyState.tsx
    EventStatusBadge.tsx
    FormField.tsx
    LoadingSpinner.tsx
    PageHeader.tsx
    QueryError.tsx
  units/
    UnitCard.tsx
    UnitForm.tsx
constants/
  index.ts
lib/
  mutations/
    companies.ts
    events.ts
    units.ts
  queries/
    companies.ts
    dashboard.ts
    discover.ts
    events.ts
    profile.ts
    reports.ts
    units.ts
  validations/
    company.schema.ts
    event.schema.ts
    unit.schema.ts
  auth.tsx
  calculations.ts
  formatters.ts
  notifications.ts
  scoring.ts
  supabase.ts
supabase/
  functions/
    check-application-urls/
      index.ts
    discover-events/
      index.ts
    send-push-notification/
      index.ts
    sync-directory/
      index.ts
  migration_004.sql
  migrations.sql
types/
  database.ts
  index.ts
.env.example
.gitignore
.npmrc
app.json
babel.config.js
global.css
metro.config.js
nativewind-env.d.ts
package.json
SETUP.md
tailwind.config.js
tsconfig.json
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="app/(auth)/_layout.tsx">
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
</file>

<file path="app/(tabs)/companies/[id]/edit.tsx">
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
</file>

<file path="app/(tabs)/companies/_layout.tsx">
import { Stack } from 'expo-router';

export default function CompaniesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/edit" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
</file>

<file path="app/(tabs)/companies/new.tsx">
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
</file>

<file path="app/(tabs)/events/_layout.tsx">
import { Stack } from 'expo-router';

export default function EventsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/edit" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
</file>

<file path="app/(tabs)/fleet/_layout.tsx">
import { Stack } from 'expo-router';

export default function FleetLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
</file>

<file path="app/(tabs)/fleet/new.tsx">
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
</file>

<file path="app/index.tsx">
import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) return <LoadingSpinner message="Loading..." />;
  if (session) return <Redirect href="/(tabs)/dashboard" />;
  return <Redirect href="/(auth)/sign-in" />;
}
</file>

<file path="app/onboarding.tsx">
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useUpdateProfile } from '@/lib/queries/profile';

const BUSINESS_TYPES = ['Coffee', 'Street Food', 'Pizza', 'Burgers', 'Desserts', 'Bakery', 'Other'];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Coffee');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!businessName.trim()) { Alert.alert('Required', 'Please enter your business name.'); return; }
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        updates: { business_name: businessName.trim(), business_type: businessType, currency: 'GBP', custom_metrics: [] },
      });
      router.replace('/(tabs)/dashboard');
    } catch (e: unknown) {
      Alert.alert('Error', 'Could not save your details. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-stone-50" contentContainerStyle={{ padding: 24, paddingTop: 80 }}>
      <View className="items-center mb-8">
        <View className="w-16 h-16 bg-amber-700 rounded-2xl items-center justify-center mb-4">
          <Text style={{ fontSize: 32 }}>☕</Text>
        </View>
        <Text className="text-2xl font-bold text-stone-900">Welcome!</Text>
        <Text className="text-stone-500 text-sm mt-1 text-center">Let's set up your business profile</Text>
      </View>

      <Text className="text-sm font-semibold text-stone-700 mb-2">Business Name</Text>
      <TextInput
        value={businessName}
        onChangeText={setBusinessName}
        placeholder="e.g. Brewed by Boon"
        className="bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-900 mb-6"
        autoCapitalize="words"
      />

      <Text className="text-sm font-semibold text-stone-700 mb-2">Business Type</Text>
      <View className="flex-row flex-wrap gap-2 mb-8">
        {BUSINESS_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setBusinessType(t)}
            style={{
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
              backgroundColor: businessType === t ? '#78350f' : '#ffffff',
              borderColor: businessType === t ? '#78350f' : '#e7e5e4',
            }}
          >
            <Text style={{ color: businessType === t ? '#ffffff' : '#57534e', fontWeight: '500', fontSize: 14 }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        className="bg-amber-700 py-4 rounded-2xl items-center"
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-base">Get Started →</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}
</file>

<file path="components/dashboard/StatusPieChart.tsx">
import React from 'react';
import { View, Text } from 'react-native';
import { STATUS_PIE_COLORS, STATUS_LABELS } from '@/constants';
import type { StatusCount } from '@/types';

interface Props {
  data: StatusCount[];
}

export function StatusPieChart({ data }: Props) {
  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <View className="bg-white rounded-2xl p-4 border border-stone-100">
      <Text className="font-bold text-stone-900 mb-3">Applications Breakdown</Text>

      {/* Horizontal stacked bar */}
      <View className="flex-row rounded-full overflow-hidden h-5 mb-4">
        {data.map((d) => (
          <View
            key={d.status}
            style={{
              flex: d.count / total,
              backgroundColor: STATUS_PIE_COLORS[d.status],
            }}
          />
        ))}
      </View>

      {/* Legend */}
      <View className="flex-row flex-wrap gap-x-4 gap-y-2">
        {data.map((d) => (
          <View key={d.status} className="flex-row items-center gap-1.5">
            <View style={{ backgroundColor: STATUS_PIE_COLORS[d.status], width: 10, height: 10, borderRadius: 5 }} />
            <Text className="text-stone-600 text-xs">
              {STATUS_LABELS[d.status]}{' '}
              <Text className="font-bold text-stone-900">{d.count}</Text>
              <Text className="text-stone-400"> ({((d.count / total) * 100).toFixed(0)}%)</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
</file>

<file path="components/events/InfrastructureList.tsx">
import React from 'react';
import { View, Text } from 'react-native';
import { formatCurrency } from '@/lib/formatters';
import { INFRASTRUCTURE_CATEGORY_LABELS } from '@/constants';
import type { InfrastructureItem } from '@/types';

interface Props {
  items: InfrastructureItem[];
}

export function InfrastructureList({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <View className="bg-white rounded-2xl p-4 border border-stone-100">
      <Text className="font-bold text-stone-900 mb-3">Infrastructure Items</Text>
      {items.map((item) => (
        <View key={item.id} className="flex-row justify-between items-center py-2 border-b border-stone-50">
          <View className="flex-1 mr-3">
            <Text className="font-medium text-stone-900 text-sm">{item.description}</Text>
            <Text className="text-stone-400 text-xs mt-0.5">
              {INFRASTRUCTURE_CATEGORY_LABELS[item.category]}
            </Text>
          </View>
          <Text className="font-semibold text-stone-700 text-sm">{formatCurrency(item.cost)}</Text>
        </View>
      ))}
      <View className="flex-row justify-between mt-2 pt-2 border-t border-stone-200">
        <Text className="font-semibold text-stone-700 text-sm">Total</Text>
        <Text className="font-bold text-stone-900 text-sm">
          {formatCurrency(items.reduce((s, i) => s + i.cost, 0))}
        </Text>
      </View>
    </View>
  );
}
</file>

<file path="components/events/OverlapModal.tsx">
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { STATUS_COLORS, STATUS_LABELS } from '@/constants';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { scoreEvent } from '@/lib/scoring';
import type { EventWithFinancials } from '@/types';

interface Props {
  events: EventWithFinancials[];
  allEvents: EventWithFinancials[];
  date: string;
  onClose: () => void;
  router: ReturnType<typeof useRouter>;
}

export function OverlapModal({ events, allEvents, date, onClose, router }: Props) {
  const isOverlap = events.length >= 2;
  const scores = useMemo(
    () => events.map((e) => ({ event: e, result: scoreEvent(e, allEvents) })),
    [events, allEvents],
  );
  const winner = isOverlap
    ? scores.reduce((best, s) => (s.result.score > best.result.score ? s : best))
    : null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white rounded-t-3xl px-4 pt-5 pb-8 max-h-4/5">
          <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-4" />

          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="font-bold text-slate-900 text-lg">
                {isOverlap ? '⚠️ Events Overlap' : '📅 Events on this day'}
              </Text>
              <Text className="text-slate-400 text-xs">{date}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="bg-slate-100 px-3 py-1.5 rounded-xl"
            >
              <Text className="text-slate-600 text-sm font-medium">Close</Text>
            </TouchableOpacity>
          </View>

          {isOverlap && winner && (
            <View className="bg-green-50 border border-green-200 rounded-2xl p-3 mb-4">
              <Text className="text-green-800 font-semibold text-sm">
                Recommendation: <Text className="font-bold">{winner.event.name}</Text>
              </Text>
              <Text className="text-green-700 text-xs mt-0.5">
                Score {winner.result.score}/100 — {winner.result.label}
              </Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>
            {scores.map(({ event, result }) => {
              const colors = STATUS_COLORS[event.status];
              const isWinner = winner?.event.id === event.id;
              return (
                <View
                  key={event.id}
                  className={`mb-3 rounded-2xl border overflow-hidden ${isWinner && isOverlap ? 'border-green-300' : 'border-slate-100'}`}
                >
                  <View style={{ height: 3, backgroundColor: colors.dot }} />
                  <View className="p-3">
                    <View className="flex-row items-start justify-between mb-1">
                      <Text className="font-bold text-slate-900 flex-1 mr-2" numberOfLines={2}>
                        {event.name}
                      </Text>
                      {isOverlap && (
                        <View className="items-end">
                          <Text className={`text-xl font-black ${result.color}`}>{result.score}</Text>
                          <Text className="text-slate-400 text-xs">/ 100</Text>
                        </View>
                      )}
                    </View>

                    <View className="flex-row items-center gap-2 mb-2">
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.bgHex }}>
                        <Text style={{ fontSize: 11, fontWeight: '500', color: colors.textHex }}>{STATUS_LABELS[event.status]}</Text>
                      </View>
                      {isOverlap && (
                        <View className="px-2 py-0.5 rounded-full bg-slate-100">
                          <Text className={`text-xs font-semibold ${result.color}`}>{result.label}</Text>
                        </View>
                      )}
                    </View>

                    <Text className="text-slate-500 text-xs mb-2">
                      📍 {event.location}
                      {event.end_date && event.end_date !== event.date ? `  ·  ${event.date} → ${event.end_date}` : `  ·  ${event.date}`}
                    </Text>

                    {event.calculations.netProfit !== 0 && (
                      <Text className="text-slate-500 text-xs mb-2">
                        Net: <Text className={`font-semibold ${event.calculations.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {formatCurrency(event.calculations.netProfit)}
                        </Text>
                        {event.calculations.profitMargin !== 0 && (
                          <Text className="text-slate-400"> ({formatPercent(event.calculations.profitMargin)} margin)</Text>
                        )}
                      </Text>
                    )}

                    {isOverlap && result.reasons.length > 0 && (
                      <View className="bg-slate-50 rounded-xl p-2 mb-2">
                        {result.reasons.map((r, i) => (
                          <Text key={i} className="text-slate-600 text-xs leading-relaxed">· {r}</Text>
                        ))}
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() => { onClose(); router.push(`/(tabs)/events/${event.id}`); }}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${event.name}`}
                      className="bg-slate-900 py-2 rounded-xl items-center"
                    >
                      <Text className="text-white text-xs font-semibold">Open Event →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
</file>

<file path="components/events/StaffingList.tsx">
import React from 'react';
import { View, Text } from 'react-native';
import { formatCurrency } from '@/lib/formatters';
import type { StaffingEntry } from '@/types';

interface Props {
  entries: StaffingEntry[];
}

export function StaffingList({ entries }: Props) {
  if (entries.length === 0) return null;

  return (
    <View className="bg-white rounded-2xl p-4 border border-stone-100">
      <Text className="font-bold text-stone-900 mb-3">Staffing</Text>
      {entries.map((entry) => (
        <View key={entry.id} className="flex-row justify-between items-center py-2 border-b border-stone-50 last:border-0">
          <View>
            <Text className="font-medium text-stone-900 text-sm">{entry.staff_name}</Text>
            <Text className="text-stone-400 text-xs mt-0.5">
              {entry.hours_worked}h @ {formatCurrency(entry.hourly_rate)}/hr
            </Text>
          </View>
          <Text className="font-semibold text-stone-700 text-sm">
            {formatCurrency(entry.hours_worked * entry.hourly_rate)}
          </Text>
        </View>
      ))}
      <View className="flex-row justify-between mt-2 pt-2 border-t border-stone-200">
        <Text className="font-semibold text-stone-700 text-sm">Total</Text>
        <Text className="font-bold text-stone-900 text-sm">
          {formatCurrency(entries.reduce((s, e) => s + e.hours_worked * e.hourly_rate, 0))}
        </Text>
      </View>
    </View>
  );
}
</file>

<file path="components/shared/ConfirmSheet.tsx">
import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({
  visible, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  destructive = false, onConfirm, onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onCancel}>
        <Pressable>
          <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
            <View className="w-12 h-1 bg-stone-300 rounded-full self-center mb-6" />
            <Text className="text-lg font-bold text-stone-900 mb-2">{title}</Text>
            <Text className="text-stone-600 mb-6">{message}</Text>
            <View className="gap-3">
              <TouchableOpacity
                className={`py-4 rounded-xl items-center ${destructive ? 'bg-red-600' : 'bg-amber-700'}`}
                onPress={onConfirm}
              >
                <Text className="text-white font-semibold">{confirmLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="py-4 rounded-xl items-center bg-stone-100"
                onPress={onCancel}
              >
                <Text className="text-stone-700 font-semibold">{cancelLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
</file>

<file path="components/shared/FormField.tsx">
import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean;
}

export function FormField({ label, error, required, ...props }: Props) {
  return (
    <View>
      {label && (
        <Text className="text-stone-600 text-sm font-medium mb-1">
          {label}
          {required && <Text className="text-red-500"> *</Text>}
        </Text>
      )}
      <TextInput
        className={`bg-stone-50 border rounded-xl px-4 py-3 text-stone-900 text-base ${
          error ? 'border-red-400' : 'border-stone-200'
        }`}
        placeholderTextColor="#a8a29e"
        {...props}
      />
      {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
    </View>
  );
}
</file>

<file path="components/shared/LoadingSpinner.tsx">
import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

interface Props {
  message?: string;
}

export function LoadingSpinner({ message }: Props) {
  return (
    <View className="flex-1 items-center justify-center gap-3">
      <ActivityIndicator size="large" color="#b45309" />
      {message && <Text className="text-stone-500 text-sm">{message}</Text>}
    </View>
  );
}
</file>

<file path="components/shared/QueryError.tsx">
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  error: Error | null | unknown;
  onRetry: () => void;
  message?: string;
}

export function QueryError({ error, onRetry, message }: Props) {
  if (!error) return null;
  const errMessage = error instanceof Error ? error.message : String(error);
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <Text className="text-4xl mb-4">⚠️</Text>
      <Text className="text-stone-700 font-semibold text-center mb-2">
        {message ?? 'Something went wrong'}
      </Text>
      <Text className="text-stone-400 text-xs text-center mb-6" numberOfLines={3}>
        {errMessage}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        accessibilityLabel="Retry"
        accessibilityRole="button"
        className="bg-amber-700 px-6 py-3 rounded-xl"
      >
        <Text className="text-white font-semibold">Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}
</file>

<file path="lib/mutations/companies.ts">
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CompanyFormValues } from '@/lib/validations/company.schema';

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, userId }: { data: CompanyFormValues; userId: string }) => {
      const { data: company, error } = await supabase
        .from('concessions_companies')
        .insert({
          user_id: userId,
          name: data.name,
          contact_name: data.contact_name || null,
          email: data.email || null,
          phone: data.phone || null,
          website: data.website || null,
          notes: data.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return company;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CompanyFormValues }) => {
      const { error } = await supabase
        .from('concessions_companies')
        .update({
          name: data.name,
          contact_name: data.contact_name || null,
          email: data.email || null,
          phone: data.phone || null,
          website: data.website || null,
          notes: data.notes || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['companies', id] });
    },
  });
}
</file>

<file path="lib/queries/units.ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Unit } from '@/types';

export function useUnits() {
  return useQuery({
    queryKey: ['units'],
    queryFn: async (): Promise<Unit[]> => {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUnit(id: string) {
  return useQuery({
    queryKey: ['units', id],
    queryFn: async (): Promise<Unit> => {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('units').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
</file>

<file path="lib/validations/company.schema.ts">
import { z } from 'zod';

export const companySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  contact_name: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  notes: z.string().optional(),
});

export type CompanyFormValues = z.infer<typeof companySchema>;
</file>

<file path="lib/auth.tsx">
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
</file>

<file path="lib/scoring.ts">
import type { EventWithFinancials, ApplicationStatus } from '@/types';

export interface ScoreResult {
  score: number;       // 0-100
  label: string;       // e.g. "Strong Pick"
  color: string;       // tailwind text colour class
  reasons: string[];
}

const STATUS_SCORE: Record<ApplicationStatus, number> = {
  accepted: 30, waitlisted: 18, pending: 10, rejected: 0, withdrawn: 0,
};

export function scoreEvent(
  event: EventWithFinancials,
  allEvents: EventWithFinancials[],
): ScoreResult {
  const reasons: string[] = [];
  let score = 0;

  // 1. Status (0–30)
  const statusPts = STATUS_SCORE[event.status] ?? 10;
  score += statusPts;
  if (event.status === 'accepted')   reasons.push('Already accepted ✓');
  if (event.status === 'waitlisted') reasons.push('Currently on waitlist');
  if (event.status === 'pending')    reasons.push('Application pending');

  // 2. Historical profit with same company (0–35)
  const past = allEvents.filter(
    (e) =>
      e.company_id &&
      e.company_id === event.company_id &&
      e.id !== event.id &&
      new Date(e.date) < new Date() &&
      e.calculations.netProfit > 0,
  );
  if (past.length > 0) {
    const avg = past.reduce((s, e) => s + e.calculations.netProfit, 0) / past.length;
    const pts = Math.min(35, Math.round(avg / 50));
    score += pts;
    reasons.push(`Avg \u00a3${avg.toFixed(0)} net from ${past.length} past event${past.length > 1 ? 's' : ''} with this company`);
  } else if (event.calculations.netProfit > 0) {
    const pts = Math.min(35, Math.round(event.calculations.netProfit / 50));
    score += pts;
    reasons.push(`\u00a3${event.calculations.netProfit.toFixed(0)} net profit recorded`);
  } else {
    score += 10;
    reasons.push('No historical data for this company yet');
  }

  // 3. Estimated event scale from pitch fee paid (0–25)
  const pitchFeePaid = event.event_financials?.pitch_fee ?? 0;
  const sizePts = pitchFeePaid >= 3000 ? 25 : pitchFeePaid >= 1500 ? 20 : pitchFeePaid >= 800 ? 14 : pitchFeePaid >= 300 ? 8 : 5;
  score += sizePts;
  if (sizePts >= 20) reasons.push('Large-scale event (high revenue potential)');
  else if (sizePts >= 14) reasons.push('Mid-size event');
  else reasons.push('Smaller or local event');

  // 4. Duration bonus (0–10)
  const days = event.end_date
    ? Math.round((new Date(event.end_date).getTime() - new Date(event.date).getTime()) / 86400000) + 1
    : 1;
  const durPts = Math.min(10, days * 3);
  score += durPts;
  if (days > 1) reasons.push(`${days}-day event (+${durPts} pts for duration)`);

  score = Math.min(100, Math.max(0, score));

  let label = 'Uncertain';
  let color = 'text-slate-500';
  if (score >= 75) { label = 'Strong Pick';   color = 'text-green-600'; }
  else if (score >= 55) { label = 'Good Option';  color = 'text-amber-600'; }
  else if (score >= 35) { label = 'Consider';     color = 'text-orange-500'; }
  else { label = 'Low Priority'; color = 'text-red-500'; }

  return { score, label, color, reasons };
}
</file>

<file path="lib/supabase.ts">
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
</file>

<file path="supabase/functions/discover-events/index.ts">
// Supabase Edge Function: discover-events
// Searches for UK food market / festival events using Brave Search API
// Deploy with: supabase functions deploy discover-events
// Set secret: supabase secrets set BRAVE_SEARCH_API_KEY=your_key

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  location: string | null;
  dateHint: string | null;
  category: string;
}

// Common UK event application platforms and directories
const TRUSTED_DOMAINS = [
  'streetfood.org.uk', 'ncass.org.uk', 'artisanfoodmarket.co.uk',
  'eventbrite.co.uk', 'festivalguide.co.uk', 'ukfoodfestival.co.uk',
  'streetfoodunion.com', 'craftmarkets.co.uk', 'applieddirector.co.uk',
  'bigfeastival.com', 'lovefood.org', 'farmersmarketsonline.com',
  'lovefoodhatewasteapply.co.uk', 'grassroots.org',
];

function detectCategory(title: string, description: string): string {
  const text = (title + ' ' + description).toLowerCase();
  if (text.includes('festival')) return 'Festival';
  if (text.includes('market') || text.includes('farmers')) return 'Market';
  if (text.includes('fair') || text.includes('fete')) return 'Fair';
  if (text.includes('corporate') || text.includes('office') || text.includes('workplace')) return 'Corporate';
  if (text.includes('street food') || text.includes('streetfood')) return 'Street Food';
  if (text.includes('pop-up') || text.includes('pop up')) return 'Pop-Up';
  if (text.includes('wedding')) return 'Wedding';
  return 'Event';
}

function extractLocation(title: string, description: string): string | null {
  const ukCities = [
    'London', 'Birmingham', 'Manchester', 'Leeds', 'Sheffield', 'Bristol',
    'Glasgow', 'Edinburgh', 'Liverpool', 'Newcastle', 'Brighton', 'Cardiff',
    'Nottingham', 'Leicester', 'Coventry', 'Southampton', 'Oxford', 'Cambridge',
    'Bath', 'York', 'Exeter', 'Norwich', 'Derby', 'Bournemouth', 'Reading',
    'Portsmouth', 'Kent', 'Surrey', 'Essex', 'Suffolk', 'Norfolk', 'Devon',
    'Cornwall', 'Dorset', 'Sussex', 'Hampshire', 'Berkshire',
  ];
  const text = title + ' ' + description;
  for (const city of ukCities) {
    if (text.includes(city)) return city;
  }
  return null;
}

function extractDateHint(title: string, description: string): string | null {
  const text = title + ' ' + description;
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  for (const month of months) {
    if (text.includes(month)) {
      const match = text.match(new RegExp(`\\d{1,2}[\\s\\-–]+${month}\\s+\\d{4}|${month}\\s+\\d{4}|${month}\\s+\\d{1,2}`));
      if (match) return match[0];
    }
  }
  // Look for year
  const yearMatch = text.match(/202[5-9]/);
  if (yearMatch) return yearMatch[0];
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { query, region, category } = await req.json();
    const braveKey = Deno.env.get('BRAVE_SEARCH_API_KEY');

    if (!braveKey) {
      return new Response(
        JSON.stringify({ error: 'BRAVE_SEARCH_API_KEY not configured in Supabase secrets' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Build search query
    const regionStr = region && region !== 'All UK' ? ` ${region}` : '';
    const categoryStr = category && category !== 'All' ? ` ${category.toLowerCase()}` : '';
    const baseQuery = query || `UK street food coffee trader vendor applications${regionStr}${categoryStr} 2025 apply now`;

    const params = new URLSearchParams({
      q: baseQuery,
      count: '20',
      country: 'GB',
      search_lang: 'en',
      safesearch: 'moderate',
      freshness: 'py', // past year
    });

    const braveRes = await fetch(`${BRAVE_API_URL}?${params}`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': braveKey,
      },
    });

    if (!braveRes.ok) {
      const errText = await braveRes.text();
      return new Response(
        JSON.stringify({ error: `Brave Search error: ${braveRes.status}`, detail: errText }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const braveData = await braveRes.json();
    const webResults = braveData?.web?.results ?? [];

    const results: SearchResult[] = webResults
      .filter((r: any) => r.url && r.title)
      .map((r: any, i: number) => {
        const title = r.title ?? '';
        const desc = r.description ?? r.extra_snippets?.[0] ?? '';
        const hostname = new URL(r.url).hostname.replace('www.', '');
        return {
          id: `brave-${i}-${Date.now()}`,
          title,
          description: desc,
          url: r.url,
          source: hostname,
          location: extractLocation(title, desc),
          dateHint: extractDateHint(title, desc),
          category: detectCategory(title, desc),
        };
      });

    return new Response(
      JSON.stringify({ results, query: baseQuery, count: results.length }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
</file>

<file path="supabase/functions/send-push-notification/index.ts">
// Supabase Edge Function: send-push-notification
// Sends a push notification to an Expo push token via the Expo Push API
// Deploy with: supabase functions deploy send-push-notification

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface PushPayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const payload: PushPayload = await req.json();

    if (!payload.to || !payload.to.startsWith('ExponentPushToken[')) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing Expo push token' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const message = {
      to: payload.to,
      sound: payload.sound ?? 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      badge: payload.badge ?? 1,
    };

    const expoRes = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(message),
    });

    const expoData = await expoRes.json();

    return new Response(
      JSON.stringify({ success: true, expo: expoData }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
</file>

<file path="supabase/migration_004.sql">
-- ============================================================
-- Migration 004: pg_cron scheduled jobs for daily auto-sync
-- ============================================================
-- Run this AFTER:
--   1. Running migrations.sql (001-003) first
--   2. Enabling pg_cron in Supabase Dashboard:
--      Project Settings → Database → Extensions → search "pg_cron" → Enable
--   3. Enabling pg_net the same way
--   4. Deploying the Edge Functions:
--      supabase functions deploy sync-directory
--      supabase functions deploy check-application-urls
--   5. Setting the BRAVE_SEARCH_API_KEY secret:
--      supabase secrets set BRAVE_SEARCH_API_KEY=your_key_here
--
-- Replace YOUR_PROJECT_REF with your Supabase project reference ID
-- (found in: Dashboard → Project Settings → General → Reference ID)
-- Replace YOUR_SERVICE_ROLE_KEY with your service_role key
-- (found in: Dashboard → Project Settings → API → service_role)
--
-- WARNING: The service_role key has full DB access. This SQL runs inside
-- Supabase's trusted server environment and is never exposed to clients.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Job 1: Daily directory sync (03:00 UTC) ────────────────────────────────
-- Searches Brave for new UK events/festivals, upserts into uk_events_directory,
-- and checks existing application URLs for page changes.

SELECT cron.unschedule('sync-directory-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-directory-daily');

SELECT cron.schedule(
  'sync-directory-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-directory',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'Authorization',  'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ── Job 2: Daily URL check for tracked events (08:00 UTC) ──────────────────
-- Checks application URLs on your own tracked events for page changes
-- and flags them in the app with the orange "Page changed" badge.

SELECT cron.unschedule('check-application-urls-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-application-urls-daily');

SELECT cron.schedule(
  'check-application-urls-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-application-urls',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'Authorization',  'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Verify both jobs are scheduled:
-- SELECT jobname, schedule, active FROM cron.job;
</file>

<file path=".gitignore">
# Learn more https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files

# dependencies
node_modules/

# Expo
.expo/
dist/
web-build/
expo-env.d.ts

# Native
.kotlin/
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# Metro
.metro-health-check*

# debug
npm-debug.*
yarn-debug.*
yarn-error.*

# macOS
.DS_Store
*.pem

# local env files
.env*.local
.env.local
.env

# Database
*.db
*.db-journal

# typescript
*.tsbuildinfo

# generated native folders
/ios
/android
</file>

<file path=".npmrc">
legacy-peer-deps=true
</file>

<file path="global.css">
@tailwind base;
@tailwind components;
@tailwind utilities;
</file>

<file path="nativewind-env.d.ts">
/// <reference types="nativewind/types" />
</file>

<file path="SETUP.md">
# Brewed by Boon — Setup & Installation Guide

Complete instructions for getting the app running on your iPhone and Mac.

---

## What You Need

| Tool | Why | Free? |
|------|-----|-------|
| [Supabase](https://supabase.com) account | Cloud database + backend | Yes |
| [Expo](https://expo.dev) account | Building and deploying the app | Yes |
| [Brave Search API](https://api.search.brave.com) key | Event discovery feature | Free tier available |
| [Node.js](https://nodejs.org) (v18+) | Run the build tools | Yes |
| iPhone with iOS 16+ | Run the app | — |

---

## Part 1 — Supabase Setup (Database + Backend)

### 1.1 Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Name it `brewed-by-boon`, choose a strong database password, pick a region close to you (e.g. `eu-west-2 London`)
3. Wait ~2 minutes for it to provision

### 1.2 Run the database migrations

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase/migrations.sql` from this project
4. Copy the entire contents and paste into the SQL editor
5. Click **Run** — you should see "Success. No rows returned"

This creates all the tables: `profiles`, `concessions_companies`, `events`, `event_financials`, `staffing_entries`, `infrastructure_items` with all the correct columns, RLS policies, and triggers.

### 1.3 Get your API keys

In your Supabase project:
- Go to **Settings → API**
- Copy **Project URL** → this is your `EXPO_PUBLIC_SUPABASE_URL`
- Copy **anon public** key → this is your `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Copy **service_role** key → this is your `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — only used server-side)

### 1.4 Create your .env file

In the project root, copy the example file:

```bash
cp .env.example .env
```

Then fill in your values:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
BRAVE_SEARCH_API_KEY=BSA...your-brave-key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...
```

### 1.5 Get a Brave Search API key

1. Go to [api.search.brave.com](https://api.search.brave.com)
2. Sign up and create an API key (free tier gives 2,000 queries/month)
3. Add it to your `.env` as `BRAVE_SEARCH_API_KEY`

---

## Part 2 — Deploy Edge Functions (Backend Logic)

The app uses three serverless functions on Supabase for:
- **discover-events** — searches for UK events via Brave Search
- **check-application-urls** — monitors application pages for changes
- **send-push-notification** — sends push alerts to your iPhone

### 2.1 Install Supabase CLI

```bash
npm install -g supabase
```

### 2.2 Log in and link your project

```bash
supabase login
supabase link --project-ref your-project-ref
```

(Find your project ref in Supabase → Settings → General — it's in the project URL: `https://your-ref.supabase.co`)

### 2.3 Set secrets for the Edge Functions

```bash
supabase secrets set BRAVE_SEARCH_API_KEY=your_brave_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2.4 Deploy all three functions

```bash
supabase functions deploy discover-events
supabase functions deploy check-application-urls
supabase functions deploy send-push-notification
```

Each deploy takes about 30 seconds. You should see "Deployed Function" in the output.

### 2.5 Schedule automatic URL checking (optional)

To have the app automatically check application pages daily:

1. In Supabase → **SQL Editor**, run:
```sql
-- Enable pg_cron extension (may already be enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily URL check at 9am UTC
SELECT cron.schedule(
  'check-application-urls-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/check-application-urls',
    headers := '{"Authorization": "Bearer your-service-role-key"}'::jsonb
  );
  $$
);
```

Replace `your-project-ref` and `your-service-role-key` with your actual values.

---

## Part 3 — Running on Your iPhone (Development — Free)

This uses **Expo Go**, a free app that lets you run the app instantly without any App Store submission.

### 3.1 Install dependencies

In the project folder:

```bash
npm install
```

### 3.2 Start the development server

```bash
npx expo start
```

You'll see a QR code in your terminal.

### 3.3 Install Expo Go on your iPhone

1. Open the **App Store** on your iPhone
2. Search for **Expo Go** and install it

### 3.4 Open the app

1. Open the **Camera** app on your iPhone
2. Point it at the QR code in your terminal
3. Tap the banner that appears — the app will open in Expo Go

**That's it!** The app will load with your live data.

> **Note:** Both your Mac and iPhone need to be on the **same WiFi network** for this to work.

### Re-opening later

After the first setup:
1. `npx expo start` on your Mac
2. Scan QR code, or open Expo Go and it remembers recent apps

---

## Part 4 — Installing on Your iPhone Properly (No Expo Go)

For a proper installation on your home screen (like a real app), you need to build it with EAS Build.

### 4.1 Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### 4.2 Configure EAS

In the project folder:

```bash
eas build:configure
```

This creates an `eas.json` file. Accept all defaults.

### 4.3 Build for iOS

```bash
eas build --platform ios --profile preview
```

- This uploads the code to Expo's build servers
- Takes 10–20 minutes the first time
- You'll get a URL to download the `.ipa` file when done
- No Apple Developer account needed for a personal device build using EAS preview profile

### 4.4 Install on your iPhone

Once the build is complete:
1. EAS will give you a QR code or link
2. Open the link on your iPhone (in Safari)
3. Tap **Install** when prompted
4. Go to **Settings → General → VPN & Device Management** and trust the developer certificate

The app icon will appear on your home screen.

---

## Part 5 — Mac App (Optional)

Expo supports running the app as a Mac app via Mac Catalyst, but the simplest approach for Mac is to just use the web version or keep it as iPhone-only (since it's designed for mobile use on the go).

To run on your Mac for testing:

```bash
npx expo start --ios
```

This opens the iOS Simulator (requires Xcode installed from the App Store).

---

## Part 6 — Setting Up Two Devices

To use the app on both your iPhone and a staff member's iPhone:

**Same account (shared data):**
1. Both devices sign into the app with the same email/password
2. All events, companies, and financials are shared between devices
3. Good for owner + one staff member who needs to see everything

**Separate accounts (separate data):**
1. Each device creates a separate account
2. Each person only sees their own data
3. Good if staff should only see events they're working on

---

## Troubleshooting

**"Network request failed" on startup**
→ Check your `.env` file has the correct Supabase URL and anon key (no trailing spaces)

**"Discover" search returns no results**
→ Make sure your Brave Search API key is set: `supabase secrets set BRAVE_SEARCH_API_KEY=...`

**Push notifications not arriving**
→ On first launch, accept the notification permission prompt. Then go to an event detail page — the app registers your push token. If you dismissed it, go to iPhone Settings → Brewed (or Expo Go) → Notifications and enable.

**App won't open after QR scan**
→ Make sure iPhone and Mac are on the same WiFi. If on different networks, use `npx expo start --tunnel` instead.

**TypeScript / build errors**
→ Run `npm install` first. If errors persist, `rm -rf node_modules && npm install`.

---

## Project Structure (Quick Reference)

```
app/           — All screens (Expo Router file-based routing)
components/    — Reusable UI components
lib/           — Supabase client, React Query hooks, formatters
supabase/
  functions/   — Edge Functions (deployed to Supabase, not the phone)
  migrations.sql — Run this once in Supabase SQL Editor
types/         — TypeScript types
.env           — Your credentials (never commit this file)
```

---

## Key Features

| Feature | How it works |
|---------|-------------|
| **Events tracker** | Full CRUD with status tracking (Pending → Accepted/Rejected/Waitlisted) |
| **Application timeline** | Visual journey showing where each application is |
| **URL monitoring** | Paste an application portal URL; app alerts you if the page changes |
| **Event discovery** | Brave Search finds UK markets/festivals you can apply to |
| **Add discovered events** | One tap adds a found event to your tracker |
| **Financials** | Track gross sales, COGS, pitch fee, staffing, travel — auto-calculates net profit & margin |
| **Reports** | Monthly breakdown, top events by profit, CSV export |
| **Dashboard** | YTD stats, revenue chart, acceptance rate, upcoming events |
| **Multi-device** | Cloud sync via Supabase — same data on all your devices |
</file>

<file path="app/(auth)/sign-in.tsx">
import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  async function handleSignIn() {
    if (!canSubmit) {
      if (!email || !password) {
        Alert.alert('Error', 'Please enter your email and password.');
      }
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) Alert.alert('Sign in failed', error.message);
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      Alert.alert('Enter your email', 'Please type your email address above, then tap "Forgot password?" again.');
      return;
    }
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setSendingReset(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Check your email', `A password reset link has been sent to ${email.trim()}.`);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-stone-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-12">
          <View className="items-center mb-10">
            <View className="w-20 h-20 rounded-2xl bg-amber-700 items-center justify-center mb-4">
              <Text className="text-4xl">☕</Text>
            </View>
            <Text className="text-3xl font-bold text-white">Brewed by Boon</Text>
            <Text className="text-stone-400 mt-1">Coffee Truck Management</Text>
          </View>

          <View className="gap-4">
            <View>
              <Text className="text-stone-300 mb-1.5 font-medium">Email</Text>
              <TextInput
                className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border border-stone-700"
                placeholder="you@example.com"
                placeholderTextColor="#78716c"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View>
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-stone-300 font-medium">Password</Text>
                <TouchableOpacity onPress={handleForgotPassword} disabled={sendingReset} accessibilityRole="button">
                  <Text className="text-amber-500 text-xs font-medium">
                    {sendingReset ? 'Sending…' : 'Forgot password?'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                ref={passwordRef}
                className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border border-stone-700"
                placeholder="••••••••"
                placeholderTextColor="#78716c"
                secureTextEntry
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
              />
            </View>

            <TouchableOpacity
              className="bg-amber-700 py-4 rounded-xl items-center mt-2"
              style={{ opacity: canSubmit ? 1 : 0.6 }}
              onPress={handleSignIn}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">Sign In</Text>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center mt-4">
              <Text className="text-stone-400">Don't have an account? </Text>
              <Link href="/(auth)/sign-up">
                <Text className="text-amber-500 font-medium">Sign up</Text>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
</file>

<file path="app/(auth)/sign-up.tsx">
import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Strength = { label: string; color: string; bars: number };

function scorePassword(pw: string): Strength {
  if (!pw) return { label: '', color: '#57534e', bars: 0 };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { label: 'Weak', color: '#ef4444', bars: 1 };
  if (score <= 3) return { label: 'Medium', color: '#f59e0b', bars: 2 };
  return { label: 'Strong', color: '#22c55e', bars: 3 };
}

export default function SignUpScreen() {
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const strength = useMemo(() => scorePassword(password), [password]);
  const passwordsMatch = confirmPassword.length === 0 || confirmPassword === password;
  const canSubmit =
    email.trim().length > 0 &&
    password.length >= 6 &&
    confirmPassword === password &&
    !loading;

  async function handleSignUp() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { business_name: businessName.trim() } },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Sign up failed', error.message);
    } else {
      Alert.alert('Account created!', 'Please check your email to confirm your account.');
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-stone-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-12">
          <View className="items-center mb-10">
            <View className="w-20 h-20 rounded-2xl bg-amber-700 items-center justify-center mb-4">
              <Text className="text-4xl">☕</Text>
            </View>
            <Text className="text-3xl font-bold text-white">Create Account</Text>
            <Text className="text-stone-400 mt-1">Start tracking your events</Text>
          </View>

          <View className="gap-4">
            <View>
              <Text className="text-stone-300 mb-1.5 font-medium">Business Name</Text>
              <TextInput
                className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border border-stone-700"
                placeholder="Brewed by Boon Ltd"
                placeholderTextColor="#78716c"
                autoCapitalize="words"
                value={businessName}
                onChangeText={setBusinessName}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View>
              <Text className="text-stone-300 mb-1.5 font-medium">Email</Text>
              <TextInput
                ref={emailRef}
                className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border border-stone-700"
                placeholder="you@example.com"
                placeholderTextColor="#78716c"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View>
              <Text className="text-stone-300 mb-1.5 font-medium">Password</Text>
              <TextInput
                ref={passwordRef}
                className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border border-stone-700"
                placeholder="Min. 6 characters"
                placeholderTextColor="#78716c"
                secureTextEntry
                autoComplete="password-new"
                value={password}
                onChangeText={setPassword}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                blurOnSubmit={false}
              />
              {password.length > 0 && (
                <View className="mt-2 flex-row items-center gap-2">
                  <View className="flex-row gap-1 flex-1">
                    {[1, 2, 3].map((i) => (
                      <View
                        key={i}
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: i <= strength.bars ? strength.color : '#44403c',
                        }}
                      />
                    ))}
                  </View>
                  <Text style={{ color: strength.color, fontSize: 11, fontWeight: '600', minWidth: 54, textAlign: 'right' }}>
                    {strength.label}
                  </Text>
                </View>
              )}
            </View>

            <View>
              <Text className="text-stone-300 mb-1.5 font-medium">Confirm Password</Text>
              <TextInput
                ref={confirmRef}
                className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border"
                style={{ borderColor: passwordsMatch ? '#44403c' : '#dc2626' }}
                placeholder="Re-enter your password"
                placeholderTextColor="#78716c"
                secureTextEntry
                autoComplete="password-new"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
              />
              {!passwordsMatch && (
                <Text className="text-red-500 text-xs mt-1.5">Passwords don't match</Text>
              )}
            </View>

            <TouchableOpacity
              className="bg-amber-700 py-4 rounded-xl items-center mt-2"
              style={{ opacity: canSubmit ? 1 : 0.6 }}
              onPress={handleSignUp}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">Create Account</Text>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center mt-4">
              <Text className="text-stone-400">Already have an account? </Text>
              <Link href="/(auth)/sign-in">
                <Text className="text-amber-500 font-medium">Sign in</Text>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
</file>

<file path="app/(tabs)/fleet/index.tsx">
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDashboard } from '@/lib/queries/dashboard';
import { useUnits } from '@/lib/queries/units';
import { UnitCard } from '@/components/units/UnitCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { QueryError } from '@/components/shared/QueryError';
import type { UnitWithStatus } from '@/types';

export default function FleetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: dashboardStats, isLoading: dashboardLoading, refetch: refetchDashboard } = useDashboard();
  const { data: rawUnits, isLoading: unitsLoading, isError, error, refetch: refetchUnits } = useUnits();

  const isLoading = dashboardLoading && unitsLoading;

  // Prefer dashboard unitStatuses (includes currentEvent), fall back to raw units
  const units: UnitWithStatus[] = dashboardStats?.unitStatuses
    ?? (rawUnits?.map((u) => ({ ...u, currentEvent: null })) ?? []);

  const activeCount = units.filter((u) => u.status === 'active').length;
  const maintenanceCount = units.filter((u) => u.status === 'maintenance').length;

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refetchDashboard(), refetchUnits()]);
    setRefreshing(false);
  }

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pt-2 pb-3 bg-white border-b border-stone-100">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xl font-bold text-stone-900">Your Fleet</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/fleet/new')}
            accessibilityRole="button"
            accessibilityLabel="Add new unit"
            className="bg-amber-700 px-4 py-2 rounded-xl"
          >
            <Text className="text-white font-semibold text-sm">+ Add Unit</Text>
          </TouchableOpacity>
        </View>

        {units.length > 0 && (
          <View className="flex-row gap-2">
            {activeCount > 0 && (
              <View className="bg-green-100 px-3 py-1 rounded-full">
                <Text className="text-green-800 text-xs font-semibold">{activeCount} active</Text>
              </View>
            )}
            {maintenanceCount > 0 && (
              <View className="bg-amber-100 px-3 py-1 rounded-full">
                <Text className="text-amber-800 text-xs font-semibold">{maintenanceCount} in maintenance</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {isLoading ? (
        <LoadingSpinner message="Loading fleet..." />
      ) : isError ? (
        <QueryError error={error} onRetry={refetchUnits} message="Couldn't load fleet" />
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />
          }
        >
          {units.length === 0 ? (
            <EmptyState
              icon="🚐"
              title="No units added yet"
              description="Add your coffee trucks and vans to track where they are."
              action={{ label: 'Add First Unit', onPress: () => router.push('/(tabs)/fleet/new') }}
            />
          ) : (
            units.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                currentEvent={unit.currentEvent}
                onPress={() => router.push(`/(tabs)/fleet/${unit.id}`)}
              />
            ))
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}
</file>

<file path="app/(tabs)/calendar.tsx">
import React, { useState } from 'react';
import { View, Text, RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvents } from '@/lib/queries/events';
import { CalendarView } from '@/components/events/CalendarView';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Show all active events (exclude rejected and withdrawn)
  const { data: allEvents = [], isLoading, refetch } = useEvents();
  const events = allEvents.filter(
    (e) => e.status !== 'rejected' && e.status !== 'withdrawn',
  );

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pt-2 pb-3 bg-white border-b border-stone-100">
        <Text className="text-2xl font-bold text-stone-900">Calendar</Text>
        <Text className="text-stone-500 text-xs mt-0.5">Accepted, waitlisted &amp; pending events</Text>
      </View>

      {isLoading ? (
        <LoadingSpinner message="Loading calendar..." />
      ) : !events || events.length === 0 ? (
        <ScrollView
          className="flex-1 px-4 pt-8"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />
          }
        >
          <EmptyState
            icon="📅"
            title="No upcoming events"
            description="Accepted, waitlisted and pending events will appear here automatically."
          />
        </ScrollView>
      ) : (
        <CalendarView
          events={events}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />
          }
        />
      )}
    </View>
  );
}
</file>

<file path="components/companies/CompanyForm.tsx">
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useForm, Controller, Resolver } from 'react-hook-form';
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
    resolver: zodResolver(companySchema) as Resolver<CompanyFormValues>,
    defaultValues: { name: '', contact_name: '', email: '', phone: '', website: '', notes: '', ...defaultValues },
  });

  async function handleFormSubmit(data: CompanyFormValues) {
    setLoading(true);
    try {
      await onSubmit(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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
</file>

<file path="components/dashboard/RevenueBarChart.tsx">
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { MonthlyRevenue } from '@/types';
import { formatCurrencyCompact } from '@/lib/formatters';

const CHART_HEIGHT = 140;

interface Props {
  data: MonthlyRevenue[];
}

export function RevenueBarChart({ data }: Props) {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const maxValue = Math.max(...data.map((d) => Math.max(d.grossSales, d.netProfit)), 1);
  const hasAnyData = data.some((d) => d.grossSales > 0 || d.netProfit !== 0);

  const selected = selectedMonth != null ? data[selectedMonth] : null;

  return (
    <View className="bg-white rounded-2xl p-4 border border-stone-100">
      <Text className="font-bold text-stone-900 mb-2">Monthly Revenue {new Date().getFullYear()}</Text>

      {!hasAnyData ? (
        <View className="py-8 items-center justify-center">
          <Text className="text-3xl mb-2">📊</Text>
          <Text className="text-stone-500 text-sm text-center px-4">
            No revenue recorded for this year yet.
          </Text>
          <Text className="text-stone-400 text-xs text-center mt-1 px-4">
            Add financials to your events to see your monthly breakdown.
          </Text>
        </View>
      ) : (
        <>
          <View className="flex-row items-center gap-4 mb-3">
            <View className="flex-row items-center gap-1.5">
              <View className="w-3 h-3 rounded-sm bg-amber-400" />
              <Text className="text-stone-500 text-xs">Gross Sales</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-3 h-3 rounded-sm bg-green-500" />
              <Text className="text-stone-500 text-xs">Net Profit</Text>
            </View>
          </View>

          {/* Tooltip */}
          <View style={{ minHeight: 34, marginBottom: 4 }}>
            {selected ? (
              <View style={{ backgroundColor: '#fef3c7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#78350f' }}>{selected.month}</Text>
                <Text style={{ fontSize: 10, color: '#92400e' }}>
                  Gross {formatCurrencyCompact(selected.grossSales)} · Net {formatCurrencyCompact(selected.netProfit)}
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 10, color: '#a8a29e' }}>Tap a bar for details</Text>
            )}
          </View>

          <View style={{ height: CHART_HEIGHT, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
            {data.map((d, i) => {
              const grossHeight = maxValue > 0 ? (d.grossSales / maxValue) * (CHART_HEIGHT - 20) : 0;
              const netHeight = maxValue > 0 ? (Math.max(d.netProfit, 0) / maxValue) * (CHART_HEIGHT - 20) : 0;
              const isSelected = selectedMonth === i;
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.7}
                  onPress={() => setSelectedMonth(isSelected ? null : i)}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.month}: gross ${d.grossSales.toFixed(0)}, net ${d.netProfit.toFixed(0)}`}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: CHART_HEIGHT - 20, opacity: isSelected || selectedMonth == null ? 1 : 0.4 }}>
                    <View style={{ width: '45%', height: grossHeight, backgroundColor: '#fbbf24', borderRadius: 2 }} />
                    <View style={{ width: '45%', height: netHeight, backgroundColor: '#22c55e', borderRadius: 2 }} />
                  </View>
                  <Text style={{ fontSize: 9, color: isSelected ? '#b45309' : '#a8a29e', marginTop: 2, fontWeight: isSelected ? '700' : '500' }}>
                    {d.month.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}
</file>

<file path="components/dashboard/StatCard.tsx">
import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  title: string;
  value: string;
  subtext?: string;
  subtitle?: string;
  icon?: string;
  trendValue?: number;
  colorScheme?: 'default' | 'green' | 'amber' | 'red';
}

export function StatCard({ title, value, subtext, subtitle, icon, trendValue, colorScheme = 'default' }: Props) {
  const bgColors = {
    default: 'bg-white',
    green: 'bg-green-50',
    amber: 'bg-amber-50',
    red: 'bg-red-50',
  };
  const valueColors = {
    default: 'text-stone-900',
    green: 'text-green-700',
    amber: 'text-amber-700',
    red: 'text-red-600',
  };

  return (
    <View className={`${bgColors[colorScheme]} rounded-2xl p-4 border border-stone-100 flex-1`}>
      <View className="flex-row items-center justify-between mb-2">
        {icon && <Text className="text-xl">{icon}</Text>}
        {trendValue !== undefined && (
          <View className={`flex-row items-center px-1.5 py-0.5 rounded-full ${trendValue >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
            <Text className={`text-xs font-medium ${trendValue >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {trendValue >= 0 ? '↑' : '↓'} {Math.abs(trendValue).toFixed(0)}%
            </Text>
          </View>
        )}
      </View>
      <Text className={`text-xl font-bold ${valueColors[colorScheme]}`} numberOfLines={1}>{value}</Text>
      <Text className="text-stone-500 text-xs mt-0.5">{title}</Text>
      {subtext && <Text className="text-stone-400 text-xs mt-1">{subtext}</Text>}
      {subtitle && <Text className="text-stone-400 text-xs mt-1">{subtitle}</Text>}
    </View>
  );
}
</file>

<file path="components/shared/CurrencyInput.tsx">
import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface Props extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: number;
  onChangeValue: (value: number) => void;
  label?: string;
  error?: string;
  currencySymbol?: string;
}

export function CurrencyInput({
  value,
  onChangeValue,
  label,
  error,
  currencySymbol = '£',
  ...props
}: Props) {
  const [displayValue, setDisplayValue] = useState(value > 0 ? value.toString() : '');

  function handleChangeText(text: string) {
    const cleaned = text.replace(/[^0-9.]/g, '');
    setDisplayValue(cleaned);
    const parsed = parseFloat(cleaned);
    onChangeValue(isNaN(parsed) ? 0 : parsed);
  }

  function handleBlur() {
    if (value > 0) {
      setDisplayValue(value.toFixed(2));
    } else {
      setDisplayValue('');
    }
  }

  function handleFocus() {
    if (value === 0) setDisplayValue('');
  }

  return (
    <View>
      {label && <Text className="text-stone-600 text-sm font-medium mb-1">{label}</Text>}
      <View className={`flex-row items-center bg-stone-50 border rounded-xl px-3 py-3 ${error ? 'border-red-400' : 'border-stone-200'}`}>
        <Text className="text-stone-500 mr-1 text-base">{currencySymbol}</Text>
        <TextInput
          className="flex-1 text-stone-900 text-base"
          value={displayValue}
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          onFocus={handleFocus}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#a8a29e"
          {...props}
        />
      </View>
      {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
    </View>
  );
}

export function currencySymbolFor(code: string | null | undefined): string {
  switch ((code ?? 'GBP').toUpperCase()) {
    case 'EUR':
      return '€';
    case 'USD':
      return '$';
    case 'GBP':
    default:
      return '£';
  }
}
</file>

<file path="components/shared/EmptyState.tsx">
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';

interface ActionProp {
  label: string;
  onPress: () => void;
}

interface Props {
  icon?: string;
  title: string;
  description?: string;
  action?: ActionProp;
  secondaryAction?: ActionProp;
  tip?: string;
}

export function EmptyState({ icon = '📋', title, description, action, secondaryAction, tip }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <Animated.View className="flex-1 items-center justify-center px-8 py-16" style={{ opacity }}>
      <Text className="text-6xl mb-4">{icon}</Text>
      <Text className="text-lg font-semibold text-stone-700 text-center">{title}</Text>
      {description && (
        <Text className="text-stone-500 text-center mt-2">{description}</Text>
      )}
      {tip && (
        <View className="mt-4 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-xl">
          <Text className="text-amber-800 text-xs text-center">💡 {tip}</Text>
        </View>
      )}
      {action && (
        <TouchableOpacity
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          className="mt-6 bg-amber-700 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">{action.label}</Text>
        </TouchableOpacity>
      )}
      {secondaryAction && (
        <TouchableOpacity
          onPress={secondaryAction.onPress}
          accessibilityRole="button"
          accessibilityLabel={secondaryAction.label}
          className="mt-3 px-6 py-3"
        >
          <Text className="text-amber-700 font-medium">{secondaryAction.label}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}
</file>

<file path="components/shared/EventStatusBadge.tsx">
import React from 'react';
import { View, Text } from 'react-native';
import { STATUS_COLORS, STATUS_LABELS } from '@/constants';
import type { ApplicationStatus } from '@/types';

interface Props {
  status: ApplicationStatus;
  size?: 'sm' | 'md';
}

export function EventStatusBadge({ status, size = 'md' }: Props) {
  const colors = STATUS_COLORS[status];
  const label = STATUS_LABELS[status];
  const isSmall = size === 'sm';

  return (
    <View
      style={{ backgroundColor: colors.bgHex, paddingVertical: isSmall ? 2 : 4, paddingHorizontal: 10, borderRadius: 999, flexDirection: 'row', alignItems: 'center' }}
    >
      <View
        style={{ backgroundColor: colors.dot, width: isSmall ? 5 : 6, height: isSmall ? 5 : 6, borderRadius: 3, marginRight: 6 }}
      />
      <Text style={{ color: colors.textHex, fontWeight: '500', fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
}
</file>

<file path="components/shared/PageHeader.tsx">
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Props {
  title: string;
  subtitle?: string;
  backButton?: boolean;
  rightAction?: { label: string; onPress: () => void };
}

export function PageHeader({ title, subtitle, backButton, rightAction }: Props) {
  const router = useRouter();

  return (
    <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
      <View className="flex-row items-center flex-1">
        {backButton && (
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: -10,
              marginRight: 4,
            }}
          >
            <Ionicons name="chevron-back" size={26} color="#b45309" />
          </TouchableOpacity>
        )}
        <View className="flex-1">
          <Text className="text-xl font-bold text-stone-900" numberOfLines={1}>{title}</Text>
          {subtitle && <Text className="text-stone-500 text-sm mt-0.5">{subtitle}</Text>}
        </View>
      </View>
      {rightAction && (
        <TouchableOpacity
          onPress={rightAction.onPress}
          accessibilityRole="button"
          accessibilityLabel={rightAction.label}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          className="ml-3"
        >
          <Text className="text-amber-600 font-semibold text-sm">{rightAction.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
</file>

<file path="lib/queries/profile.ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface Metric {
  id: string;
  name: string;
  unit: string;
  enabled: boolean;
  builtin?: boolean;
}

export interface UserProfile {
  id: string;
  business_name: string | null;
  business_type: string;
  currency: string;
  custom_metrics: Metric[];
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, business_name, business_type, currency, custom_metrics')
        .eq('id', userId)
        .single();
      if (error) return null;
      return {
        ...data,
        business_type: data.business_type ?? 'Coffee',
        currency: data.currency ?? 'GBP',
        custom_metrics: data.custom_metrics ?? [],
      };
    },
    enabled: !!userId,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<Omit<UserProfile, 'id'>> }) => {
      const { error } = await supabase.from('profiles').upsert({ id: userId, ...updates });
      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}
</file>

<file path="lib/queries/reports.ts">
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcEventFinancials } from '@/lib/calculations';
import { formatMonthLabel } from '@/lib/formatters';
import { EMPTY_CALCULATIONS } from '@/types';
import type { ReportData, MonthlyBreakdown, CompanyPerformance, ApplicationStatus } from '@/types';

export function useReports(year: number) {
  return useQuery({
    queryKey: ['reports', year],
    queryFn: async (): Promise<ReportData> => {
      const { data: events, error } = await supabase
        .from('events')
        .select('*, event_financials(*), concessions_companies(*)')
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`)
        .order('date');
      if (error) throw error;

      const { data: companies, error: cError } = await supabase
        .from('concessions_companies')
        .select('*');
      if (cError) throw cError;

      const allEvents = events ?? [];
      const allCompanies = companies ?? [];

      const totalGross = allEvents.reduce((s, e) => s + (e.event_financials?.gross_sales ?? 0), 0);
      const totalNet = allEvents.reduce((s, e) => {
        if (!e.event_financials) return s;
        return s + calcEventFinancials(e.event_financials).netProfit;
      }, 0);
      const avgMargin = totalGross > 0 ? (totalNet / totalGross) * 100 : 0;

      const monthlyMap = new Map<number, MonthlyBreakdown>();
      for (let m = 1; m <= 12; m++) {
        monthlyMap.set(m, {
          month: m,
          monthLabel: formatMonthLabel(m, year),
          eventCount: 0,
          grossSales: 0,
          totalCosts: 0,
          netProfit: 0,
          profitMargin: 0,
        });
      }
      allEvents.forEach((e) => {
        const month = parseInt(e.date.split('-')[1], 10);
        const entry = monthlyMap.get(month)!;
        entry.eventCount += 1;
        entry.grossSales += e.event_financials?.gross_sales ?? 0;
        if (e.event_financials) {
          const calc = calcEventFinancials(e.event_financials);
          entry.totalCosts += calc.totalCosts;
          entry.netProfit += calc.netProfit;
        }
      });
      monthlyMap.forEach((entry) => {
        entry.profitMargin = entry.grossSales > 0 ? (entry.netProfit / entry.grossSales) * 100 : 0;
      });

      const totalFreshMilkLitres = allEvents.reduce((s, e) => s + (e.event_financials?.fresh_milk_litres ?? 0), 0);
      const totalAltMilkLitres = allEvents.reduce((s, e) => s + (e.event_financials?.alt_milk_litres ?? 0), 0);

      const topEvents = [...allEvents]
        .filter((e) => e.event_financials)
        .sort(
          (a, b) =>
            calcEventFinancials(b.event_financials!).netProfit -
            calcEventFinancials(a.event_financials!).netProfit
        )
        .slice(0, 10)
        .map((e) => ({
          ...e,
          calculations: calcEventFinancials(e.event_financials!),
        }));

      const companyPerformance: CompanyPerformance[] = allCompanies.map((company) => {
        const companyEvents = allEvents.filter((e) => e.company_id === company.id);
        const accepted = companyEvents.filter((e) => e.status === 'accepted').length;
        const decided = companyEvents.filter(
          (e) => e.status === 'accepted' || e.status === 'rejected'
        ).length;
        return {
          company,
          totalEvents: companyEvents.length,
          acceptedEvents: accepted,
          totalRevenue: companyEvents.reduce((s, e) => s + (e.event_financials?.gross_sales ?? 0), 0),
          acceptanceRate: decided > 0 ? (accepted / decided) * 100 : 0,
        };
      }).filter((cp) => cp.totalEvents > 0);

      return {
        year,
        totalGross,
        totalNet,
        totalEvents: allEvents.length,
        avgMargin,
        totalFreshMilkLitres,
        totalAltMilkLitres,
        monthly: Array.from(monthlyMap.values()),
        topEvents,
        companyPerformance,
      };
    },
  });
}
</file>

<file path="lib/formatters.ts">
import { format, parseISO, isValid } from 'date-fns';

export function formatCurrency(value: number | null | undefined): string {
  const n = value == null || !Number.isFinite(value) ? 0 : value;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatCurrencyCompact(value: number | null | undefined): string {
  const n = value == null || !Number.isFinite(value) ? 0 : value;
  if (Math.abs(n) >= 1000) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  }
  return formatCurrency(n);
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  const n = value == null || !Number.isFinite(value) ? 0 : value;
  return `${n.toFixed(decimals)}%`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, 'd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, 'd MMM');
  } catch {
    return dateStr;
  }
}

export function formatDateRange(startStr: string | null | undefined, endStr?: string | null): string {
  if (!startStr) return '';
  const start = formatDate(startStr);
  if (!endStr) return start;
  try {
    const startDate = parseISO(startStr);
    const endDate = parseISO(endStr);
    if (!isValid(startDate) || !isValid(endDate)) return start;
    if (format(startDate, 'MMM yyyy') === format(endDate, 'MMM yyyy')) {
      return `${format(startDate, 'd')}–${format(endDate, 'd MMM yyyy')}`;
    }
    return `${format(startDate, 'd MMM')} – ${format(endDate, 'd MMM yyyy')}`;
  } catch {
    return start;
  }
}

export function formatMonthLabel(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  return format(date, 'MMM');
}

export function toISODateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
</file>

<file path="supabase/functions/check-application-urls/index.ts">
// Supabase Edge Function: check-application-urls
// Fetches all event application URLs, hashes content, flags changes, sends push notifications
// Deploy with: supabase functions deploy check-application-urls
// Schedule daily via pg_cron (see migrations.sql)
// Required secrets: SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content.slice(0, 50_000)); // limit to 50KB
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrewedByBoon/1.0; +application-status-check)',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Strip tags to reduce noise from dynamic content like timestamps
    return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
               .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
               .replace(/<[^>]+>/g, ' ')
               .replace(/\s+/g, ' ')
               .trim();
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Fetch all events that have an application URL and haven't been flagged yet
  const { data: events, error } = await supabase
    .from('events')
    .select('id, name, user_id, application_url, page_hash, url_changed')
    .not('application_url', 'is', null)
    .eq('url_changed', false);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  const results = { checked: 0, changed: 0, errors: 0, notified: 0 };

  for (const event of events ?? []) {
    if (!event.application_url) continue;
    results.checked++;

    const content = await fetchPageContent(event.application_url);
    if (!content) { results.errors++; continue; }

    const newHash = await hashContent(content);
    const now = new Date().toISOString();

    if (!event.page_hash) {
      // First check — just store the hash, don't alert
      await supabase
        .from('events')
        .update({ page_hash: newHash, url_last_checked_at: now })
        .eq('id', event.id);
      continue;
    }

    if (newHash !== event.page_hash) {
      // Page has changed — flag it
      results.changed++;
      await supabase
        .from('events')
        .update({ page_hash: newHash, url_last_checked_at: now, url_changed: true })
        .eq('id', event.id);

      // Get the user's push token
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', event.user_id)
        .single();

      if (profile?.push_token) {
        // Send push notification via our send-push-notification function
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              to: profile.push_token,
              title: '📋 Application Page Changed',
              body: `"${event.name}" — the application page has been updated. Tap to check your status.`,
              data: { eventId: event.id, type: 'url_changed' },
            }),
          });
          results.notified++;
        } catch { /* notification failed silently */ }
      }
    } else {
      // No change — just update the check timestamp
      await supabase
        .from('events')
        .update({ url_last_checked_at: now })
        .eq('id', event.id);
    }
  }

  // ── Also check uk_events_directory application URLs ──────────────────────
  const { data: directoryEntries } = await supabase
    .from('uk_events_directory')
    .select('id, name, application_url, page_hash')
    .not('application_url', 'is', null);

  const dirResults = { checked: 0, changed: 0, errors: 0 };

  for (const entry of directoryEntries ?? []) {
    if (!entry.application_url) continue;
    dirResults.checked++;

    const content = await fetchPageContent(entry.application_url);
    if (!content) { dirResults.errors++; continue; }

    const newHash = await hashContent(content);
    const now = new Date().toISOString();

    if (!entry.page_hash) {
      await supabase
        .from('uk_events_directory')
        .update({ page_hash: newHash, last_verified_at: now })
        .eq('id', entry.id);
      continue;
    }

    if (newHash !== entry.page_hash) {
      dirResults.changed++;
      await supabase
        .from('uk_events_directory')
        .update({ page_hash: newHash, last_verified_at: now, application_changed: true })
        .eq('id', entry.id);
    } else {
      await supabase
        .from('uk_events_directory')
        .update({ last_verified_at: now })
        .eq('id', entry.id);
    }
  }

  return new Response(
    JSON.stringify({ success: true, events: results, directory: dirResults }),
    { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  );
});
</file>

<file path="supabase/functions/sync-directory/index.ts">
// Supabase Edge Function: sync-directory
// Searches Brave Search for new UK food market / festival trader opportunities
// and upserts them into uk_events_directory.
//
// Deploy:   supabase functions deploy sync-directory
// Secrets:  supabase secrets set BRAVE_SEARCH_API_KEY=your_key
// Schedule: run daily at 03:00 UTC via pg_cron (see migrations.sql)
//
// The function is idempotent — it uses ON CONFLICT (name) DO UPDATE,
// so running it multiple times will not create duplicates.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

// Search queries designed to find UK trader application pages
const SEARCH_QUERIES = [
  'UK music festival street food coffee trader application 2025 apply',
  'UK food festival concessions trader application 2025',
  'UK street food market stall holder application 2025 apply now',
  'UK Christmas market trader application 2025 2026',
  'UK outdoor festival catering pitch application open',
  'UK county show food trader stall application 2025',
  'UK motorsport event catering trader apply 2025',
  'Glastonbury Latitude Victorious food trader application',
  'UK farmers market artisan food stall application',
];

// Known concessions companies to specifically check
const COMPANY_QUERIES = [
  'Togather traders festival UK apply coffee 2025',
  'D&J Catering Events traders apply UK',
  'Eat Drink Festivals trader application 2025',
  'Severn Events trader stall apply',
  'NCASS food truck trader application UK',
];

interface BraveResult {
  title: string;
  url: string;
  description: string;
}

type DirectoryCategory =
  | 'Music Festival'
  | 'Food Festival'
  | 'Street Food Market'
  | 'Christmas Market'
  | 'Garden and Lifestyle'
  | 'Motorsport'
  | 'Equestrian'
  | 'Concessions Company'
  | 'Industry Body'
  | 'Event';

function detectCategory(title: string, description: string): DirectoryCategory {
  const text = (title + ' ' + description).toLowerCase();
  if (text.includes('concessions') || text.includes('trader portal') || text.includes('catering company')) return 'Concessions Company';
  if (text.includes('ncass') || text.includes('industry') || text.includes('association')) return 'Industry Body';
  if (text.includes('christmas market') || text.includes('xmas market') || text.includes('winter market')) return 'Christmas Market';
  if (text.includes('music festival') || text.includes('glastonbury') || text.includes('latitude') || text.includes('victorious')) return 'Music Festival';
  if (text.includes('food festival') || text.includes('food & drink') || text.includes('eat & drink')) return 'Food Festival';
  if (text.includes('street food') || text.includes('streetfood') || text.includes('food market')) return 'Street Food Market';
  if (text.includes('motorsport') || text.includes('grand prix') || text.includes('goodwood') || text.includes('silverstone')) return 'Motorsport';
  if (text.includes('equestrian') || text.includes('horse') || text.includes('polo')) return 'Equestrian';
  if (text.includes('garden') || text.includes('lifestyle') || text.includes('flower') || text.includes('hampton court') || text.includes('chelsea')) return 'Garden and Lifestyle';
  return 'Event';
}

function extractRegion(title: string, description: string, url: string): string | null {
  const text = (title + ' ' + description + ' ' + url).toLowerCase();
  if (text.includes('london') || text.includes('hyde park') || text.includes('victoria park')) return 'London';
  if (text.includes('edinburgh') || text.includes('glasgow') || text.includes('scotland')) return 'Scotland';
  if (text.includes('wales') || text.includes('cardiff') || text.includes('welsh')) return 'Wales';
  if (text.includes('bristol') || text.includes('bath') || text.includes('somerset') || text.includes('south west')) return 'South West';
  if (text.includes('manchester') || text.includes('liverpool') || text.includes('north west') || text.includes('creamfields')) return 'North West';
  if (text.includes('yorkshire') || text.includes('leeds') || text.includes('sheffield')) return 'Yorkshire';
  if (text.includes('birmingham') || text.includes('midlands') || text.includes('coventry')) return 'Midlands';
  if (text.includes('norfolk') || text.includes('suffolk') || text.includes('east anglia') || text.includes('cambridge')) return 'East of England';
  if (text.includes('kent') || text.includes('surrey') || text.includes('essex') || text.includes('south east')) return 'South East';
  if (text.includes('national') || text.includes('uk wide') || text.includes('across the uk')) return 'National';
  return null;
}

function extractDateHint(title: string, description: string): string | null {
  const text = title + ' ' + description;
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  for (const month of months) {
    const match = text.match(new RegExp(`\\d{1,2}[\\s\\-–]+${month}\\s+\\d{4}|${month}\\s+\\d{4}|${month}\\s+\\d{1,2}`, 'i'));
    if (match) return match[0];
  }
  const yearMatch = text.match(/202[5-9]/);
  if (yearMatch) return yearMatch[0];
  return null;
}

// Detect if a result looks like a genuine trader application page (not news/social media)
function isRelevantResult(result: BraveResult): boolean {
  const url = result.url.toLowerCase();
  const title = result.title.toLowerCase();
  const desc = result.description.toLowerCase();

  // Skip social media, news, review sites
  const skipDomains = ['twitter.com', 'facebook.com', 'instagram.com', 'reddit.com',
    'tripadvisor.co.uk', 'yelp.co.uk', 'bbc.co.uk', 'theguardian.com',
    'dailymail.co.uk', 'timeout.com', 'visitscotland.com'];
  if (skipDomains.some((d) => url.includes(d))) return false;

  // Must mention trader / vendor / apply / stall / pitch
  const keywords = ['trader', 'vendor', 'apply', 'stall', 'pitch', 'application', 'catering', 'concessions'];
  return keywords.some((kw) => title.includes(kw) || desc.includes(kw));
}

async function searchBrave(query: string, apiKey: string): Promise<BraveResult[]> {
  const params = new URLSearchParams({
    q: query,
    count: '10',
    country: 'GB',
    search_lang: 'en',
    safesearch: 'moderate',
    freshness: 'py', // past year
  });

  try {
    const res = await fetch(`${BRAVE_API_URL}?${params}`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.web?.results ?? []) as BraveResult[];
  } catch {
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const braveKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!braveKey) {
    return new Response(
      JSON.stringify({ error: 'BRAVE_SEARCH_API_KEY not set. Deploy with: supabase secrets set BRAVE_SEARCH_API_KEY=your_key' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let added = 0;
  let updated = 0;
  let skipped = 0;

  // Combine event queries + company queries
  const allQueries = [...SEARCH_QUERIES, ...COMPANY_QUERIES];

  for (const queryStr of allQueries) {
    const results = await searchBrave(queryStr, braveKey);

    for (const result of results) {
      if (!isRelevantResult(result)) { skipped++; continue; }

      const title = result.title.replace(/\s*[-|–]\s*.+$/, '').trim(); // strip " - Site Name" suffixes
      if (!title || title.length < 5) { skipped++; continue; }

      const category = detectCategory(result.title, result.description);
      const region = extractRegion(result.title, result.description, result.url);
      const dateHint = extractDateHint(result.title, result.description);
      const hostname = new URL(result.url).hostname.replace('www.', '');

      const entry = {
        name: title.slice(0, 200),
        category,
        description: result.description?.slice(0, 500) ?? '',
        website: result.url,
        application_url: result.url,
        location: null as string | null,
        region,
        typical_dates: dateHint,
        organiser: hostname,
        source: 'brave_search',
        featured: false,
        last_verified_at: new Date().toISOString(),
      };

      // Upsert — ON CONFLICT on name (unique index exists)
      const { error } = await supabase
        .from('uk_events_directory')
        .upsert(entry, { onConflict: 'name', ignoreDuplicates: false });

      if (error) {
        // Likely a duplicate with slight name variation — skip
        skipped++;
      } else {
        // Check if it was an insert or update by querying created_at
        added++;
      }
    }

    // Brave free tier rate limit: 1 req/sec
    await new Promise((r) => setTimeout(r, 1100));
  }

  // Also run the URL freshness check inline (same as check-application-urls)
  const { data: directoryEntries } = await supabase
    .from('uk_events_directory')
    .select('id, name, application_url, page_hash')
    .not('application_url', 'is', null)
    .not('application_url', 'eq', '');

  let urlsChecked = 0;
  let urlsChanged = 0;

  for (const entry of directoryEntries ?? []) {
    if (!entry.application_url) continue;
    try {
      const res = await fetch(entry.application_url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BrewedByBoon/1.0)' },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const cleaned = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 50_000);

      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(cleaned));
      const newHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

      urlsChecked++;
      const now = new Date().toISOString();

      if (!entry.page_hash) {
        await supabase.from('uk_events_directory').update({ page_hash: newHash, last_verified_at: now }).eq('id', entry.id);
      } else if (newHash !== entry.page_hash) {
        urlsChanged++;
        await supabase.from('uk_events_directory').update({ page_hash: newHash, last_verified_at: now, application_changed: true }).eq('id', entry.id);
      } else {
        await supabase.from('uk_events_directory').update({ last_verified_at: now }).eq('id', entry.id);
      }
    } catch {
      // URL fetch failed — skip silently
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      sync: { added, updated, skipped, queriesRun: allQueries.length },
      urlCheck: { checked: urlsChecked, changed: urlsChanged },
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  );
});
</file>

<file path=".env.example">
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Brave Search API — free tier at https://brave.com/search/api/
# Set this in your Supabase project dashboard → Settings → Edge Functions → Secrets
BRAVE_SEARCH_API_KEY=your-brave-api-key-here

# Supabase service role key — from Supabase dashboard → Settings → API
# Set in Supabase Edge Function secrets (never expose in app)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
</file>

<file path="app.json">
{
  "expo": {
    "name": "Brewed by Boon",
    "slug": "brewedbyboon",
    "version": "1.0.0",
    "scheme": "brewedbyboon",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#0f172a"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.brewedbyboon.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0f172a"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false,
      "package": "com.brewedbyboon.app"
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-notifications",
        {
          "icon": "./assets/icon.png",
          "color": "#f59e0b",
          "defaultChannel": "default"
        }
      ]
    ]
  }
}
</file>

<file path="tsconfig.json">
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": [
        "./*"
      ]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.d.ts",
    "nativewind-env.d.ts"
  ],
  "exclude": [
    "supabase/functions"
  ]
}
</file>

<file path="app/(tabs)/companies/[id]/index.tsx">
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCompany } from '@/lib/queries/companies';
import { useEvents, useDeleteEvent } from '@/lib/queries/events';
import { useDeleteCompany } from '@/lib/queries/companies';
import { EventCard } from '@/components/events/EventCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency } from '@/lib/formatters';
import { calcEventFinancials } from '@/lib/calculations';

export default function CompanyDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: company, isLoading, refetch } = useCompany(id);
  const { data: allEvents } = useEvents({ companyId: id });
  const deleteCompany = useDeleteCompany();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleDelete() {
    try {
      await deleteCompany.mutateAsync(id);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  if (isLoading) return <LoadingSpinner message="Loading company..." />;
  if (!company) return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-stone-500">Company not found</Text>
    </View>
  );

  const events = allEvents ?? [];
  const totalRevenue = events.reduce((s, e) => s + (e.event_financials?.gross_sales ?? 0), 0);
  const totalNet = events.reduce((s, e) => s + e.calculations.netProfit, 0);
  const accepted = events.filter((e) => e.status === 'accepted').length;
  const decided = events.filter((e) => e.status === 'accepted' || e.status === 'rejected').length;
  const acceptanceRate = decided > 0 ? ((accepted / decided) * 100).toFixed(0) : '—';

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      <View className="bg-white px-4 pt-2 pb-4 border-b border-stone-100">
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to companies"
            className="p-1"
          >
            <Text className="text-amber-600 text-base">‹ Companies</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/(tabs)/companies/${id}/edit`)}
            accessibilityRole="button"
            accessibilityLabel="Edit company"
            className="bg-amber-700 px-4 py-1.5 rounded-xl"
          >
            <Text className="text-white font-semibold text-sm">Edit</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-xl font-bold text-stone-900">{company.name}</Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />}
      >
        {/* Contact card */}
        <View className="bg-white rounded-2xl p-4 border border-stone-100 mb-4">
          <Text className="font-bold text-stone-900 mb-3">Contact</Text>
          {company.contact_name && <Text className="text-stone-700 text-sm mb-1">👤 {company.contact_name}</Text>}
          {company.email && (
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${company.email}`)}>
              <Text className="text-amber-700 text-sm mb-1">✉️ {company.email}</Text>
            </TouchableOpacity>
          )}
          {company.phone && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${company.phone}`)}>
              <Text className="text-amber-700 text-sm mb-1">📞 {company.phone}</Text>
            </TouchableOpacity>
          )}
          {company.website && (
            <TouchableOpacity onPress={() => Linking.openURL(company.website!)}>
              <Text className="text-amber-700 text-sm">🌐 {company.website}</Text>
            </TouchableOpacity>
          )}
          {!company.contact_name && !company.email && !company.phone && !company.website && (
            <Text className="text-stone-400 text-sm">No contact details added</Text>
          )}
          {company.notes && (
            <View className="mt-3 pt-3 border-t border-stone-100">
              <Text className="text-stone-500 text-sm">{company.notes}</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View className="flex-row gap-3 mb-4">
          {[
            { label: 'Total Events', value: String(events.length) },
            { label: 'Accepted', value: `${accepted} (${acceptanceRate}%)` },
            { label: 'Total Revenue', value: formatCurrency(totalRevenue) },
            { label: 'Net Profit', value: formatCurrency(totalNet) },
          ].map((stat) => (
            <View key={stat.label} className="flex-1 bg-white rounded-xl p-3 border border-stone-100 items-center">
              <Text className="font-bold text-stone-900 text-base">{stat.value}</Text>
              <Text className="text-stone-400 text-xs mt-0.5 text-center">{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Events */}
        <Text className="font-bold text-stone-900 mb-3">Events</Text>
        {events.length === 0 ? (
          <EmptyState icon="🎪" title="No events yet" description="No events linked to this company." />
        ) : (
          events.map((event) => <EventCard key={event.id} event={event} />)
        )}

        <View className="bg-white rounded-2xl p-4 border border-stone-100 mt-4">
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'Delete Company',
                `Delete "${company.name}"? Events linked to this company will remain but will be unlinked. This cannot be undone.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: handleDelete },
                ],
              )
            }
            className="border border-red-200 py-3 rounded-xl items-center"
          >
            <Text className="text-red-500 font-medium text-sm">Delete Company</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
</file>

<file path="app/(tabs)/companies/index.tsx">
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCompanies } from '@/lib/queries/companies';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { QueryError } from '@/components/shared/QueryError';
import { formatCurrency, formatDate } from '@/lib/formatters';

export default function CompaniesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: companies, isLoading, isError, error, refetch } = useCompanies();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      <View className="px-4 pt-2 pb-3 bg-white border-b border-stone-100">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-stone-900">Companies</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/companies/new')}
            accessibilityRole="button"
            accessibilityLabel="Add new company"
            className="bg-amber-700 px-4 py-2 rounded-xl"
          >
            <Text className="text-white font-semibold text-sm">+ Add Company</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <LoadingSpinner message="Loading companies..." />
      ) : isError ? (
        <QueryError error={error} onRetry={refetch} message="Couldn't load companies" />
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />}
        >
          {!companies || companies.length === 0 ? (
            <EmptyState
              icon="🏢"
              title="No companies yet"
              description="Add concessions companies you apply to for events."
              action={{ label: '+ Add Company', onPress: () => router.push('/(tabs)/companies/new') }}
            />
          ) : (
            companies.map((company) => (
              <TouchableOpacity
                key={company.id}
                onPress={() => router.push(`/(tabs)/companies/${company.id}`)}
                className="bg-white rounded-2xl p-4 mb-3 border border-stone-100 shadow-sm"
                activeOpacity={0.7}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="font-semibold text-stone-900 text-base">{company.name}</Text>
                    {company.contact_name && (
                      <Text className="text-stone-500 text-sm mt-0.5">👤 {company.contact_name}</Text>
                    )}
                    {company.email && (
                      <Text className="text-stone-400 text-xs mt-0.5">✉️ {company.email}</Text>
                    )}
                  </View>
                  <View className="items-end">
                    <View className="bg-amber-50 px-2.5 py-1 rounded-full">
                      <Text className="text-amber-800 text-xs font-medium">{company.totalEvents} events</Text>
                    </View>
                    {company.acceptedEvents > 0 && (
                      <Text className="text-green-600 text-xs mt-1 font-medium">{company.acceptedEvents} accepted</Text>
                    )}
                    {/* Margin badge */}
                    {company.completedEventCount > 0 ? (
                      <View style={{
                        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
                        backgroundColor: (company.avgProfitMargin ?? 0) >= 25 ? '#dcfce7' : (company.avgProfitMargin ?? 0) >= 10 ? '#fef9c3' : '#fee2e2',
                        marginTop: 4,
                      }}>
                        <Text style={{
                          fontSize: 11, fontWeight: '600',
                          color: (company.avgProfitMargin ?? 0) >= 25 ? '#166534' : (company.avgProfitMargin ?? 0) >= 10 ? '#854d0e' : '#991b1b',
                        }}>
                          {(company.avgProfitMargin ?? 0).toFixed(0)}% avg margin
                        </Text>
                      </View>
                    ) : (
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: '#f5f5f4', marginTop: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#78716c' }}>No data</Text>
                      </View>
                    )}
                    {company.completedEventCount > 0 && <Text className="text-stone-400 text-xs mt-1">Avg across {company.completedEventCount} event{company.completedEventCount !== 1 ? 's' : ''}</Text>}
                  </View>
                </View>

                {company.totalRevenue > 0 && (
                  <View className="flex-row mt-3 pt-3 border-t border-stone-100 gap-4">
                    <View>
                      <Text className="text-stone-400 text-xs">Total Revenue</Text>
                      <Text className="font-semibold text-stone-900 text-sm">{formatCurrency(company.totalRevenue)}</Text>
                    </View>
                    {company.lastEventDate && (
                      <View>
                        <Text className="text-stone-400 text-xs">Last Event</Text>
                        <Text className="font-semibold text-stone-700 text-sm">{formatDate(company.lastEventDate)}</Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}
</file>

<file path="app/(tabs)/events/new.tsx">
import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EventForm } from '@/components/events/EventForm';
import { useCreateEvent } from '@/lib/mutations/events';
import { useCompanies } from '@/lib/queries/companies';
import { useUnits } from '@/lib/queries/units';
import { useAuth } from '@/lib/auth';

export default function NewEventScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const createEvent = useCreateEvent();
  const { data: companies = [] } = useCompanies();
  const { data: units = [] } = useUnits();

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-stone-100">
        <Text className="text-lg font-bold text-stone-900">New Event</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-stone-500">Cancel</Text>
        </TouchableOpacity>
      </View>
      <EventForm
        companies={companies}
        units={units}
        onSubmit={async (data) => {
          if (!user) { Alert.alert('Not signed in', 'Please sign in to create events.'); return; }
          await createEvent.mutateAsync({ data, userId: user.id });
        }}
        submitLabel="Create Event"
      />
    </View>
  );
}
</file>

<file path="app/(tabs)/reports.tsx">
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Share, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useReports } from '@/lib/queries/reports';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EventStatusBadge } from '@/components/shared/EventStatusBadge';
import { formatCurrency, formatPercent, formatDate } from '@/lib/formatters';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, refetch } = useReports(year);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleExport() {
    if (!data) return;
    const header = 'Event,Date,End Date,Location,Company,Status,Gross Sales,Cost of Goods,Pitch Fee,Power Fee,Travel,Camping,Equipment,Other,Staffing,Net Profit,Margin%\n';

    // Export all events for the year from companyPerformance + topEvents combined, de-duped
    const allReportEvents = data.topEvents;
    const rows = allReportEvents.map((e) => [
      `"${e.name.replace(/"/g, '""')}"`,
      e.date,
      e.end_date ?? '',
      `"${e.location.replace(/"/g, '""')}"`,
      `"${(e.concessions_companies?.name ?? '').replace(/"/g, '""')}"`,
      e.status,
      e.event_financials?.gross_sales ?? 0,
      e.event_financials?.cost_of_goods ?? 0,
      e.event_financials?.pitch_fee ?? 0,
      e.event_financials?.power_fee ?? 0,
      e.event_financials?.travel_costs ?? 0,
      e.event_financials?.camping_costs ?? 0,
      e.event_financials?.equipment_costs ?? 0,
      e.event_financials?.other_costs ?? 0,
      e.event_financials?.staffing_costs ?? 0,
      e.calculations.netProfit.toFixed(2),
      e.calculations.profitMargin.toFixed(1),
    ].join(',')).join('\n');

    const csv = header + rows;
    try {
      await Share.share({ message: csv, title: `Brewed by Boon - ${year} Report` });
    } catch {
      Alert.alert('Error', 'Could not export report');
    }
  }

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      <View className="bg-white px-4 pt-2 pb-3 border-b border-stone-100">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-bold text-stone-900">Reports</Text>
          <TouchableOpacity
            onPress={handleExport}
            accessibilityRole="button"
            accessibilityLabel="Export report as CSV"
            className="border border-amber-300 px-3 py-1.5 rounded-xl"
          >
            <Text className="text-amber-700 font-medium text-sm">Export CSV</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row gap-2" accessibilityRole="radiogroup">
          {YEARS.map((y) => (
            <TouchableOpacity
              key={y}
              onPress={() => setYear(y)}
              accessibilityRole="radio"
              accessibilityLabel={`Show reports for ${y}`}
              accessibilityState={{ selected: year === y }}
              className={`px-4 py-1.5 rounded-full ${year === y ? 'bg-amber-700' : 'bg-stone-100'}`}
            >
              <Text className={`text-sm font-medium ${year === y ? 'text-white' : 'text-stone-600'}`}>{y}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <LoadingSpinner message="Loading report..." />
      ) : !data || data.totalEvents === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-5xl mb-3">📊</Text>
          <Text className="text-stone-600 font-semibold">No data for {year}</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />}
        >
          {/* Annual summary */}
          <View className="flex-row flex-wrap gap-3 mb-4">
            {[
              { label: 'Total Revenue', value: formatCurrency(data.totalGross), color: 'text-amber-700' },
              { label: 'Total Net Profit', value: formatCurrency(data.totalNet), color: data.totalNet >= 0 ? 'text-green-700' : 'text-red-600' },
              { label: 'Events', value: String(data.totalEvents), color: 'text-stone-900' },
              { label: 'Avg Margin', value: formatPercent(data.avgMargin), color: data.avgMargin >= 0 ? 'text-green-700' : 'text-red-600' },
            ].map((s) => (
              <View key={s.label} className="bg-white rounded-xl p-3 border border-stone-100 min-w-[45%] flex-1">
                <Text className={`text-lg font-bold ${s.color}`}>{s.value}</Text>
                <Text className="text-stone-400 text-xs mt-0.5">{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Monthly breakdown */}
          <View className="bg-white rounded-2xl border border-stone-100 mb-4 overflow-hidden">
            <Text className="font-bold text-stone-900 px-4 pt-4 pb-2">Monthly Breakdown</Text>
            <View className="flex-row px-4 pb-2 border-b border-stone-100">
              {['Month', 'Events', 'Gross', 'Net', 'Margin'].map((h) => (
                <Text key={h} className="text-stone-400 text-xs font-medium flex-1 text-right first:text-left">{h}</Text>
              ))}
            </View>
            {data.monthly.filter((m) => m.eventCount > 0).map((m) => (
              <View key={m.month} className="flex-row px-4 py-2.5 border-b border-stone-50">
                <Text className="text-stone-700 text-xs font-medium flex-1">{m.monthLabel}</Text>
                <Text className="text-stone-600 text-xs flex-1 text-right">{m.eventCount}</Text>
                <Text className="text-stone-700 text-xs flex-1 text-right font-medium">£{m.grossSales.toFixed(0)}</Text>
                <Text className={`text-xs flex-1 text-right font-medium ${m.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  £{m.netProfit.toFixed(0)}
                </Text>
                <Text className={`text-xs flex-1 text-right ${m.profitMargin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {m.profitMargin.toFixed(0)}%
                </Text>
              </View>
            ))}
          </View>

          {/* Top events */}
          {data.topEvents.length > 0 && (
            <View className="mb-4">
              <Text className="font-bold text-stone-900 mb-3">Top Events by Net Profit</Text>
              {data.topEvents.slice(0, 5).map((event, i) => (
                <TouchableOpacity
                  key={event.id}
                  onPress={() => router.push(`/(tabs)/events/${event.id}`)}
                  className="bg-white rounded-xl p-3.5 mb-2 border border-stone-100 flex-row items-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-stone-400 text-sm font-bold w-6">{i + 1}</Text>
                  <View className="flex-1 mx-3">
                    <Text className="font-medium text-stone-900 text-sm" numberOfLines={1}>{event.name}</Text>
                    <Text className="text-stone-400 text-xs mt-0.5">{formatDate(event.date)}</Text>
                  </View>
                  <View className="items-end">
                    <Text className={`font-bold text-sm ${event.calculations.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {formatCurrency(event.calculations.netProfit)}
                    </Text>
                    <Text className="text-stone-400 text-xs">{formatCurrency(event.event_financials?.gross_sales ?? 0)} gross</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Company performance */}
          {data.companyPerformance.length > 0 && (
            <View className="mb-4">
              <Text className="font-bold text-stone-900 mb-3">Company Performance</Text>
              <View className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
                {data.companyPerformance.map((cp, i) => (
                  <TouchableOpacity
                    key={cp.company.id}
                    onPress={() => router.push(`/(tabs)/companies/${cp.company.id}`)}
                    className={`px-4 py-3.5 flex-row items-center ${i < data.companyPerformance.length - 1 ? 'border-b border-stone-50' : ''}`}
                  >
                    <View className="flex-1">
                      <Text className="font-medium text-stone-900 text-sm">{cp.company.name}</Text>
                      <Text className="text-stone-400 text-xs mt-0.5">
                        {cp.totalEvents} events · {cp.acceptedEvents} accepted
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-semibold text-stone-900 text-sm">{formatCurrency(cp.totalRevenue)}</Text>
                      <Text className="text-stone-400 text-xs">
                        {cp.acceptanceRate.toFixed(0)}% acceptance
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}
</file>

<file path="app/(tabs)/settings.tsx">
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/auth';
import { useProfile, useUpdateProfile } from '@/lib/queries/profile';
import type { Metric } from '@/lib/queries/profile';

const BUSINESS_TYPES = ['Coffee', 'Street Food', 'Pizza', 'Burgers', 'Desserts', 'Bakery', 'Other'];
const CURRENCIES = [
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
];
const DEFAULT_METRICS: Metric[] = [
  { id: 'revenue',  name: 'Revenue',      unit: '£',      enabled: true,  builtin: true },
  { id: 'profit',   name: 'Net Profit',   unit: '£',      enabled: true,  builtin: true },
  { id: 'covers',   name: 'Covers',       unit: 'covers', enabled: true,  builtin: true },
  { id: 'drinks',   name: 'Drinks Sold',  unit: 'drinks', enabled: false, builtin: true },
];

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { data: profile, refetch } = useProfile(user?.id);
  const updateProfile = useUpdateProfile();

  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Coffee');
  const [currency, setCurrency] = useState('GBP');
  const [metrics, setMetrics] = useState<Metric[]>(DEFAULT_METRICS);
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (profile) {
      setBusinessName(profile.business_name ?? '');
      setBusinessType(profile.business_type ?? 'Coffee');
      setCurrency(profile.currency ?? 'GBP');
      if (profile.custom_metrics?.length > 0) {
        setMetrics(profile.custom_metrics);
      } else {
        setMetrics(DEFAULT_METRICS);
      }
    }
  }, [profile]);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function toggleMetric(id: string, enabled: boolean) {
    setMetrics((prev) => prev.map((m) => m.id === id ? { ...m, enabled } : m));
  }

  function deleteMetric(id: string) {
    setMetrics((prev) => prev.filter((m) => m.id !== id));
  }

  function addMetric() {
    if (!newName.trim()) return;
    const metric: Metric = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      unit: newUnit.trim() || 'units',
      enabled: true,
    };
    setMetrics((prev) => [...prev, metric]);
    setNewName('');
    setNewUnit('');
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        updates: {
          business_name: businessName.trim() || null,
          business_type: businessType,
          currency,
          custom_metrics: metrics,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Saved', 'Your settings have been updated.');
    } catch {
      Alert.alert('Error', 'Could not save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      <View className="px-4 pt-2 pb-3 bg-white border-b border-stone-100">
        <Text className="text-2xl font-bold text-stone-900">Settings</Text>
        <Text className="text-stone-400 text-xs mt-0.5">{user?.email}</Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" colors={['#b45309']} />}
      >

        {/* ── Business Profile ── */}
        <Text className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Business Profile</Text>
        <View className="bg-white rounded-2xl p-4 border border-stone-100 gap-4 mb-4">
          <View>
            <Text className="text-sm font-medium text-stone-700 mb-1.5">Business Name</Text>
            <TextInput
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="e.g. Brewed by Boon"
              accessibilityLabel="Business name"
              className="border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-stone-700 mb-2">Business Type</Text>
            <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
              {BUSINESS_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setBusinessType(t)}
                  accessibilityRole="radio"
                  accessibilityLabel={t}
                  accessibilityState={{ selected: businessType === t }}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1,
                    backgroundColor: businessType === t ? '#78350f' : '#ffffff',
                    borderColor: businessType === t ? '#78350f' : '#e7e5e4',
                  }}
                >
                  <Text style={{ color: businessType === t ? '#ffffff' : '#57534e', fontWeight: '500', fontSize: 13 }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text className="text-sm font-medium text-stone-700 mb-2">Currency</Text>
            <View className="flex-row gap-2" accessibilityRole="radiogroup">
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  onPress={() => setCurrency(c.code)}
                  accessibilityRole="radio"
                  accessibilityLabel={c.label}
                  accessibilityState={{ selected: currency === c.code }}
                  style={{
                    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, borderWidth: 1,
                    backgroundColor: currency === c.code ? '#78350f' : '#ffffff',
                    borderColor: currency === c.code ? '#78350f' : '#e7e5e4',
                  }}
                >
                  <Text style={{ fontWeight: '700', fontSize: 16, color: currency === c.code ? '#ffffff' : '#57534e' }}>{c.symbol}</Text>
                  <Text style={{ fontSize: 11, color: currency === c.code ? '#ffffff' : '#9ca3af' }}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Metrics ── */}
        <Text className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Metrics</Text>
        <View className="bg-white rounded-2xl p-4 border border-stone-100 mb-4">
          <Text className="text-stone-500 text-xs mb-3">Choose which metrics to track across the app.</Text>

          {metrics.map((metric, idx) => (
            <View
              key={metric.id}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: idx < metrics.length - 1 ? 1 : 0,
                borderBottomColor: '#f5f5f4',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#1c1917' }}>{metric.name}</Text>
                <Text style={{ fontSize: 11, color: '#a8a29e', marginTop: 1 }}>{metric.unit}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {!metric.builtin && (
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert('Delete Metric', `Remove "${metric.name}"?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteMetric(metric.id) },
                      ])
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${metric.name} metric`}
                  >
                    <Text style={{ fontSize: 12, color: '#ef4444' }}>Delete</Text>
                  </TouchableOpacity>
                )}
                <Switch
                  value={metric.enabled}
                  onValueChange={(v) => toggleMetric(metric.id, v)}
                  accessibilityLabel={`${metric.enabled ? 'Disable' : 'Enable'} ${metric.name} metric`}
                  trackColor={{ false: '#e7e5e4', true: '#78350f' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          ))}

          {/* Add custom metric */}
          <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f5f5f4' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#57534e', marginBottom: 8 }}>Add Custom Metric</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Name (e.g. Coffees Sold)"
                placeholderTextColor="#a8a29e"
                accessibilityLabel="New metric name"
                style={{
                  flex: 1, borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 10,
                  paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#1c1917',
                }}
              />
              <TextInput
                value={newUnit}
                onChangeText={setNewUnit}
                placeholder="Unit"
                placeholderTextColor="#a8a29e"
                accessibilityLabel="New metric unit"
                style={{
                  width: 64, borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 10,
                  paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#1c1917',
                }}
              />
              <TouchableOpacity
                onPress={addMetric}
                accessibilityRole="button"
                accessibilityLabel="Add custom metric"
                style={{
                  backgroundColor: '#1c1917', borderRadius: 10,
                  paddingHorizontal: 14, justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Save settings"
          accessibilityState={{ disabled: saving }}
          className="bg-amber-700 py-3.5 rounded-2xl items-center mb-4"
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-base">Save Changes</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={signOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          className="bg-white border border-stone-200 py-3.5 rounded-2xl items-center mb-6"
        >
          <Text className="text-stone-600 font-medium">Sign Out</Text>
        </TouchableOpacity>

        {/* App version */}
        <Text className="text-stone-300 text-xs text-center mb-8">Version {APP_VERSION}</Text>
      </ScrollView>
    </View>
  );
}
</file>

<file path="components/events/WeatherCard.tsx">
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { differenceInDays, parseISO, eachDayOfInterval } from 'date-fns';

interface OMDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
  precipitation: number;
}

interface STDay {
  date: string;
  tempC: number;
  weather: string;
}

interface DualDay {
  date: string;
  om: OMDay | null;
  st: STDay | null;
}

function omEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code <= 49) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

function stEmoji(w: string): string {
  if (w.includes('clear')) return '☀️';
  if (w.includes('pcloudy')) return '⛅';
  if (w.includes('mcloudy') || w.includes('cloudy')) return '☁️';
  if (w.includes('humid')) return '🌫️';
  if (w.includes('lightrain') || w.includes('oshower') || w.includes('ishower')) return '🌦️';
  if (w.includes('rain')) return '🌧️';
  if (w.includes('snow')) return '❄️';
  if (w.includes('ts')) return '⛈️';
  return '🌤️';
}

function forecastsAgree(om: OMDay, st: STDay): boolean {
  const omWet = om.weatherCode >= 50;
  const stWet = st.weather.includes('rain') || st.weather.includes('snow') || st.weather.includes('ts');
  if (omWet !== stWet) return false;
  const omAvg = (om.maxTemp + om.minTemp) / 2;
  return Math.abs(omAvg - st.tempC) <= 5;
}

function hotIcedSplit(avgTemp: number): { hot: number; iced: number } {
  if (avgTemp < 12) return { hot: 80, iced: 20 };
  if (avgTemp < 18) return { hot: 60, iced: 40 };
  if (avgTemp < 23) return { hot: 40, iced: 60 };
  return { hot: 20, iced: 80 };
}

async function fetchSevenTimer(lat: number, lon: number): Promise<STDay[]> {
  const res = await global.fetch(
    `https://www.7timer.info/bin/api.pl?lon=${lon}&lat=${lat}&product=civil&output=json`,
  );
  const data = await res.json();
  const initStr: string = data.init; // "2025061606"
  const initDate = new Date(
    `${initStr.slice(0, 4)}-${initStr.slice(4, 6)}-${initStr.slice(6, 8)}T${initStr.slice(8, 10)}:00:00Z`,
  );
  const byDate = new Map<string, { temps: number[]; weathers: string[] }>();
  for (const ds of data.dataseries ?? []) {
    const d = new Date(initDate.getTime() + ds.timepoint * 3_600_000);
    const key = d.toISOString().split('T')[0];
    if (!byDate.has(key)) byDate.set(key, { temps: [], weathers: [] });
    const entry = byDate.get(key)!;
    entry.temps.push(ds.temp2m);
    entry.weathers.push(ds.weather);
  }
  const days: STDay[] = [];
  byDate.forEach((val, date) => {
    const avg = val.temps.reduce((a, b) => a + b, 0) / val.temps.length;
    const counts: Record<string, number> = {};
    val.weathers.forEach((w) => { counts[w] = (counts[w] ?? 0) + 1; });
    const weather = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'clear';
    days.push({ date, tempC: Math.round(avg), weather });
  });
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

export function WeatherCard({
  location,
  startDate,
  endDate,
}: {
  location: string;
  startDate: string;
  endDate?: string | null;
}) {
  const [days, setDays] = useState<DualDay[] | null>(null);
  const [avgTemp, setAvgTemp] = useState(15);
  const [loading, setLoading] = useState(true);
  const [outOfRange, setOutOfRange] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const daysUntil = differenceInDays(parseISO(startDate), new Date());
        if (daysUntil > 14) { setOutOfRange(true); setLoading(false); return; }
        if (daysUntil < -14) { setLoading(false); return; }

        // Geocode
        const geoRes = await global.fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`,
        );
        const geoData = await geoRes.json();
        if (!geoData.results?.length) { setLoading(false); return; }
        const { latitude, longitude } = geoData.results[0];

        const end = endDate ?? startDate;

        // Parallel fetch
        const [omRes, stDaysRaw] = await Promise.allSettled([
          global.fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&start_date=${startDate}&end_date=${end}&timezone=auto`,
          ).then((r) => r.json()),
          fetchSevenTimer(latitude, longitude),
        ]);

        const omDays: OMDay[] = omRes.status === 'fulfilled'
          ? (omRes.value.daily?.time ?? []).map((d: string, i: number) => ({
              date: d,
              maxTemp: omRes.value.daily.temperature_2m_max[i],
              minTemp: omRes.value.daily.temperature_2m_min[i],
              weatherCode: omRes.value.daily.weathercode[i],
              precipitation: omRes.value.daily.precipitation_sum?.[i] ?? 0,
            }))
          : [];

        const stDays: STDay[] = stDaysRaw.status === 'fulfilled' ? stDaysRaw.value : [];

        // Build event date range
        const eventDates = eachDayOfInterval({
          start: parseISO(startDate),
          end: parseISO(end),
        }).map((d) => d.toISOString().split('T')[0]);

        const omMap = new Map(omDays.map((d) => [d.date, d]));
        const stMap = new Map(stDays.map((d) => [d.date, d]));

        const dual: DualDay[] = eventDates.map((date) => ({
          date,
          om: omMap.get(date) ?? null,
          st: stMap.get(date) ?? null,
        }));

        const temps = omDays.map((d) => (d.maxTemp + d.minTemp) / 2);
        const avg = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 15;

        setDays(dual);
        setAvgTemp(avg);
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    }
    load();
  }, [location, startDate, endDate]);

  if (loading) return (
    <View className="bg-white rounded-2xl p-4 border border-stone-100 items-center">
      <ActivityIndicator size="small" color="#b45309" />
      <Text className="text-stone-400 text-xs mt-2">Fetching forecast…</Text>
    </View>
  );

  if (outOfRange) return (
    <View className="bg-white rounded-2xl p-4 border border-stone-100">
      <Text className="font-bold text-stone-900 text-sm mb-1">🌤️ Weather Forecast</Text>
      <Text className="text-stone-400 text-xs">Forecast available within 14 days of event.</Text>
    </View>
  );

  if (!days || days.length === 0) return null;

  const { hot, iced } = hotIcedSplit(avgTemp);
  const hasOM = days.some((d) => d.om !== null);
  const hasST = days.some((d) => d.st !== null);

  return (
    <View className="bg-white rounded-2xl p-4 border border-stone-100">
      <Text className="font-bold text-stone-900 text-base mb-1">🌤️ Weather Forecast</Text>
      {hasOM && hasST && (
        <Text className="text-stone-400 text-xs mb-3">Two independent sources — ✅ agree · ⚠️ differ</Text>
      )}

      {/* Per-day dual grid */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
        {days.map((d) => {
          const agree = d.om && d.st ? forecastsAgree(d.om, d.st) : null;
          const dayLabel = d.date.slice(5).replace('-', '/');
          return (
            <View
              key={d.date}
              style={{
                flex: 1, alignItems: 'center', borderRadius: 12, overflow: 'hidden',
                borderWidth: 1, borderColor: agree === false ? '#fde68a' : '#f5f5f4',
              }}
            >
              <Text style={{ fontSize: 10, color: '#78716c', paddingTop: 5, fontWeight: '500' }}>{dayLabel}</Text>

              {/* Open-Meteo row */}
              {d.om ? (
                <View style={{ alignItems: 'center', paddingVertical: 5, paddingHorizontal: 4, width: '100%', backgroundColor: '#fafaf9' }}>
                  <Text style={{ fontSize: 16 }}>{omEmoji(d.om.weatherCode)}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#1c1917' }}>{d.om.maxTemp.toFixed(0)}°</Text>
                  <Text style={{ fontSize: 10, color: '#a8a29e' }}>{d.om.minTemp.toFixed(0)}°</Text>
                  {d.om.precipitation > 0 && (
                    <Text style={{ fontSize: 9, color: '#3b82f6', marginTop: 1 }}>
                      💧{d.om.precipitation.toFixed(1)}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={{ paddingVertical: 5, alignItems: 'center', backgroundColor: '#fafaf9', width: '100%' }}>
                  <Text style={{ fontSize: 10, color: '#d6d3d1' }}>—</Text>
                </View>
              )}

              {/* 7Timer row */}
              {hasST && (
                d.st ? (
                  <View style={{ alignItems: 'center', paddingVertical: 5, paddingHorizontal: 4, width: '100%', backgroundColor: '#f0f9ff' }}>
                    <Text style={{ fontSize: 16 }}>{stEmoji(d.st.weather)}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#1c1917' }}>{d.st.tempC}°</Text>
                    <Text style={{ fontSize: 9, color: '#7dd3fc' }}>7T</Text>
                  </View>
                ) : (
                  <View style={{ paddingVertical: 5, alignItems: 'center', backgroundColor: '#f0f9ff', width: '100%' }}>
                    <Text style={{ fontSize: 10, color: '#bae6fd' }}>—</Text>
                  </View>
                )
              )}

              {/* Agree indicator */}
              {agree !== null && (
                <Text style={{ fontSize: 10, paddingBottom: 4 }}>{agree ? '✅' : '⚠️'}</Text>
              )}
            </View>
          );
        })}
      </View>

      {hasOM && hasST && (
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, backgroundColor: '#fafaf9', borderRadius: 2, borderWidth: 1, borderColor: '#e7e5e4' }} />
            <Text style={{ fontSize: 10, color: '#78716c' }}>Open-Meteo</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, backgroundColor: '#f0f9ff', borderRadius: 2, borderWidth: 1, borderColor: '#bae6fd' }} />
            <Text style={{ fontSize: 10, color: '#78716c' }}>7Timer</Text>
          </View>
        </View>
      )}

      {/* Hot vs Iced split */}
      <Text style={{ fontSize: 12, color: '#57534e', fontWeight: '600', marginBottom: 6 }}>
        Prepare: {hot}% Hot / {iced}% Iced
      </Text>
      <View style={{ flexDirection: 'row', borderRadius: 999, overflow: 'hidden', height: 14 }}>
        <View style={{ flex: hot, backgroundColor: '#78350f' }} />
        <View style={{ flex: iced, backgroundColor: '#bae6fd' }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 11, color: '#92400e' }}>☕ {hot}% Hot</Text>
        <Text style={{ fontSize: 11, color: '#0284c7' }}>🧊 {iced}% Iced</Text>
      </View>
    </View>
  );
}
</file>

<file path="lib/queries/companies.ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcEventFinancials } from '@/lib/calculations';
import type { CompanyWithStats, ConcessionsCompany } from '@/types';

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data: companies, error } = await supabase
        .from('concessions_companies')
        .select('*, events(id, status, date, end_date, company_id, event_financials(*))')
        .order('name');
      if (error) throw error;

      const mapped = (companies ?? []).map((company: any) => {
        const companyEvents = (company.events ?? []) as any[];
        const acceptedEvents = companyEvents.filter((e) => e.status === 'accepted');
        const totalRevenue = companyEvents.reduce(
          (sum, e) => sum + (e.event_financials?.gross_sales ?? 0),
          0
        );
        const totalNetProfit = companyEvents.reduce((sum, e) => {
          if (!e.event_financials) return sum;
          return sum + calcEventFinancials(e.event_financials).netProfit;
        }, 0);
        const sortedDates = companyEvents.map((e) => e.date).sort().reverse();

        const today = new Date().toISOString().split('T')[0];
        const completedAccepted = companyEvents.filter((e) => {
          const eventEnd = e.end_date ?? e.date;
          return e.status === 'accepted' && eventEnd <= today && e.event_financials;
        });
        const margins = completedAccepted.map((e) => {
          const calc = calcEventFinancials(e.event_financials!);
          return calc.totalNetSales > 0 ? (calc.netProfit / calc.totalNetSales) * 100 : 0;
        });
        const avgProfitMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : null;
        const completedEventCount = completedAccepted.length;

        // Strip embedded events from the returned object to keep CompanyWithStats clean
        const { events: _embedded, ...companyBase } = company;
        return {
          ...companyBase,
          totalEvents: companyEvents.length,
          acceptedEvents: acceptedEvents.length,
          totalRevenue,
          totalNetProfit,
          lastEventDate: sortedDates[0] ?? null,
          avgProfitMargin,
          completedEventCount,
        } as CompanyWithStats;
      });

      return mapped.sort((a, b) => {
        if (a.avgProfitMargin !== null && b.avgProfitMargin !== null) {
          return b.avgProfitMargin - a.avgProfitMargin;
        }
        if (a.avgProfitMargin !== null) return -1;
        if (b.avgProfitMargin !== null) return 1;
        return 0;
      });
    },
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: ['companies', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('concessions_companies')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as ConcessionsCompany;
    },
    enabled: !!id,
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('concessions_companies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
</file>

<file path="lib/notifications.ts">
// expo-notifications is NOT supported in Expo Go SDK 53+.
// All functions are no-ops here. Push notifications will be re-enabled
// when building with EAS (development build or production).

export async function registerForPushNotifications(_userId: string): Promise<string | null> {
  return null;
}

export function addNotificationResponseListener(
  _handler: (response: any) => void,
): { remove: () => void } | null {
  return null;
}

export async function clearBadge(): Promise<void> {
  // no-op
}
</file>

<file path="metro.config.js">
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
</file>

<file path="tailwind.config.js">
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        coffee: {
          50:  '#fdf8f0',
          100: '#faefd9',
          200: '#f4dcb0',
          300: '#ecc47f',
          400: '#e3a54d',
          500: '#db8c2a',
          600: '#cc7520',
          700: '#aa5d1c',
          800: '#884a1e',
          900: '#6e3d1c',
          950: '#3b1e0d',
        },
        brand: {
          primary: '#6b3a2a',
          secondary: '#c9813a',
          dark: '#1c1917',
        },
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
</file>

<file path="app/(tabs)/events/[id]/edit.tsx">
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EventForm } from '@/components/events/EventForm';
import { useEvent } from '@/lib/queries/events';
import { useUpdateEvent } from '@/lib/mutations/events';
import { useCompanies } from '@/lib/queries/companies';
import { useUnits } from '@/lib/queries/units';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import type { EventFormValues } from '@/lib/validations/event.schema';

export default function EditEventScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: event, isLoading } = useEvent(id);
  const updateEvent = useUpdateEvent();
  const { data: companies = [] } = useCompanies();
  const { data: units = [] } = useUnits();

  if (isLoading) return <LoadingSpinner message="Loading event..." />;
  if (!event) return null;

  const fin = event.event_financials;
  const defaultValues: Partial<EventFormValues> = {
    name: event.name,
    date: event.date,
    end_date: event.end_date ?? '',
    location: event.location,
    description: event.description ?? '',
    application_date: event.application_date ?? '',
    status: event.status,
    notes: event.notes ?? '',
    company_id: event.company_id ?? '',
    unit_ids: (event.units ?? []).map((u) => u.id),
    overnight_stay: event.overnight_stay ?? false,
    documents_uploaded: event.documents_uploaded ?? false,
    application_url: event.application_url ?? '',
    gross_sales: fin?.gross_sales ?? 0,
    zero_rated_sales: fin?.zero_rated_sales ?? 0,
    standard_rated_sales: fin?.standard_rated_sales ?? 0,
    concessions_commission_pct: fin?.concessions_commission_pct ?? 0,
    pitch_fee_refund_pct: fin?.pitch_fee_refund_pct ?? 0,
    cost_of_goods: fin?.cost_of_goods ?? 0,
    pitch_fee: fin?.pitch_fee ?? 0,
    power_fee: fin?.power_fee ?? 0,
    travel_costs: fin?.travel_costs ?? 0,
    camping_costs: fin?.camping_costs ?? 0,
    equipment_costs: fin?.equipment_costs ?? 0,
    other_costs: fin?.other_costs ?? 0,
    staffing_costs: fin?.staffing_costs ?? 0,
    fresh_milk_litres: fin?.fresh_milk_litres ?? 0,
    alt_milk_litres: fin?.alt_milk_litres ?? 0,
    staffing_entries: (event.staffing_entries ?? []).map((e) => ({
      id: e.id, staff_name: e.staff_name, hours_worked: e.hours_worked, hourly_rate: e.hourly_rate,
    })),
    infrastructure_items: (event.infrastructure_items ?? []).map((i) => ({
      id: i.id, description: i.description, category: i.category, cost: i.cost,
    })),
  };

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-stone-100">
        <Text className="text-lg font-bold text-stone-900" numberOfLines={1}>Edit: {event.name}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-stone-500">Cancel</Text>
        </TouchableOpacity>
      </View>
      <EventForm
        defaultValues={defaultValues}
        companies={companies}
        units={units}
        onSubmit={(data) => updateEvent.mutateAsync({ id, data })}
        submitLabel="Save Changes"
      />
    </View>
  );
}
</file>

<file path="app/(tabs)/fleet/[id]/edit.tsx">
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
</file>

<file path="components/units/UnitCard.tsx">
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { UNIT_STATUS_LABELS, UNIT_STATUS_COLORS } from '@/constants';
import type { Unit, EventWithFinancials } from '@/types';
import type { UnitStatus } from '@/types';

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function ExpiryPill({ label, dateStr }: { label: string; dateStr: string | null }) {
  if (!dateStr) return null;
  const days = daysUntil(dateStr);
  if (days === null) return null;
  const expired = days < 0;
  const soon = days >= 0 && days <= 30;
  if (!expired && !soon) return null;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999,
      backgroundColor: expired ? '#fee2e2' : '#fef3c7',
    }}>
      <Text style={{ fontSize: 10 }}>{expired ? '🔴' : '🟡'}</Text>
      <Text style={{ fontSize: 10, fontWeight: '600', color: expired ? '#991b1b' : '#92400e' }}>
        {label}{expired ? ' expired' : ` due ${days === 0 ? 'today' : `in ${days}d`}`}
      </Text>
    </View>
  );
}

interface Props {
  unit: Unit;
  currentEvent?: EventWithFinancials | null;
  onPress: () => void;
}

export function UnitCard({ unit, currentEvent, onPress }: Props) {
  const status = unit.status as UnitStatus;
  const colors = UNIT_STATUS_COLORS[status];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-white rounded-2xl mb-3 border border-stone-100 overflow-hidden"
      style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}
    >
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 4, backgroundColor: colors.dot, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }} />
        <View style={{ flex: 1, padding: 14 }}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1 mr-3">
              <Text className="font-bold text-stone-900 text-base">{unit.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                {unit.registration ? (
                  <Text className="text-slate-500 text-xs font-medium tracking-wide">{unit.registration}</Text>
                ) : null}
                {unit.vehicle_type ? (
                  <View style={{ backgroundColor: '#f5f5f4', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#57534e' }}>{unit.vehicle_type}</Text>
                  </View>
                ) : null}
              </View>
              {(unit.height_m != null || unit.length_m != null || unit.width_m != null) ? (
                <Text style={{ fontSize: 10, color: '#a8a29e', marginTop: 2 }}>
                  {[
                    unit.height_m != null && `H ${unit.height_m.toFixed(1)}m`,
                    unit.length_m != null && `L ${unit.length_m.toFixed(1)}m`,
                    unit.width_m  != null && `W ${unit.width_m.toFixed(1)}m`,
                  ].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </View>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.bgHex, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dot }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textHex }}>
                {UNIT_STATUS_LABELS[status]}
              </Text>
            </View>
          </View>

          {/* Expiry warnings */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
            <ExpiryPill label="MOT" dateStr={unit.mot_date} />
            <ExpiryPill label="Tax" dateStr={unit.tax_date} />
            <ExpiryPill label="Service" dateStr={unit.service_date} />
          </View>

          <View className="mt-2">
            {currentEvent ? (
              <Text className="text-amber-600 text-xs font-medium" numberOfLines={1}>
                📍 Currently at: {currentEvent.name}
              </Text>
            ) : status === 'active' ? (
              <Text className="text-green-600 text-xs font-medium">✅ Available</Text>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
</file>

<file path="constants/index.ts">
import type { ApplicationStatus, InfrastructureCategory, UnitStatus } from '@/types';

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
  withdrawn: 'Withdrawn',
};

export const STATUS_COLORS: Record<ApplicationStatus, { bg: string; text: string; dot: string; bgHex: string; textHex: string }> = {
  pending:    { bg: 'bg-amber-100',  text: 'text-amber-800',  dot: '#f59e0b', bgHex: '#fef3c7', textHex: '#92400e' },
  accepted:   { bg: 'bg-green-100',  text: 'text-green-800',  dot: '#22c55e', bgHex: '#dcfce7', textHex: '#166534' },
  rejected:   { bg: 'bg-red-100',    text: 'text-red-800',    dot: '#ef4444', bgHex: '#fee2e2', textHex: '#991b1b' },
  waitlisted: { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: '#3b82f6', bgHex: '#dbeafe', textHex: '#1e40af' },
  withdrawn:  { bg: 'bg-stone-100',  text: 'text-stone-700',  dot: '#a8a29e', bgHex: '#f5f5f4', textHex: '#1c1917' },
};

export const STATUS_PIE_COLORS: Record<ApplicationStatus, string> = {
  accepted:   '#22c55e',
  pending:    '#f59e0b',
  rejected:   '#ef4444',
  waitlisted: '#3b82f6',
  withdrawn:  '#a8a29e',
};

export const INFRASTRUCTURE_CATEGORY_LABELS: Record<InfrastructureCategory, string> = {
  pitch_fee: 'Pitch Fee',
  travel:    'Travel',
  equipment: 'Equipment',
  supplies:  'Supplies',
  other:     'Other',
};

export const STATUSES: ApplicationStatus[] = [
  'pending', 'accepted', 'rejected', 'waitlisted', 'withdrawn',
];

export const INFRASTRUCTURE_CATEGORIES: InfrastructureCategory[] = [
  'pitch_fee', 'travel', 'equipment', 'supplies', 'other',
];

export const UNIT_STATUSES: UnitStatus[] = ['active', 'maintenance', 'retired'];

export const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  active:      'Active',
  maintenance: 'In Maintenance',
  retired:     'Retired',
};

export const UNIT_STATUS_COLORS: Record<UnitStatus, { bg: string; text: string; dot: string; bgHex: string; textHex: string }> = {
  active:      { bg: 'bg-green-100',  text: 'text-green-800',  dot: '#22c55e', bgHex: '#dcfce7', textHex: '#166534' },
  maintenance: { bg: 'bg-amber-100',  text: 'text-amber-800',  dot: '#f59e0b', bgHex: '#fef3c7', textHex: '#92400e' },
  retired:     { bg: 'bg-stone-100',  text: 'text-stone-600',  dot: '#a8a29e', bgHex: '#f5f5f4', textHex: '#57534e' },
};

export const BRAND = {
  primary:   '#6b3a2a',
  secondary: '#c9813a',
  dark:      '#1c1917',
  light:     '#fdf8f0',
};
</file>

<file path="lib/mutations/units.ts">
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { UnitFormValues } from '@/lib/validations/unit.schema';

export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, userId }: { data: UnitFormValues; userId: string }) => {
      const { data: unit, error } = await supabase
        .from('units')
        .insert({
          user_id: userId,
          name: data.name,
          registration: data.registration || null,
          notes: data.notes || null,
          status: data.status ?? 'active',
          vehicle_type: data.vehicle_type || null,
          height_m: data.height_m ?? null,
          length_m: data.length_m ?? null,
          width_m: data.width_m ?? null,
          mot_date: data.mot_date || null,
          tax_date: data.tax_date || null,
          service_date: data.service_date || null,
          service_interval: data.service_interval || '1year',
        })
        .select()
        .single();
      if (error) throw error;
      return unit;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UnitFormValues }) => {
      const { error } = await supabase
        .from('units')
        .update({
          name: data.name,
          registration: data.registration || null,
          notes: data.notes || null,
          status: data.status,
          vehicle_type: data.vehicle_type || null,
          height_m: data.height_m ?? null,
          length_m: data.length_m ?? null,
          width_m: data.width_m ?? null,
          mot_date: data.mot_date || null,
          tax_date: data.tax_date || null,
          service_date: data.service_date || null,
          service_interval: data.service_interval || '1year',
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['units'] });
      qc.invalidateQueries({ queryKey: ['units', id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
</file>

<file path="lib/queries/events.ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcEventFinancials } from '@/lib/calculations';
import { EMPTY_CALCULATIONS } from '@/types';
import type { EventWithFinancials, EventDetail, ApplicationStatus } from '@/types';

export interface EventFilters {
  status?: ApplicationStatus | 'all';
  year?: number;
  companyId?: string;
  unitId?: string;
}

export function useEvents(filters?: EventFilters) {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('*, event_financials(*), concessions_companies(*), event_units(units(*))')
        .order('date', { ascending: false });

      if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
      if (filters?.year) query = query.gte('date', `${filters.year}-01-01`).lte('date', `${filters.year}-12-31`);
      if (filters?.companyId) query = query.eq('company_id', filters.companyId);

      const { data, error } = await query;
      if (error) throw error;

      let mapped = (data ?? []).map((event) => ({
        ...event,
        units: (event.event_units ?? []).map((eu: any) => eu.units).filter(Boolean),
        calculations: event.event_financials
          ? calcEventFinancials(event.event_financials)
          : EMPTY_CALCULATIONS,
      })) as EventWithFinancials[];

      // events↔units is many-to-many via event_units; filter client-side after mapping
      if (filters?.unitId) {
        mapped = mapped.filter((e) => e.units.some((u: any) => u.id === filters.unitId));
      }

      return mapped;
    },
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, event_financials(*), concessions_companies(*), event_units(units(*)), staffing_entries(*), infrastructure_items(*)')
        .eq('id', id)
        .single();

      if (error) throw error;

      const staffing = data.staffing_entries ?? [];
      return {
        ...data,
        units: (data.event_units ?? []).map((eu: any) => eu.units).filter(Boolean),
        calculations: data.event_financials
          ? calcEventFinancials(data.event_financials, staffing)
          : EMPTY_CALCULATIONS,
      } as EventDetail;
    },
    enabled: !!id,
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['units'] });
    },
  });
}
</file>

<file path="lib/validations/unit.schema.ts">
import { z } from 'zod';

export const unitSchema = z.object({
  name: z.string().min(1, 'Unit name is required'),
  registration: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'maintenance', 'retired'] as const).default('active'),
  vehicle_type: z.string().optional(),
  height_m: z.number().nullable().optional(),
  length_m: z.number().nullable().optional(),
  width_m: z.number().nullable().optional(),
  mot_date: z.string().optional(),
  tax_date: z.string().optional(),
  service_date: z.string().optional(),
  service_interval: z.enum(['6months', '1year']).default('1year'),
});

export type UnitFormValues = z.infer<typeof unitSchema>;
</file>

<file path="lib/calculations.ts">
import type { EventFinancials, StaffingEntry, EventCalculations, EMPTY_CALCULATIONS } from '@/types';

export function calcStaffingTotal(entries: StaffingEntry[]): number {
  return entries.reduce((sum, e) => sum + e.hours_worked * e.hourly_rate, 0);
}

/**
 * Full P&L calculation supporting:
 *  - VAT breakdown (hot drinks/food at 20%, cold drinks at 0%)
 *  - Concessions company commission on net (ex-VAT) sales
 *  - Pitch fee with % refund; commission deducted from refund before payout
 *  - Power fee, camping costs as additional event costs
 *
 * effectivePitchFee = pitch_fee - refundGross + commissionAmount
 */
export function calcEventFinancials(
  f: EventFinancials,
  staffing?: StaffingEntry[],
): EventCalculations {
  const totalStaffingCost =
    staffing && staffing.length > 0
      ? calcStaffingTotal(staffing)
      : (f.staffing_costs ?? 0);

  // --- VAT breakdown ---
  const zeroRated = f.zero_rated_sales ?? 0;
  const standardRated = f.standard_rated_sales ?? 0;
  const hasVatBreakdown = zeroRated > 0 || standardRated > 0;

  const standardRatedNet = standardRated / 1.2;
  const vatCollected = standardRated - standardRatedNet;
  const totalNetSales = hasVatBreakdown ? zeroRated + standardRatedNet : (f.gross_sales ?? 0);

  // --- Commission & pitch fee settlement ---
  const commissionPct = f.concessions_commission_pct ?? 0;
  const refundPct = f.pitch_fee_refund_pct ?? 0;
  const pitchFee = f.pitch_fee ?? 0;

  const commissionAmount = totalNetSales * (commissionPct / 100);
  const pitchFeeRefundGross = pitchFee * (refundPct / 100);
  const netRefund = pitchFeeRefundGross - commissionAmount;
  const effectivePitchFee = pitchFee - pitchFeeRefundGross + commissionAmount;

  // --- P&L ---
  const grossProfit = totalNetSales - (f.cost_of_goods ?? 0);

  const totalCosts =
    (f.cost_of_goods ?? 0) +
    totalStaffingCost +
    effectivePitchFee +
    (f.power_fee ?? 0) +
    (f.travel_costs ?? 0) +
    (f.camping_costs ?? 0) +
    (f.equipment_costs ?? 0) +
    (f.other_costs ?? 0);

  const netProfit = totalNetSales - totalCosts;
  const profitMargin = totalNetSales === 0 ? 0 : (netProfit / totalNetSales) * 100;

  return {
    standardRatedNet,
    vatCollected,
    totalNetSales,
    commissionAmount,
    pitchFeeRefundGross,
    netRefund,
    effectivePitchFee,
    grossProfit,
    totalCosts,
    netProfit,
    profitMargin,
    totalStaffingCost,
  };
}

export function calcGrossProfit(f: EventFinancials): number {
  return calcEventFinancials(f).grossProfit;
}
export function calcTotalCosts(f: EventFinancials): number {
  return calcEventFinancials(f).totalCosts;
}
export function calcNetProfit(f: EventFinancials): number {
  return calcEventFinancials(f).netProfit;
}
export function calcProfitMargin(f: EventFinancials): number {
  return calcEventFinancials(f).profitMargin;
}

export function calcAvgRevenuePerEvent(financials: EventFinancials[]): number {
  if (financials.length === 0) return 0;
  return financials.reduce((sum, f) => sum + calcEventFinancials(f).totalNetSales, 0) / financials.length;
}

export const emptyFinancials: Omit<EventFinancials, 'id' | 'event_id' | 'created_at' | 'updated_at'> = {
  gross_sales: 0, zero_rated_sales: 0, standard_rated_sales: 0,
  concessions_commission_pct: 0, pitch_fee_refund_pct: 0,
  cost_of_goods: 0, pitch_fee: 0, power_fee: 0,
  travel_costs: 0, camping_costs: 0, equipment_costs: 0, other_costs: 0,
  staffing_costs: 0, fresh_milk_litres: 0, alt_milk_litres: 0,
};
</file>

<file path="components/events/FinancialsCard.tsx">
import React from 'react';
import { View, Text } from 'react-native';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { EventFinancials, EventCalculations } from '@/types';

interface Props {
  financials: EventFinancials;
  calculations: EventCalculations;
}

function Row({
  label,
  value,
  bold,
  color,
  indent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
  indent?: boolean;
}) {
  return (
    <View className="flex-row justify-between items-center py-1.5">
      <Text
        className={`text-sm ${
          indent
            ? 'pl-3 text-stone-500'
            : bold
            ? 'font-semibold text-stone-900'
            : 'text-stone-600'
        }`}
      >
        {label}
      </Text>
      <Text
        className={`text-sm ${bold ? 'font-bold' : 'font-medium'} ${
          color ?? (bold ? 'text-stone-900' : 'text-stone-600')
        }`}
      >
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View className="border-t border-stone-100 my-1.5" />;
}

function SectionLabel({ title }: { title: string }) {
  return (
    <Text className="text-xs font-bold text-stone-400 uppercase tracking-wide mt-3 mb-0.5">
      {title}
    </Text>
  );
}

export function FinancialsCard({ financials: f, calculations: c }: Props) {
  const hasVatBreakdown =
    (f.zero_rated_sales ?? 0) > 0 || (f.standard_rated_sales ?? 0) > 0;
  const hasCommission =
    (f.concessions_commission_pct ?? 0) > 0 || (f.pitch_fee_refund_pct ?? 0) > 0;
  const hasPowerFee = (f.power_fee ?? 0) > 0;
  const hasSiteCostSection = hasCommission || hasPowerFee;
  const hasMilk =
    (f.fresh_milk_litres ?? 0) > 0 || (f.alt_milk_litres ?? 0) > 0;

  return (
    <View className="bg-white rounded-2xl p-4 border border-stone-100">
      <Text className="font-bold text-stone-900 mb-2 text-base">Financials</Text>

      {/* ── SALES ── */}
      <SectionLabel title="Sales" />
      {hasVatBreakdown ? (
        <>
          <Row
            label="Hot drinks & food (20% VAT, incl. VAT)"
            value={formatCurrency(f.standard_rated_sales ?? 0)}
          />
          <Row label="  Ex-VAT net" value={formatCurrency(c.standardRatedNet)} indent />
          <Row label="  VAT collected" value={formatCurrency(c.vatCollected)} indent />
          <Row
            label="Cold drinks (0% VAT)"
            value={formatCurrency(f.zero_rated_sales ?? 0)}
          />
          <Divider />
          <Row label="Total Net Sales (ex-VAT)" value={formatCurrency(c.totalNetSales)} bold />
        </>
      ) : (
        <Row label="Gross Sales" value={formatCurrency(f.gross_sales)} bold />
      )}

      {/* ── PITCH FEE & COMMISSION ── */}
      {hasSiteCostSection && (
        <>
          <SectionLabel title="Pitch Fee & Commission" />
          {(f.pitch_fee ?? 0) > 0 && (
            <Row label="Pitch fee paid" value={formatCurrency(f.pitch_fee)} />
          )}
          {hasCommission && (
            <>
              <Row
                label={`Pitch fee refund (${f.pitch_fee_refund_pct ?? 0}%)`}
                value={formatCurrency(c.pitchFeeRefundGross)}
                indent
              />
              <Row
                label={`Commission (${f.concessions_commission_pct ?? 0}% of net sales)`}
                value={`-${formatCurrency(c.commissionAmount)}`}
                indent
              />
              <Row
                label="Net refund received"
                value={formatCurrency(Math.max(0, c.netRefund))}
                indent
                color={c.netRefund >= 0 ? 'text-green-600' : 'text-red-500'}
              />
            </>
          )}
          {hasPowerFee && (
            <Row label="Power / site fee" value={formatCurrency(f.power_fee ?? 0)} />
          )}
          <Row
            label="Total site cost"
            value={formatCurrency(c.effectivePitchFee + (f.power_fee ?? 0))}
            bold
          />
        </>
      )}

      {/* ── YOUR COSTS ── */}
      <SectionLabel title="Your Costs" />
      <Row label="Cost of Goods" value={formatCurrency(f.cost_of_goods)} />
      {!hasSiteCostSection && (f.pitch_fee ?? 0) > 0 && (
        <Row label="Pitch Fee" value={formatCurrency(f.pitch_fee)} />
      )}
      <Row label="Staffing" value={formatCurrency(f.staffing_costs)} />
      <Row label="Travel" value={formatCurrency(f.travel_costs)} />
      {(f.camping_costs ?? 0) > 0 && (
        <Row label="Camping" value={formatCurrency(f.camping_costs ?? 0)} />
      )}
      <Row label="Equipment" value={formatCurrency(f.equipment_costs)} />
      {(f.other_costs ?? 0) > 0 && (
        <Row label="Other" value={formatCurrency(f.other_costs ?? 0)} />
      )}

      {/* ── MILK USED ── */}
      {hasMilk && (
        <>
          <SectionLabel title="Milk Used" />
          {(f.fresh_milk_litres ?? 0) > 0 && (
            <Row
              label="Fresh Milk"
              value={`${(f.fresh_milk_litres ?? 0).toFixed(1)} L`}
            />
          )}
          {(f.alt_milk_litres ?? 0) > 0 && (
            <Row
              label="Alt Milk"
              value={`${(f.alt_milk_litres ?? 0).toFixed(1)} L`}
            />
          )}
        </>
      )}

      <Divider />
      <Row label="Total Costs" value={formatCurrency(c.totalCosts)} bold />
      <Divider />

      <Row
        label="Net Profit"
        value={formatCurrency(c.netProfit)}
        bold
        color={c.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}
      />
      <Row
        label="Profit Margin"
        value={formatPercent(c.profitMargin)}
        bold
        color={c.profitMargin >= 0 ? 'text-green-600' : 'text-red-500'}
      />
    </View>
  );
}
</file>

<file path="lib/queries/discover.ts">
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DiscoveredEvent } from '@/types';

export interface DiscoverFilters {
  query?: string;
  region?: string;
  category?: string;
}

const COMPANY_CATEGORIES = ['Concessions Company', 'Industry Body'];

export function useDiscoverEvents(filters: DiscoverFilters) {
  return useQuery({
    queryKey: ['discover', filters],
    queryFn: async (): Promise<DiscoveredEvent[]> => {
      let query = supabase
        .from('uk_events_directory')
        .select('*')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: true });

      if (filters.region && filters.region !== 'All UK') {
        query = query.eq('region', filters.region);
      }
      if (filters.category && filters.category !== 'All') {
        query = query.eq('category', filters.category);
      }
      if (filters.query) {
        query = query.or(
          `name.ilike.%${filters.query}%,description.ilike.%${filters.query}%,organiser.ilike.%${filters.query}%,location.ilike.%${filters.query}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((row) => ({
        id: row.id,
        title: row.name,
        description: row.description ?? '',
        url: row.application_url ?? row.website ?? '',
        source: row.organiser ?? row.source ?? 'UK Events Directory',
        location: row.location,
        dateHint: row.typical_dates ?? (row.next_date ?? null),
        category: row.category ?? 'Event',
        region: row.region,
        organiser: row.organiser,
        estimatedFootfall: row.estimated_footfall,
        pitchFeeRange: row.pitch_fee_range,
        featured: row.featured ?? false,
        eventsManaged: row.events_managed ?? null,
        contactPhone: row.contact_phone ?? null,
        contactEmail: row.contact_email ?? null,
        lastVerifiedAt: row.last_verified_at ?? null,
        applicationChanged: row.application_changed ?? false,
        isCompany: COMPANY_CATEGORIES.includes(row.category ?? ''),
      }));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
</file>

<file path="app/(tabs)/_layout.tsx">
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  name,
  focused,
  color,
}: {
  name: { filled: IoniconName; outline: IoniconName };
  focused: boolean;
  color: string;
}) {
  return <Ionicons name={focused ? name.filled : name.outline} size={22} color={color} />;
}

const ICONS: Record<string, { filled: IoniconName; outline: IoniconName }> = {
  dashboard: { filled: 'bar-chart', outline: 'bar-chart-outline' },
  events: { filled: 'calendar-number', outline: 'calendar-number-outline' },
  calendar: { filled: 'calendar', outline: 'calendar-outline' },
  fleet: { filled: 'car', outline: 'car-outline' },
  companies: { filled: 'business', outline: 'business-outline' },
  discover: { filled: 'compass', outline: 'compass-outline' },
  settings: { filled: 'settings', outline: 'settings-outline' },
};

const TAB_LISTENERS = {
  tabPress: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1c1917', borderTopColor: '#292524', paddingBottom: 4 },
        tabBarActiveTintColor: '#f59e0b',
        tabBarInactiveTintColor: '#78716c',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="dashboard" listeners={TAB_LISTENERS} options={{ title: 'Dashboard', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.dashboard} focused={focused} color={color} /> }} />
      <Tabs.Screen name="events" listeners={TAB_LISTENERS} options={{ title: 'Events', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.events} focused={focused} color={color} /> }} />
      <Tabs.Screen name="calendar" listeners={TAB_LISTENERS} options={{ title: 'Calendar', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.calendar} focused={focused} color={color} /> }} />
      <Tabs.Screen name="fleet" listeners={TAB_LISTENERS} options={{ title: 'Fleet', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.fleet} focused={focused} color={color} /> }} />
      <Tabs.Screen name="companies" listeners={TAB_LISTENERS} options={{ title: 'Companies', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.companies} focused={focused} color={color} /> }} />
      <Tabs.Screen name="discover" listeners={TAB_LISTENERS} options={{ title: 'Discover', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.discover} focused={focused} color={color} /> }} />
      <Tabs.Screen name="settings" listeners={TAB_LISTENERS} options={{ title: 'Settings', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.settings} focused={focused} color={color} /> }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
    </Tabs>
  );
}
</file>

<file path="app/(tabs)/dashboard.tsx">
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDashboard } from '@/lib/queries/dashboard';
import { formatCurrencyCompact, formatCurrency, formatPercent, formatDateRange } from '@/lib/formatters';
import { StatCard } from '@/components/dashboard/StatCard';
import { RevenueBarChart } from '@/components/dashboard/RevenueBarChart';
import { StatusPieChart } from '@/components/dashboard/StatusPieChart';
import { EventCard } from '@/components/events/EventCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { QueryError } from '@/components/shared/QueryError';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/queries/profile';
import { UNIT_STATUS_COLORS } from '@/constants';
import type { UnitWithStatus } from '@/types';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [refreshing, setRefreshing] = useState(false);
  const [showFees, setShowFees] = useState(false);
  const { data: stats, isLoading, isError, error, refetch } = useDashboard(year);

  const insights = useMemo<{ icon: string; text: string; color: string }[]>(() => {
    if (!stats) return [];
    const result: { icon: string; text: string; color: string }[] = [];

    const pendingCount = stats.statusBreakdown.find((s) => s.status === 'pending')?.count ?? 0;
    if (pendingCount > 0) {
      result.push({ icon: '📋', text: `${pendingCount} application${pendingCount > 1 ? 's' : ''} awaiting a decision`, color: '#b45309' });
    }

    const bestMonth = [...stats.monthlyRevenue].sort((a, b) => b.netProfit - a.netProfit)[0];
    if (bestMonth && bestMonth.netProfit > 0) {
      result.push({ icon: '🏆', text: `Best month: ${bestMonth.month} (£${bestMonth.netProfit.toFixed(0)} net)`, color: '#15803d' });
    }

    const today = new Date();
    stats.unitStatuses.forEach((u) => {
      const dates = [
        { label: 'MOT', d: u.mot_date },
        { label: 'Tax', d: u.tax_date },
      ];
      dates.forEach(({ label, d }) => {
        if (!d) return;
        const days = Math.ceil((new Date(d).getTime() - today.getTime()) / 86400000);
        if (days < 0) result.push({ icon: '🔴', text: `${u.name} ${label} has expired`, color: '#dc2626' });
        else if (days <= 30) result.push({ icon: '🟡', text: `${u.name} ${label} expires in ${days} day${days !== 1 ? 's' : ''}`, color: '#d97706' });
      });
    });

    if (stats.upcomingEvents.length === 0 && stats.totalEventsYtd > 0) {
      result.push({ icon: '📅', text: 'No upcoming accepted events', color: '#64748b' });
    }
    return result;
  }, [stats]);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-4 pt-2 pb-3 border-b border-stone-100">
        <View className="flex-row items-center gap-2 mb-2">
          <View className="w-8 h-8 bg-amber-700 rounded-lg items-center justify-center">
            <Text className="text-base">☕</Text>
          </View>
          <View>
            <Text className="font-bold text-stone-900 text-base">{profile?.business_name ?? 'My Business'}</Text>
            <Text className="text-stone-400 text-xs">{user?.email}</Text>
          </View>
        </View>

        {/* Year selector */}
        <View className="flex-row gap-2">
          {YEARS.map((y) => (
            <TouchableOpacity
              key={y}
              onPress={() => setYear(y)}
              className={`px-4 py-1.5 rounded-full ${year === y ? 'bg-amber-700' : 'bg-stone-100'}`}
            >
              <Text className={`text-sm font-medium ${year === y ? 'text-white' : 'text-stone-600'}`}>{y}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <LoadingSpinner message="Loading dashboard..." />
      ) : isError ? (
        <QueryError error={error} onRetry={refetch} message="Couldn't load dashboard" />
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />}
        >
          <View className="px-4 pt-4 gap-4">
            {/* Stats grid */}
            <View className="flex-row gap-3">
              <StatCard
                title="Gross Sales"
                value={formatCurrencyCompact(stats?.grossSalesYtd ?? 0)}
                icon="💰"
                colorScheme="amber"
              />
              <StatCard
                title="Net Profit"
                value={formatCurrencyCompact(stats?.netProfitYtd ?? 0)}
                icon="📈"
                colorScheme={(stats?.netProfitYtd ?? 0) >= 0 ? 'green' : 'red'}
                subtitle={(stats?.committedFees ?? 0) > 0 ? `Excl. £${(stats!.committedFees).toFixed(0)} committed` : undefined}
              />
            </View>

            <View className="flex-row gap-3">
              <StatCard
                title="Events YTD"
                value={String(stats?.totalEventsYtd ?? 0)}
                icon="🎪"
              />
              <StatCard
                title="Acceptance Rate"
                value={`${(stats?.acceptanceRate ?? 0).toFixed(0)}%`}
                icon="✅"
                colorScheme="green"
              />
              <StatCard
                title="Avg / Event"
                value={formatCurrencyCompact(stats?.avgRevenuePerEvent ?? 0)}
                icon="⚖️"
              />
            </View>

            {/* Insights strip */}
            {insights.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {insights.map((ins, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#e7e5e4', maxWidth: 260 }}>
                    <Text style={{ fontSize: 14 }}>{ins.icon}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: ins.color, flexShrink: 1 }}>{ins.text}</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Committed Fees — collapsible */}
            {stats && stats.committedFees > 0 && (
              <View className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
                <TouchableOpacity
                  onPress={() => setShowFees((v) => !v)}
                  activeOpacity={0.7}
                  style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontWeight: '700', color: '#78350f', fontSize: 14 }}>💳 Committed Fees</Text>
                      <View style={{ backgroundColor: '#fde68a', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: '#78350f', fontSize: 11, fontWeight: '700' }}>
                          {stats.upcomingCommitments.length} event{stats.upcomingCommitments.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: '#b45309', fontSize: 11, marginTop: 2 }}>
                      {showFees ? 'Tap to collapse' : 'Tap to see breakdown'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontWeight: '700', color: '#92400e', fontSize: 16 }}>{formatCurrency(stats.committedFees)}</Text>
                    <Text style={{ color: '#b45309', fontSize: 13 }}>{showFees ? '▲' : '▼'}</Text>
                  </View>
                </TouchableOpacity>

                {showFees && (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#fde68a' }}>
                    <Text style={{ color: '#b45309', fontSize: 11, paddingTop: 12, marginBottom: 8 }}>
                      Pitch + power fees paid for upcoming accepted events
                    </Text>
                    {stats.upcomingCommitments.map((c, idx) => (
                      <View
                        key={c.id}
                        style={{
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                          paddingVertical: 10,
                          borderTopWidth: idx === 0 ? 0 : 1,
                          borderTopColor: '#fef3c7',
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ color: '#78350f', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{c.name}</Text>
                          <Text style={{ color: '#b45309', fontSize: 11, marginTop: 1 }}>{formatDateRange(c.date, c.end_date)}</Text>
                        </View>
                        <Text style={{ color: '#92400e', fontWeight: '700', fontSize: 14 }}>{formatCurrency(c.committedFee)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Fleet Overview */}
            {stats && stats.unitStatuses.length > 0 && (
              <View>
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="font-bold text-stone-900">Your Fleet</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/fleet')}>
                    <Text className="text-amber-600 text-sm">Manage →</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {stats.unitStatuses.map((unit: UnitWithStatus) => (
                    <View
                      key={unit.id}
                      className="bg-white rounded-2xl p-3 border border-slate-100 w-40 overflow-hidden"
                      style={{ borderLeftWidth: 3, borderLeftColor: UNIT_STATUS_COLORS[unit.status].dot }}
                    >
                      <Text className="font-bold text-slate-900 text-sm" numberOfLines={1}>{unit.name}</Text>
                      {unit.registration ? (
                        <Text className="text-xs text-slate-400 mt-0.5">{unit.registration}</Text>
                      ) : null}
                      <View className="mt-1.5">
                        {unit.currentEvent ? (
                          <Text className="text-xs text-amber-700" numberOfLines={1}>
                            📍 {unit.currentEvent.name}
                          </Text>
                        ) : unit.status === 'active' ? (
                          <Text className="text-xs text-green-600">✅ Free</Text>
                        ) : unit.status === 'maintenance' ? (
                          <Text className="text-xs text-amber-600">🔧 Maint.</Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Milk Usage */}
            {stats && (stats.totalFreshMilkLitres > 0 || stats.totalAltMilkLitres > 0) && (
              <View>
                <Text className="font-bold text-stone-900 mb-3">Milk Used (YTD) — {year}</Text>
                <View className="flex-row gap-3">
                  <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100">
                    <Text className="text-slate-700 font-semibold text-sm">
                      🥛 {stats.totalFreshMilkLitres.toFixed(1)} L
                    </Text>
                    <Text className="text-slate-400 text-xs mt-0.5">Fresh Milk</Text>
                  </View>
                  <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100">
                    <Text className="text-slate-700 font-semibold text-sm">
                      🌱 {stats.totalAltMilkLitres.toFixed(1)} L
                    </Text>
                    <Text className="text-slate-400 text-xs mt-0.5">Alt Milk</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Revenue chart */}
            {stats && <RevenueBarChart data={stats.monthlyRevenue} />}

            {/* Status breakdown */}
            {stats && stats.statusBreakdown.length > 0 && (
              <StatusPieChart data={stats.statusBreakdown} />
            )}

            {/* Reports quick access */}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/reports')}
              className="bg-white rounded-2xl p-4 border border-slate-100 flex-row items-center justify-between"
            >
              <View className="flex-1 mr-3">
                <Text className="font-bold text-slate-900 text-sm">📈 Reports</Text>
                <Text className="text-slate-400 text-xs mt-0.5">Annual P&L, top events, export CSV</Text>
              </View>
              <Text className="text-amber-600 font-medium text-sm">View →</Text>
            </TouchableOpacity>

            {/* Upcoming events */}
            {stats && stats.upcomingEvents.length > 0 && (
              <View>
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="font-bold text-stone-900">Upcoming Accepted</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
                    <Text className="text-amber-600 text-sm">View all</Text>
                  </TouchableOpacity>
                </View>
                {stats.upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </View>
            )}

            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      )}
    </View>
  );
}
</file>

<file path="components/events/EventCard.tsx">
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { EventStatusBadge } from '@/components/shared/EventStatusBadge';
import { formatDateRange, formatCurrency } from '@/lib/formatters';
import { STATUS_COLORS } from '@/constants';
import type { EventWithFinancials } from '@/types';

interface Props {
  event: EventWithFinancials;
}

export const EventCard = React.memo(function EventCard({ event }: Props) {
  const router = useRouter();
  const fin = event.event_financials;
  const calc = event.calculations;
  const dotColor = STATUS_COLORS[event.status]?.dot ?? '#a8a29e';
  const unitName = event.units?.length ? event.units.map((u) => u.name).join(' · ') : null;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/events/${event.id}`)}
      className="bg-white rounded-2xl mb-3 border border-slate-100 overflow-hidden"
      activeOpacity={0.7}
      style={{
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
      }}
    >
      {/* Status colour strip on left */}
      <View style={{ flexDirection: 'row' }}>
        <View
          style={{
            width: 4,
            backgroundColor: dotColor,
            borderTopLeftRadius: 16,
            borderBottomLeftRadius: 16,
          }}
        />
        <View style={{ flex: 1, padding: 14 }}>
          <View className="flex-row items-start justify-between mb-1.5">
            <View className="flex-1 mr-3">
              <Text
                className="font-bold text-slate-900 text-[15px] leading-snug"
                numberOfLines={2}
              >
                {event.name}
              </Text>
              <Text className="text-slate-500 text-xs mt-0.5" numberOfLines={1}>
                📍 {event.location}
              </Text>
            </View>
            <EventStatusBadge status={event.status} />
          </View>

          <View className="flex-row items-center flex-wrap gap-x-3 gap-y-1 mt-1">
            <Text className="text-slate-400 text-xs">
              📅 {formatDateRange(event.date, event.end_date)}
            </Text>
            {event.concessions_companies && (
              <Text className="text-slate-400 text-xs" numberOfLines={1}>
                🏢 {event.concessions_companies.name}
              </Text>
            )}
            {unitName && (
              <Text className="text-slate-400 text-xs" numberOfLines={1}>
                🚐 {unitName}
              </Text>
            )}
            {event.url_changed && (
              <View className="flex-row items-center bg-orange-100 px-2 py-0.5 rounded-full">
                <Text className="text-orange-700 text-xs font-semibold">⚡ Page changed</Text>
              </View>
            )}
          </View>

          {fin && fin.gross_sales > 0 && (
            <View className="flex-row mt-3 pt-3 border-t border-slate-50 gap-5">
              <View>
                <Text className="text-slate-400 text-xs">Gross Sales</Text>
                <Text className="font-bold text-slate-900 text-sm">
                  {formatCurrency(fin.gross_sales)}
                </Text>
              </View>
              <View>
                <Text className="text-slate-400 text-xs">Net Profit</Text>
                <Text
                  className={`font-bold text-sm ${
                    calc.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {formatCurrency(calc.netProfit)}
                </Text>
              </View>
              <View>
                <Text className="text-slate-400 text-xs">Margin</Text>
                <Text
                  className={`font-bold text-sm ${
                    calc.profitMargin >= 20
                      ? 'text-emerald-600'
                      : calc.profitMargin >= 0
                      ? 'text-amber-600'
                      : 'text-red-500'
                  }`}
                >
                  {calc.profitMargin.toFixed(1)}%
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});
</file>

<file path="components/units/UnitForm.tsx">
import React, { useState, useRef, useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity, Text, Alert, ActivityIndicator, Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useForm, Controller, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { format, parseISO, isValid } from 'date-fns';
import { unitSchema } from '@/lib/validations/unit.schema';
import { FormField } from '@/components/shared/FormField';
import { UNIT_STATUSES, UNIT_STATUS_LABELS, UNIT_STATUS_COLORS } from '@/constants';
import type { UnitFormValues } from '@/lib/validations/unit.schema';
import type { UnitStatus } from '@/types';

const VEHICLE_TYPES = ['Van', 'Truck', 'Trailer', 'Fridge Van', 'Transport Unit'];
const SERVICE_INTERVALS = [
  { value: '6months', label: 'Every 6 months' },
  { value: '1year',   label: 'Every year' },
] as const;

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function daysInMonth(month1based: number, year: number): number {
  return new Date(year, month1based, 0).getDate();
}

function WheelColumn({
  items, initialIndex, onChange,
}: {
  items: (string | number)[];
  initialIndex: number;
  onChange: (index: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [selectedIdx, setSelectedIdx] = useState(Math.max(0, Math.min(initialIndex, items.length - 1)));
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReportedIdx = useRef<number>(selectedIdx);

  useEffect(() => {
    const safeIdx = Math.max(0, Math.min(initialIndex, items.length - 1));
    setSelectedIdx(safeIdx);
    lastReportedIdx.current = safeIdx;
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: safeIdx * ITEM_HEIGHT, animated: false });
    }, 200);
  }, [initialIndex, items.length]);

  useEffect(() => () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  }, []);

  function handleScrollEnd(y: number) {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const idx = Math.max(0, Math.min(Math.round(y / ITEM_HEIGHT), items.length - 1));
      if (idx === lastReportedIdx.current) return;
      lastReportedIdx.current = idx;
      setSelectedIdx(idx);
      onChange(idx);
    }, 50);
  }

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', top: ITEM_HEIGHT * 2, left: 4, right: 4,
          height: ITEM_HEIGHT, backgroundColor: '#f1f5f9', borderRadius: 10,
        }}
      />
      <ScrollView
        ref={scrollRef}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
        onMomentumScrollEnd={(e) => handleScrollEnd(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => handleScrollEnd(e.nativeEvent.contentOffset.y)}
      >
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => {
              setSelectedIdx(index);
              onChange(index);
              scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
            }}
            activeOpacity={0.6}
          >
            <Text style={{
              fontSize: selectedIdx === index ? 17 : 15,
              fontWeight: selectedIdx === index ? '600' : '400',
              color: selectedIdx === index ? '#0f172a' : '#94a3b8',
            }}>
              {String(item)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function DatePickerModal({
  visible, value, onConfirm, onClose,
}: {
  visible: boolean; value: string; onConfirm: (iso: string) => void; onClose: () => void;
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 16 }, (_, i) => currentYear - 2 + i);

  const [dayIdx, setDayIdx] = useState(now.getDate() - 1);
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [yearIdx, setYearIdx] = useState(2);

  useEffect(() => {
    if (!visible) return;
    const p = (() => {
      if (!value) return now;
      try { const d = parseISO(value); return isValid(d) ? d : now; }
      catch { return now; }
    })();
    const yi = years.indexOf(p.getFullYear());
    setDayIdx(p.getDate() - 1);
    setMonthIdx(p.getMonth());
    setYearIdx(yi >= 0 ? yi : 2);
  }, [visible]);

  const numDays = daysInMonth(monthIdx + 1, years[yearIdx]);
  const days = Array.from({ length: numDays }, (_, i) => i + 1);
  const clampedDayIdx = Math.min(dayIdx, numDays - 1);

  function handleConfirm() {
    const year = years[yearIdx];
    const month = monthIdx + 1;
    const day = Math.min(dayIdx + 1, daysInMonth(month, year));
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onConfirm(iso);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 16, color: '#64748b' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 36 }}>
            <WheelColumn
              key={`day-${monthIdx}-${yearIdx}`}
              items={days}
              initialIndex={clampedDayIdx}
              onChange={(idx) => setDayIdx(idx)}
            />
            <WheelColumn
              key="month"
              items={MONTHS_SHORT}
              initialIndex={monthIdx}
              onChange={(idx) => setMonthIdx(idx)}
            />
            <WheelColumn
              key="year"
              items={years}
              initialIndex={yearIdx}
              onChange={(idx) => setYearIdx(idx)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Build an array of metric values: start, end, step (all × 10 to avoid float precision)
function metricValues(startTenths: number, endTenths: number): string[] {
  const result: string[] = [];
  for (let i = startTenths; i <= endTenths; i++) {
    result.push((i / 10).toFixed(1));
  }
  return result;
}

const HEIGHT_VALUES = metricValues(5, 50);  // 0.5m–5.0m
const LENGTH_VALUES = metricValues(10, 200); // 1.0m–20.0m
const WIDTH_VALUES  = metricValues(10, 45);  // 1.0m–4.5m

function MetricPickerModal({
  visible, value, values, unit, onConfirm, onClose,
}: {
  visible: boolean; value: number | null; values: string[]; unit: string;
  onConfirm: (v: number) => void; onClose: () => void;
}) {
  const defaultIdx = value != null
    ? Math.max(0, values.indexOf(value.toFixed(1)))
    : Math.floor(values.length / 2);
  const [idx, setIdx] = useState(defaultIdx);

  useEffect(() => {
    if (!visible) return;
    const i = value != null ? values.indexOf(value.toFixed(1)) : Math.floor(values.length / 2);
    setIdx(Math.max(0, i));
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 16, color: '#64748b' }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#334155' }}>{unit}</Text>
            <TouchableOpacity onPress={() => { onConfirm(parseFloat(values[idx])); onClose(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', paddingHorizontal: 60, paddingBottom: 36 }}>
            <WheelColumn items={values} initialIndex={Math.max(0, idx)} onChange={setIdx} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MetricPickerButton({
  label, value, values, unit, onChange,
}: {
  label: string; value: number | null; values: string[]; unit: string;
  onChange: (v: number | null) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <View>
      <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600', marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity
          onPress={() => setShow(true)}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
            paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#ffffff',
          }}
        >
          <Text style={{ color: value != null ? '#0f172a' : '#94a3b8', fontSize: 15 }}>
            {value != null ? `${value.toFixed(1)} m` : 'Not set'}
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 13 }}>▾</Text>
        </TouchableOpacity>
        {value != null && (
          <TouchableOpacity onPress={() => onChange(null)} style={{ padding: 10 }}>
            <Text style={{ color: '#94a3b8', fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      {show && (
        <MetricPickerModal
          visible={show}
          value={value}
          values={values}
          unit={unit}
          onConfirm={onChange}
          onClose={() => setShow(false)}
        />
      )}
    </View>
  );
}

function DatePickerButton({
  label, value, onChange, required,
}: {
  label: string; value: string; onChange: (iso: string) => void; required?: boolean;
}) {
  const [show, setShow] = useState(false);
  const displayText = value
    ? (() => { try { const d = parseISO(value); return isValid(d) ? format(d, 'd MMM yyyy') : value; } catch { return value; } })()
    : '';

  return (
    <View>
      <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600', marginBottom: 6 }}>
        {label}{required && <Text style={{ color: '#ef4444' }}> *</Text>}
      </Text>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
          paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#ffffff',
        }}
      >
        <Text style={{ color: displayText ? '#0f172a' : '#94a3b8', fontSize: 15 }}>
          {displayText || 'Select date'}
        </Text>
        <Text style={{ fontSize: 16 }}>📅</Text>
      </TouchableOpacity>
      {show && (
        <DatePickerModal
          visible={show}
          value={value}
          onConfirm={onChange}
          onClose={() => setShow(false)}
        />
      )}
    </View>
  );
}

interface Props {
  defaultValues?: Partial<UnitFormValues>;
  onSubmit: (data: UnitFormValues) => Promise<void>;
  submitLabel?: string;
}

export function UnitForm({ defaultValues, onSubmit, submitLabel = 'Save Unit' }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { control, handleSubmit, formState: { errors } } = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema) as Resolver<UnitFormValues>,
    defaultValues: {
      name: '',
      registration: '',
      notes: '',
      status: 'active',
      vehicle_type: '',
      height_m: null,
      length_m: null,
      width_m: null,
      mot_date: '',
      tax_date: '',
      service_date: '',
      service_interval: '1year',
      ...defaultValues,
    },
  });

  async function handleFormSubmit(data: UnitFormValues) {
    setLoading(true);
    try {
      await onSubmit(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save unit');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fafaf9' }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 16 }}>

          {/* Name */}
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

          {/* Registration */}
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

          {/* Vehicle type */}
          <Controller
            control={control}
            name="vehicle_type"
            render={({ field }) => (
              <View>
                <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Vehicle Type</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {VEHICLE_TYPES.map((vt) => {
                    const isSelected = field.value === vt;
                    return (
                      <TouchableOpacity
                        key={vt}
                        onPress={() => field.onChange(isSelected ? '' : vt)}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1,
                          backgroundColor: isSelected ? '#1c1917' : '#ffffff',
                          borderColor: isSelected ? '#1c1917' : '#e7e5e4',
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '500', color: isSelected ? '#ffffff' : '#57534e' }}>
                          {vt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          />

          {/* Dimensions */}
          <View>
            <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Dimensions</Text>
            <View style={{ gap: 10 }}>
              <Controller
                control={control}
                name="height_m"
                render={({ field }) => (
                  <MetricPickerButton
                    label="Height"
                    value={field.value ?? null}
                    values={HEIGHT_VALUES}
                    unit="metres"
                    onChange={field.onChange}
                  />
                )}
              />
              <Controller
                control={control}
                name="length_m"
                render={({ field }) => (
                  <MetricPickerButton
                    label="Length"
                    value={field.value ?? null}
                    values={LENGTH_VALUES}
                    unit="metres"
                    onChange={field.onChange}
                  />
                )}
              />
              <Controller
                control={control}
                name="width_m"
                render={({ field }) => (
                  <MetricPickerButton
                    label="Width"
                    value={field.value ?? null}
                    values={WIDTH_VALUES}
                    unit="metres"
                    onChange={field.onChange}
                  />
                )}
              />
            </View>
          </View>

          {/* Status */}
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <View>
                <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Status</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {UNIT_STATUSES.map((s) => {
                    const colors = UNIT_STATUS_COLORS[s as UnitStatus];
                    const isSelected = field.value === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => field.onChange(s)}
                        style={{
                          flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                          paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
                          backgroundColor: isSelected ? colors.bgHex : '#ffffff',
                          borderColor: isSelected ? 'transparent' : '#e7e5e4',
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dot, marginRight: 6 }} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? colors.textHex : '#78716c' }} numberOfLines={1}>
                          {UNIT_STATUS_LABELS[s as UnitStatus]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          />

          {/* MOT date */}
          <Controller
            control={control}
            name="mot_date"
            render={({ field }) => (
              <DatePickerButton
                label="MOT Expiry Date"
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />

          {/* Tax date */}
          <Controller
            control={control}
            name="tax_date"
            render={({ field }) => (
              <DatePickerButton
                label="Tax (VED) Expiry Date"
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />

          {/* Service date */}
          <Controller
            control={control}
            name="service_date"
            render={({ field }) => (
              <DatePickerButton
                label="Last Service Date"
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />

          {/* Service interval */}
          <Controller
            control={control}
            name="service_interval"
            render={({ field }) => (
              <View>
                <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Service Interval</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {SERVICE_INTERVALS.map(({ value, label }) => {
                    const isSelected = field.value === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        onPress={() => field.onChange(value)}
                        style={{
                          flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center',
                          backgroundColor: isSelected ? '#1c1917' : '#ffffff',
                          borderColor: isSelected ? '#1c1917' : '#e7e5e4',
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '500', color: isSelected ? '#ffffff' : '#57534e' }}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          />

          {/* Notes */}
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

      <View style={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 12, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f5f5f4' }}>
        <TouchableOpacity
          onPress={handleSubmit(handleFormSubmit)}
          style={{ backgroundColor: '#b45309', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>{submitLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
</file>

<file path="lib/queries/dashboard.ts">
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcEventFinancials } from '@/lib/calculations';
import { formatMonthLabel } from '@/lib/formatters';
import { EMPTY_CALCULATIONS } from '@/types';
import type { DashboardStats, MonthlyRevenue, StatusCount, ApplicationStatus, UnitWithStatus, EventWithFinancials } from '@/types';

export function useDashboard(year?: number) {
  const targetYear = year ?? new Date().getFullYear();
  return useQuery({
    queryKey: ['dashboard', targetYear],
    queryFn: async (): Promise<DashboardStats> => {
      const [eventsRes, unitsRes] = await Promise.all([
        supabase.from('events').select('*, event_financials(*), concessions_companies(*), event_units(units(*))').order('date', { ascending: false }),
        supabase.from('units').select('*').order('name'),
      ]);
      if (eventsRes.error) throw eventsRes.error;

      const allEventsRaw = eventsRes.data ?? [];
      const allUnits = unitsRes.data ?? [];

      // Normalise: events↔units is many-to-many via event_units
      const allEvents = allEventsRaw.map((e: any) => ({
        ...e,
        units: (e.event_units ?? []).map((eu: any) => eu.units).filter(Boolean),
      }));

      const ytdEvents = allEvents.filter((e) => e.date.startsWith(`${targetYear}`));

      const grossSalesYtd = ytdEvents.reduce((sum, e) => {
        const calc = e.event_financials ? calcEventFinancials(e.event_financials) : null;
        return sum + (calc?.totalNetSales ?? e.event_financials?.gross_sales ?? 0);
      }, 0);

      const netProfitYtd = ytdEvents.reduce((sum, e) => {
        if (!e.event_financials) return sum;
        return sum + calcEventFinancials(e.event_financials).netProfit;
      }, 0);

      const acceptedYtd = ytdEvents.filter((e) => e.status === 'accepted').length;
      const decidedYtd = ytdEvents.filter((e) => e.status === 'accepted' || e.status === 'rejected').length;
      const acceptanceRate = decidedYtd > 0 ? (acceptedYtd / decidedYtd) * 100 : 0;
      const eventsWithSales = ytdEvents.filter((e) => (e.event_financials?.gross_sales ?? 0) > 0);
      const avgRevenuePerEvent = eventsWithSales.length > 0 ? grossSalesYtd / eventsWithSales.length : 0;

      // Milk totals YTD (accepted events only)
      const acceptedYtdEvents = ytdEvents.filter((e) => e.status === 'accepted');
      const totalFreshMilkLitres = acceptedYtdEvents.reduce((sum, e) => sum + (e.event_financials?.fresh_milk_litres ?? 0), 0);
      const totalAltMilkLitres = acceptedYtdEvents.reduce((sum, e) => sum + (e.event_financials?.alt_milk_litres ?? 0), 0);

      // Upcoming events
      const today = new Date().toISOString().split('T')[0];
      const upcomingEvents = (allEvents
        .filter((e) => e.date >= today && e.status === 'accepted')
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5)
        .map((e) => ({
          ...e,
          calculations: e.event_financials ? calcEventFinancials(e.event_financials) : EMPTY_CALCULATIONS,
        })) as any) as EventWithFinancials[];

      // Monthly revenue
      const monthlyMap = new Map<number, MonthlyRevenue>();
      for (let m = 1; m <= 12; m++) {
        monthlyMap.set(m, { month: formatMonthLabel(m, targetYear), grossSales: 0, netProfit: 0 });
      }
      ytdEvents.forEach((e) => {
        const month = parseInt(e.date.split('-')[1], 10);
        const entry = monthlyMap.get(month)!;
        if (e.event_financials) {
          const calc = calcEventFinancials(e.event_financials);
          entry.grossSales += calc.totalNetSales;
          entry.netProfit += calc.netProfit;
        }
      });

      // Status breakdown
      const statusMap = new Map<ApplicationStatus, number>();
      allEvents.forEach((e) => {
        statusMap.set(e.status as ApplicationStatus, (statusMap.get(e.status as ApplicationStatus) ?? 0) + 1);
      });
      const statusBreakdown: StatusCount[] = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

      // Unit statuses — map each unit to its current/next accepted event.
      // events↔units is many-to-many via event_units, so filter by membership, not a direct FK.
      const unitStatuses: UnitWithStatus[] = allUnits.map((unit) => {
        const unitEvent = allEvents
          .filter((e) =>
            e.status === 'accepted' &&
            e.date >= today &&
            (e.units as any[]).some((u: any) => u?.id === unit.id),
          )
          .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
        return {
          ...unit,
          currentEvent: unitEvent
            ? ({ ...unitEvent, calculations: unitEvent.event_financials ? calcEventFinancials(unitEvent.event_financials) : EMPTY_CALCULATIONS } as any as EventWithFinancials)
            : null,
        };
      });

      // Committed fees: accepted upcoming events with pitch/power fees already paid
      const todayStr = new Date().toISOString().split('T')[0];
      const committedFeeEvents = allEvents.filter((e) => {
        const eventEnd = e.end_date ?? e.date;
        return e.status === 'accepted' && eventEnd > todayStr && (e.event_financials?.pitch_fee ?? 0) + (e.event_financials?.power_fee ?? 0) > 0;
      });
      const committedFees = committedFeeEvents.reduce((sum, e) => {
        return sum + (e.event_financials?.pitch_fee ?? 0) + (e.event_financials?.power_fee ?? 0);
      }, 0);
      const upcomingCommitments = committedFeeEvents
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => ({
          id: e.id,
          name: e.name,
          date: e.date,
          end_date: e.end_date,
          location: e.location,
          committedFee: (e.event_financials?.pitch_fee ?? 0) + (e.event_financials?.power_fee ?? 0),
        }));

      return {
        totalEventsYtd: ytdEvents.length,
        grossSalesYtd,
        netProfitYtd,
        acceptanceRate,
        avgRevenuePerEvent,
        upcomingEvents,
        monthlyRevenue: Array.from(monthlyMap.values()),
        statusBreakdown,
        totalFreshMilkLitres,
        totalAltMilkLitres,
        unitStatuses,
        committedFees,
        upcomingCommitments,
      };
    },
  });
}
</file>

<file path="lib/validations/event.schema.ts">
import { z } from 'zod';

const staffingEntrySchema = z.object({
  id: z.string().optional(),
  staff_name: z.string().min(1, 'Name required'),
  hours_worked: z.coerce.number().min(0),
  hourly_rate: z.coerce.number().min(0),
});

const infrastructureItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Description required'),
  category: z.enum(['pitch_fee', 'travel', 'equipment', 'supplies', 'other'] as const),
  cost: z.coerce.number().min(0),
});

export const eventSchema = z.object({
  // Core details
  name: z.string().min(2, 'Event name must be at least 2 characters'),
  date: z.string().min(1, 'Date is required'),
  end_date: z.string().optional(),
  location: z.string().min(2, 'Location is required'),
  description: z.string().optional(),
  application_date: z.string().optional(),
  status: z.enum(['pending', 'accepted', 'rejected', 'waitlisted', 'withdrawn'] as const),
  notes: z.string().optional(),
  company_id: z.string().optional(),
  unit_ids: z.array(z.string()).default([]),
  application_url: z.string().optional(),
  overnight_stay: z.boolean().default(false),
  documents_uploaded: z.boolean().default(false),

  // Sales & VAT
  gross_sales: z.coerce.number().min(0),
  zero_rated_sales: z.coerce.number().min(0),
  standard_rated_sales: z.coerce.number().min(0),
  concessions_commission_pct: z.coerce.number().min(0).max(100),
  pitch_fee_refund_pct: z.coerce.number().min(0).max(100),

  // Costs
  cost_of_goods: z.coerce.number().min(0),
  pitch_fee: z.coerce.number().min(0),
  power_fee: z.coerce.number().min(0),
  travel_costs: z.coerce.number().min(0),
  camping_costs: z.coerce.number().min(0),
  equipment_costs: z.coerce.number().min(0),
  other_costs: z.coerce.number().min(0),
  staffing_costs: z.coerce.number().min(0),

  // Milk / consumables
  fresh_milk_litres: z.coerce.number().min(0),
  alt_milk_litres: z.coerce.number().min(0),

  // Arrays
  staffing_entries: z.array(staffingEntrySchema).default([]),
  infrastructure_items: z.array(infrastructureItemSchema).default([]),
});

export type EventFormValues = z.infer<typeof eventSchema>;
</file>

<file path="app/(tabs)/fleet/[id]/index.tsx">
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUnit, useDeleteUnit } from '@/lib/queries/units';
import { useEvents } from '@/lib/queries/events';
import { EventCard } from '@/components/events/EventCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDateRange, formatDate } from '@/lib/formatters';
import { UNIT_STATUS_LABELS, UNIT_STATUS_COLORS } from '@/constants';
import type { UnitStatus } from '@/types';

export default function UnitDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: unit, isLoading, refetch } = useUnit(id);
  const { data: events, refetch: refetchEvents } = useEvents({ unitId: id });
  const deleteUnit = useDeleteUnit();

  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refetch(), refetchEvents()]);
    setRefreshing(false);
  }

  async function handleDelete() {
    try {
      await deleteUnit.mutateAsync(id);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  if (isLoading) return <LoadingSpinner message="Loading unit..." />;
  if (!unit) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-stone-500">Unit not found</Text>
      </View>
    );
  }

  const status = unit.status as UnitStatus;
  const colors = UNIT_STATUS_COLORS[status];
  const unitEvents = events ?? [];

  function expiryInfo(dateStr: string | null): { text: string; color: string } | null {
    if (!dateStr) return null;
    const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
    if (days < 0) return { text: `Expired ${Math.abs(days)}d ago`, color: '#dc2626' };
    if (days <= 30) return { text: `Due in ${days} day${days !== 1 ? 's' : ''}`, color: '#d97706' };
    return { text: formatDate(dateStr), color: '#059669' };
  }

  function serviceDueDate(serviceDate: string | null, interval: string | null): string | null {
    if (!serviceDate) return null;
    const d = new Date(serviceDate);
    if (interval === '6months') d.setMonth(d.getMonth() + 6);
    else d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  }

  const serviceDue = serviceDueDate(unit.service_date, unit.service_interval);

  const today = new Date().toISOString().split('T')[0];
  const upcomingEvent = [...unitEvents]
    .filter((e) => e.status === 'accepted' && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white border-b border-stone-100">
        <View style={{ height: 4, backgroundColor: colors.dot }} />
        <View className="px-4 pt-3 pb-4">
          <View className="flex-row items-center justify-between mb-2">
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back to fleet"
              className="flex-row items-center"
            >
              <Text className="text-amber-500 font-semibold text-sm">‹ Fleet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/fleet/${id}/edit`)}
              accessibilityRole="button"
              accessibilityLabel="Edit unit"
              className="bg-stone-900 px-4 py-1.5 rounded-xl"
            >
              <Text className="text-white font-semibold text-sm">Edit</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-xl font-bold text-stone-900 mb-1">{unit.name}</Text>

          <View className="flex-row items-center gap-2 flex-wrap">
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.bgHex }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dot, marginRight: 5 }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textHex }}>{UNIT_STATUS_LABELS[status]}</Text>
            </View>
            {unit.registration && (
              <Text className="text-stone-500 text-sm font-medium tracking-wide">{unit.registration}</Text>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />
        }
      >
        {/* Current / upcoming event highlight */}
        {upcomingEvent && (
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
            <Text className="text-amber-700 text-xs font-semibold uppercase tracking-wide mb-1">
              Upcoming Event
            </Text>
            <Text className="font-bold text-stone-900 text-base">{upcomingEvent.name}</Text>
            <Text className="text-stone-600 text-sm mt-0.5">
              📅 {formatDateRange(upcomingEvent.date, upcomingEvent.end_date)}
            </Text>
            <Text className="text-stone-500 text-sm mt-0.5" numberOfLines={1}>
              📍 {upcomingEvent.location}
            </Text>
          </View>
        )}

        {/* Dimensions */}
        {(unit.height_m != null || unit.length_m != null || unit.width_m != null) && (
          <View className="bg-white rounded-2xl p-4 border border-stone-100 mb-4">
            <Text className="font-bold text-stone-900 mb-3">Dimensions</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {unit.height_m != null && (
                <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>{unit.height_m.toFixed(1)}</Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Height (m)</Text>
                </View>
              )}
              {unit.length_m != null && (
                <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>{unit.length_m.toFixed(1)}</Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Length (m)</Text>
                </View>
              )}
              {unit.width_m != null && (
                <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>{unit.width_m.toFixed(1)}</Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Width (m)</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Vehicle dates */}
        {(unit.mot_date || unit.tax_date || unit.service_date) && (
          <View className="bg-white rounded-2xl p-4 border border-stone-100 mb-4">
            <Text className="font-bold text-stone-900 mb-3">Compliance Dates</Text>
            {[
              { label: 'MOT Expiry', dateStr: unit.mot_date, info: expiryInfo(unit.mot_date) },
              { label: 'Tax (VED) Expiry', dateStr: unit.tax_date, info: expiryInfo(unit.tax_date) },
              { label: 'Next Service Due', dateStr: serviceDue, info: expiryInfo(serviceDue) },
            ].filter(row => row.dateStr).map(({ label, info }) => (
              <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#fafaf9' }}>
                <Text style={{ fontSize: 13, color: '#78716c' }}>{label}</Text>
                {info && (
                  <Text style={{ fontSize: 13, fontWeight: '600', color: info.color }}>{info.text}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {unit.notes && (
          <View className="bg-white rounded-2xl p-4 border border-stone-100 mb-4">
            <Text className="font-bold text-stone-900 mb-1">Notes</Text>
            <Text className="text-stone-600 text-sm leading-relaxed">{unit.notes}</Text>
          </View>
        )}

        {/* Events list */}
        <Text className="font-bold text-stone-900 mb-3">Events</Text>
        {unitEvents.length === 0 ? (
          <EmptyState
            icon="🎪"
            title="No events yet"
            description="No events have been assigned to this unit."
          />
        ) : (
          unitEvents.map((event) => <EventCard key={event.id} event={event} />)
        )}

        <View className="bg-white rounded-2xl p-4 border border-stone-100 mt-4">
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'Delete Vehicle',
                `Delete "${unit.name}"? This cannot be undone.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: handleDelete },
                ],
              )
            }
            className="border border-red-200 py-3 rounded-xl items-center"
          >
            <Text className="text-red-500 font-medium text-sm">Delete Vehicle</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
</file>

<file path="components/events/CalendarView.tsx">
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, RefreshControl, PanResponder,
} from 'react-native';
import { useRouter } from 'expo-router';
import { STATUS_COLORS, STATUS_LABELS } from '@/constants';
import { OverlapModal } from './OverlapModal';
import type { EventWithFinancials, ApplicationStatus } from '@/types';

// Re-export scoring helpers so legacy imports of `scoreEvent` / `ScoreResult`
// from `@/components/events/CalendarView` continue to work.
export { scoreEvent } from '@/lib/scoring';
export type { ScoreResult } from '@/lib/scoring';

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── helpers ──────────────────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function buildGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const startDow = (first.getDay() + 6) % 7; // Mon = 0
  const grid: (Date | null)[][] = [];
  let row: (Date | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= last.getDate(); d++) {
    row.push(new Date(year, month, d));
    if (row.length === 7) { grid.push(row); row = []; }
  }
  if (row.length > 0) {
    while (row.length < 7) row.push(null);
    grid.push(row);
  }
  return grid;
}

function eventsOnDate(events: EventWithFinancials[], date: Date): EventWithFinancials[] {
  const d = isoDate(date);
  return events.filter((e) => {
    const start = e.date;
    const end = e.end_date ?? e.date;
    return d >= start && d <= end;
  });
}

// ── main CalendarView ────────────────────────────────────────────────────────────────────────────

export function CalendarView({
  events,
  refreshControl,
}: {
  events: EventWithFinancials[];
  refreshControl?: React.ReactElement<typeof RefreshControl>;
}) {
  const today = new Date();
  const router = useRouter();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [selected, setSelected] = useState<{ date: string; events: EventWithFinancials[] } | null>(null);

  const grid = useMemo(() => buildGrid(year, month), [year, month]);
  const todayStr = isoDate(today);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const monthHandlersRef = useRef({ prevMonth, nextMonth });
  useEffect(() => {
    monthHandlersRef.current = { prevMonth, nextMonth };
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) monthHandlersRef.current.nextMonth();
        else if (g.dx > 40) monthHandlersRef.current.prevMonth();
      },
    }),
  ).current;

  return (
    <View className="flex-1" {...panResponder.panHandlers}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-stone-100">
        <TouchableOpacity onPress={prevMonth} className="w-9 h-9 items-center justify-center rounded-full bg-stone-100">
          <Text className="text-stone-600 font-bold text-lg">‹</Text>
        </TouchableOpacity>
        <Text className="font-bold text-stone-900 text-base">{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} className="w-9 h-9 items-center justify-center rounded-full bg-stone-100">
          <Text className="text-stone-600 font-bold text-lg">›</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row bg-white border-b border-stone-100 px-1">
        {DOW.map((d) => (
          <View key={d} className="flex-1 items-center py-2">
            <Text className="text-stone-400 text-xs font-semibold">{d}</Text>
          </View>
        ))}
      </View>

      <ScrollView className="flex-1 bg-stone-50" refreshControl={refreshControl}>
        {grid.map((row, ri) => (
          <View key={ri} className="flex-row px-1">
            {row.map((date, ci) => {
              if (!date) return <View key={ci} className="flex-1 m-0.5 h-16" />;
              const dayEvents = eventsOnDate(events, date);
              const ds = isoDate(date);
              const isToday = ds === todayStr;
              const hasOverlap = dayEvents.length >= 2;
              const statusSet = [...new Set(dayEvents.map((e) => e.status))];

              return (
                <TouchableOpacity
                  key={ci}
                  onPress={() => dayEvents.length > 0 && setSelected({ date: ds, events: dayEvents })}
                  activeOpacity={dayEvents.length > 0 ? 0.7 : 1}
                  className={`flex-1 m-0.5 h-16 rounded-xl p-1.5 ${
                    isToday ? 'bg-amber-50 border border-amber-300' : 'bg-white border border-stone-100'
                  }`}
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className={`text-xs font-semibold ${isToday ? 'text-amber-600' : 'text-stone-700'}`}>
                      {date.getDate()}
                    </Text>
                    {hasOverlap && (
                      <View className="bg-red-100 px-1 rounded">
                        <Text className="text-red-600 text-xs font-bold">!</Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-row flex-wrap gap-0.5">
                    {statusSet.slice(0, 3).map((status) => (
                      <View
                        key={status}
                        style={{ backgroundColor: STATUS_COLORS[status as ApplicationStatus]?.dot ?? '#94a3b8', width: 6, height: 6, borderRadius: 3 }}
                      />
                    ))}
                  </View>

                  {dayEvents.length === 1 && (
                    <Text className="text-stone-500 text-xs mt-0.5 leading-tight" numberOfLines={1}>
                      {dayEvents[0].name}
                    </Text>
                  )}
                  {dayEvents.length > 1 && (
                    <Text className="text-stone-500 text-xs mt-0.5">{dayEvents.length} events</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <View className="mx-4 mt-3 mb-6 bg-white rounded-2xl p-3 border border-stone-100">
          <Text className="text-stone-400 text-xs font-bold uppercase tracking-wide mb-2">Legend</Text>
          <View className="flex-row flex-wrap gap-3">
            {(['pending', 'waitlisted', 'accepted', 'rejected'] as ApplicationStatus[]).map((s) => (
              <View key={s} className="flex-row items-center gap-1.5">
                <View style={{ backgroundColor: STATUS_COLORS[s].dot, width: 8, height: 8, borderRadius: 4 }} />
                <Text className="text-stone-500 text-xs">{STATUS_LABELS[s]}</Text>
              </View>
            ))}
            <View className="flex-row items-center gap-1.5">
              <View className="bg-red-100 px-1 rounded">
                <Text className="text-red-600 text-xs font-bold">!</Text>
              </View>
              <Text className="text-stone-500 text-xs">Overlap</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {selected && (
        <OverlapModal
          events={selected.events}
          allEvents={events}
          date={selected.date}
          onClose={() => setSelected(null)}
          router={router}
        />
      )}
    </View>
  );
}
</file>

<file path="types/index.ts">
import type { Database, ApplicationStatus, UnitStatus } from './database';

export type { ApplicationStatus, UnitStatus } from './database';

type Tables = Database['public']['Tables'];

export type Profile = Tables['profiles']['Row'];
export type ConcessionsCompany = Tables['concessions_companies']['Row'];
export type Event = Tables['events']['Row'];
export type EventFinancials = Tables['event_financials']['Row'];
export type StaffingEntry = Tables['staffing_entries']['Row'];
export type InfrastructureItem = Tables['infrastructure_items']['Row'];
export type Unit = Tables['units']['Row'];
export type UkEventDirectory = Tables['uk_events_directory']['Row'];

export type InfrastructureCategory = 'pitch_fee' | 'travel' | 'equipment' | 'supplies' | 'other';

export interface EventCalculations {
  // VAT breakdown
  standardRatedNet: number;
  vatCollected: number;
  totalNetSales: number;
  // Commission & pitch fee settlement
  commissionAmount: number;
  pitchFeeRefundGross: number;
  netRefund: number;
  effectivePitchFee: number;
  // Summary
  grossProfit: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  totalStaffingCost: number;
}

export const EMPTY_CALCULATIONS: EventCalculations = {
  standardRatedNet: 0, vatCollected: 0, totalNetSales: 0,
  commissionAmount: 0, pitchFeeRefundGross: 0, netRefund: 0, effectivePitchFee: 0,
  grossProfit: 0, totalCosts: 0, netProfit: 0, profitMargin: 0, totalStaffingCost: 0,
};

export interface EventWithFinancials extends Event {
  event_financials: EventFinancials | null;
  concessions_companies: ConcessionsCompany | null;
  units: Unit[];
  calculations: EventCalculations;
}

export interface EventDetail extends EventWithFinancials {
  staffing_entries: StaffingEntry[];
  infrastructure_items: InfrastructureItem[];
}

export interface DiscoveredEvent {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  location: string | null;
  dateHint: string | null;
  category: string;
  region: string | null;
  organiser: string | null;
  estimatedFootfall: string | null;
  pitchFeeRange: string | null;
  featured: boolean;
  // Company-specific fields
  eventsManaged: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  lastVerifiedAt: string | null;
  applicationChanged: boolean;
  isCompany: boolean;
}

export interface CompanyWithStats extends ConcessionsCompany {
  totalEvents: number;
  acceptedEvents: number;
  totalRevenue: number;
  totalNetProfit: number;
  lastEventDate: string | null;
  avgProfitMargin: number | null;
  completedEventCount: number;
}

export interface UnitWithStatus extends Unit {
  currentEvent: EventWithFinancials | null;
}

export interface DashboardStats {
  totalEventsYtd: number;
  grossSalesYtd: number;
  netProfitYtd: number;
  acceptanceRate: number;
  avgRevenuePerEvent: number;
  upcomingEvents: EventWithFinancials[];
  monthlyRevenue: MonthlyRevenue[];
  statusBreakdown: StatusCount[];
  totalFreshMilkLitres: number;
  totalAltMilkLitres: number;
  unitStatuses: UnitWithStatus[];
  committedFees: number;
  upcomingCommitments: {
    id: string;
    name: string;
    date: string;
    end_date: string | null;
    location: string;
    committedFee: number;
  }[];
}

export interface MonthlyRevenue {
  month: string;
  grossSales: number;
  netProfit: number;
}

export interface StatusCount {
  status: ApplicationStatus;
  count: number;
}

export interface ReportData {
  year: number;
  totalGross: number;
  totalNet: number;
  totalEvents: number;
  avgMargin: number;
  totalFreshMilkLitres: number;
  totalAltMilkLitres: number;
  monthly: MonthlyBreakdown[];
  topEvents: EventWithFinancials[];
  companyPerformance: CompanyPerformance[];
}

export interface MonthlyBreakdown {
  month: number;
  monthLabel: string;
  eventCount: number;
  grossSales: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
}

export interface CompanyPerformance {
  company: ConcessionsCompany;
  totalEvents: number;
  acceptedEvents: number;
  totalRevenue: number;
  acceptanceRate: number;
}

export interface StaffingEntryForm {
  id?: string;
  staff_name: string;
  hours_worked: number;
  hourly_rate: number;
}

export interface InfrastructureItemForm {
  id?: string;
  description: string;
  category: InfrastructureCategory;
  cost: number;
}

export type { UnitFormValues } from '@/lib/validations/unit.schema';

export interface CompanyFormValues {
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  notes?: string;
}
</file>

<file path="app/(tabs)/events/index.tsx">
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useEvents } from '@/lib/queries/events';
import { useCompanies } from '@/lib/queries/companies';
import { EventCard } from '@/components/events/EventCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { QueryError } from '@/components/shared/QueryError';
import { formatDateRange } from '@/lib/formatters';
import { STATUSES, STATUS_LABELS } from '@/constants';
import type { ApplicationStatus, EventWithFinancials, CompanyWithStats } from '@/types';

const YEARS = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];

function eventsOverlap(a: EventWithFinancials, b: EventWithFinancials): boolean {
  const aEnd = a.end_date ?? a.date;
  const bEnd = b.end_date ?? b.date;
  if (!(a.date <= bEnd && b.date <= aEnd)) return false;
  // Only flag as conflict when both events share at least one unit
  const aUnitIds = new Set(a.units.map((u) => u.id));
  return b.units.some((u) => aUnitIds.has(u.id));
}

function OverlapBanner({
  a, b, companyMap,
}: {
  a: EventWithFinancials;
  b: EventWithFinancials;
  companyMap: Map<string, CompanyWithStats>;
}) {
  const compA = a.company_id ? companyMap.get(a.company_id) : null;
  const compB = b.company_id ? companyMap.get(b.company_id) : null;

  const hasA = compA != null && compA.avgProfitMargin != null && compA.completedEventCount > 0;
  const hasB = compB != null && compB.avgProfitMargin != null && compB.completedEventCount > 0;

  let recommendation = '';
  if (hasA && hasB) {
    const winner = compA!.avgProfitMargin! >= compB!.avgProfitMargin!
      ? { event: a, comp: compA! }
      : { event: b, comp: compB! };
    const loser = winner.event === a ? { event: b, comp: compB! } : { event: a, comp: compA! };
    recommendation = `Prioritise "${winner.event.name}" — ${winner.comp.name} avg ${winner.comp.avgProfitMargin!.toFixed(0)}% margin across ${winner.comp.completedEventCount} event${winner.comp.completedEventCount > 1 ? 's' : ''} vs ${loser.comp.avgProfitMargin!.toFixed(0)}% for ${loser.comp.name}.`;
  } else if (hasA) {
    recommendation = `"${a.name}" via ${compA!.name} has ${compA!.completedEventCount} past event${compA!.completedEventCount > 1 ? 's' : ''} (avg ${compA!.avgProfitMargin!.toFixed(0)}% margin). No history for "${b.name}" yet.`;
  } else if (hasB) {
    recommendation = `"${b.name}" via ${compB!.name} has ${compB!.completedEventCount} past event${compB!.completedEventCount > 1 ? 's' : ''} (avg ${compB!.avgProfitMargin!.toFixed(0)}% margin). No history for "${a.name}" yet.`;
  }

  return (
    <View style={{ backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 16, padding: 14, marginBottom: 12 }}>
      <Text style={{ color: '#c2410c', fontWeight: '700', fontSize: 13, marginBottom: 4 }}>⚡ Schedule Conflict</Text>
      <Text style={{ color: '#ea580c', fontSize: 12, marginBottom: 6 }}>
        "{a.name}" ({formatDateRange(a.date, a.end_date)}) overlaps with "{b.name}" ({formatDateRange(b.date, b.end_date)}).
      </Text>
      {hasA && (
        <Text style={{ color: '#9a3412', fontSize: 11, marginTop: 2 }}>
          • {compA!.name}: Avg {compA!.avgProfitMargin!.toFixed(0)}% margin ({compA!.completedEventCount} event{compA!.completedEventCount > 1 ? 's' : ''})
        </Text>
      )}
      {hasB && (
        <Text style={{ color: '#9a3412', fontSize: 11, marginTop: 2 }}>
          • {compB!.name}: Avg {compB!.avgProfitMargin!.toFixed(0)}% margin ({compB!.completedEventCount} event{compB!.completedEventCount > 1 ? 's' : ''})
        </Text>
      )}
      {!hasA && !hasB && (
        <Text style={{ color: '#9a3412', fontSize: 11, marginTop: 2 }}>No historical data yet to rank these events.</Text>
      )}
      {recommendation ? (
        <Text style={{ color: '#c2410c', fontSize: 12, fontWeight: '600', marginTop: 6 }}>→ {recommendation}</Text>
      ) : null}
    </View>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#78716c', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</Text>
      <Text style={{ fontSize: 11, color: '#a8a29e' }}>{count}</Text>
    </View>
  );
}

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<number | undefined>(undefined);
  const [viewFilter, setViewFilter] = useState<'upcoming' | 'completed' | 'all'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: eventsRaw, isLoading, isError, error, refetch } = useEvents({ status: statusFilter, year: yearFilter });
  const { data: companies } = useCompanies();

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const today = new Date().toISOString().split('T')[0];

  const events = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const sorted = [...(eventsRaw ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    if (!q) return sorted;
    return sorted.filter(
      (e) => e.name.toLowerCase().includes(q) || e.location.toLowerCase().includes(q),
    );
  }, [eventsRaw, searchQuery]);

  const upcoming = useMemo(() => events.filter((e) => (e.end_date ?? e.date) >= today), [events, today]);
  const completed = useMemo(() => events.filter((e) => (e.end_date ?? e.date) < today), [events, today]);

  const companyMap = useMemo(() => {
    const m = new Map<string, CompanyWithStats>();
    companies?.forEach((c) => m.set(c.id, c));
    return m;
  }, [companies]);

  const overlappingPairs = useMemo(() => {
    const pairs: Array<{ a: EventWithFinancials; b: EventWithFinancials }> = [];
    const upcomingAccepted = upcoming.filter((e) => e.status === 'accepted' || e.status === 'pending' || e.status === 'waitlisted');
    for (let i = 0; i < upcomingAccepted.length; i++) {
      for (let j = i + 1; j < upcomingAccepted.length; j++) {
        if (eventsOverlap(upcomingAccepted[i], upcomingAccepted[j])) {
          pairs.push({ a: upcomingAccepted[i], b: upcomingAccepted[j] });
        }
      }
    }
    return pairs;
  }, [upcoming]);

  const totalRevenue = events.reduce((s, e) => s + (e.event_financials?.gross_sales ?? 0), 0);
  const totalNet = events.reduce((s, e) => s + e.calculations.netProfit, 0);

  type RowItem =
    | { kind: 'banner'; id: string; a: EventWithFinancials; b: EventWithFinancials }
    | { kind: 'section'; id: string; title: string; count: number }
    | { kind: 'event'; id: string; event: EventWithFinancials };

  const rowItems = useMemo<RowItem[]>(() => {
    const items: RowItem[] = [];
    if (viewFilter !== 'completed') {
      overlappingPairs.forEach(({ a, b }, i) => {
        items.push({ kind: 'banner', id: `banner-${i}-${a.id}-${b.id}`, a, b });
      });
    }
    if (viewFilter !== 'completed' && upcoming.length > 0) {
      if (viewFilter === 'all') {
        items.push({ kind: 'section', id: 'sec-upcoming', title: 'Upcoming', count: upcoming.length });
      }
      upcoming.forEach((e) => items.push({ kind: 'event', id: e.id, event: e }));
    }
    if (viewFilter !== 'upcoming' && completed.length > 0) {
      if (viewFilter === 'all') {
        items.push({ kind: 'section', id: 'sec-completed', title: 'Completed', count: completed.length });
      }
      completed.forEach((e) => items.push({ kind: 'event', id: e.id, event: e }));
    }
    return items;
  }, [viewFilter, overlappingPairs, upcoming, completed]);

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pt-2 pb-3 bg-white border-b border-stone-100">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-bold text-stone-900">Events</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/events/new')}
            accessibilityRole="button"
            accessibilityLabel="Add new event"
            className="bg-amber-700 px-4 py-2 rounded-xl"
          >
            <Text className="text-white font-semibold text-sm">+ New</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f4', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, gap: 8 }}>
          <Text style={{ color: '#a8a29e', fontSize: 14 }}>🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search events or locations..."
            placeholderTextColor="#a8a29e"
            style={{ flex: 1, fontSize: 14, color: '#1c1917', padding: 0 }}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>

        {/* Upcoming / Completed / All tabs */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }} accessibilityRole="radiogroup">
          {(['upcoming', 'completed', 'all'] as const).map((v) => {
            const labels = { upcoming: 'Upcoming', completed: 'Completed', all: 'All' };
            const isActive = viewFilter === v;
            return (
              <TouchableOpacity
                key={v}
                onPress={() => setViewFilter(v)}
                accessibilityRole="radio"
                accessibilityLabel={`Show ${labels[v].toLowerCase()} events`}
                accessibilityState={{ selected: isActive }}
                style={{
                  flex: 1, paddingVertical: 7, borderRadius: 10, alignItems: 'center',
                  backgroundColor: isActive ? '#1c1917' : '#f5f5f4',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? '#ffffff' : '#57534e' }}>
                  {labels[v]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Status filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} accessibilityRole="radiogroup">
          <TouchableOpacity
            onPress={() => setStatusFilter('all')}
            accessibilityRole="radio"
            accessibilityLabel="Show all statuses"
            accessibilityState={{ selected: statusFilter === 'all' }}
            style={{
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1,
              backgroundColor: statusFilter === 'all' ? '#1c1917' : '#ffffff',
              borderColor: statusFilter === 'all' ? '#1c1917' : '#d6d3d1',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '500', color: statusFilter === 'all' ? '#ffffff' : '#57534e' }}>All</Text>
          </TouchableOpacity>
          {STATUSES.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setStatusFilter(statusFilter === s ? 'all' : s)}
              accessibilityRole="radio"
              accessibilityLabel={`Filter by ${STATUS_LABELS[s]}`}
              accessibilityState={{ selected: statusFilter === s }}
              style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1,
                backgroundColor: statusFilter === s ? '#1c1917' : '#ffffff',
                borderColor: statusFilter === s ? '#1c1917' : '#d6d3d1',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: statusFilter === s ? '#ffffff' : '#57534e' }}>
                {STATUS_LABELS[s]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Year filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 6 }} accessibilityRole="radiogroup">
          <TouchableOpacity
            onPress={() => setYearFilter(undefined)}
            accessibilityRole="radio"
            accessibilityLabel="Show events from all years"
            accessibilityState={{ selected: !yearFilter }}
            style={{
              paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
              backgroundColor: !yearFilter ? '#fef3c7' : '#ffffff',
              borderColor: !yearFilter ? '#fcd34d' : '#d6d3d1',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '500', color: !yearFilter ? '#92400e' : '#78716c' }}>All Years</Text>
          </TouchableOpacity>
          {YEARS.map((y) => (
            <TouchableOpacity
              key={y}
              onPress={() => setYearFilter(yearFilter === y ? undefined : y)}
              accessibilityRole="radio"
              accessibilityLabel={`Filter by year ${y}`}
              accessibilityState={{ selected: yearFilter === y }}
              style={{
                paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
                backgroundColor: yearFilter === y ? '#fef3c7' : '#ffffff',
                borderColor: yearFilter === y ? '#fcd34d' : '#d6d3d1',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: yearFilter === y ? '#92400e' : '#78716c' }}>{y}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Summary strip */}
      {events.length > 0 && (
        <View className="flex-row bg-white px-4 py-2 border-b border-stone-100 gap-6">
          <Text className="text-stone-500 text-xs">{events.length} event{events.length !== 1 ? 's' : ''}</Text>
          {totalRevenue > 0 && (
            <Text className="text-stone-500 text-xs">Sales: <Text className="text-stone-700 font-medium">£{totalRevenue.toFixed(0)}</Text></Text>
          )}
          {totalNet !== 0 && (
            <Text className="text-stone-500 text-xs">Net: <Text className={`font-medium ${totalNet >= 0 ? 'text-green-600' : 'text-red-500'}`}>£{totalNet.toFixed(0)}</Text></Text>
          )}
        </View>
      )}

      {isLoading ? (
        <LoadingSpinner message="Loading events..." />
      ) : isError ? (
        <QueryError error={error} onRetry={refetch} message="Couldn't load events" />
      ) : events.length === 0 ? (
        <ScrollView
          className="flex-1 px-4 pt-4"
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" colors={["#b45309"]} />}
        >
          <EmptyState
            icon="🎪"
            title="No events yet"
            description="Apply to your first event and track it here."
            action={{ label: '+ Add Event', onPress: () => router.push('/(tabs)/events/new') }}
            tip="Tip: You can import events from the Discover tab"
          />
        </ScrollView>
      ) : rowItems.length === 0 ? (
        <ScrollView
          className="flex-1 px-4 pt-4"
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" colors={["#b45309"]} />}
        >
          {viewFilter === 'upcoming' ? (
            <EmptyState icon="📅" title="No upcoming events" description="All events are in the past." />
          ) : viewFilter === 'completed' ? (
            <EmptyState icon="✅" title="No completed events" description="Events that have passed will appear here." />
          ) : null}
        </ScrollView>
      ) : (
        <View className="flex-1 px-4 pt-4">
          <FlashList
            data={rowItems}
            keyExtractor={(item) => item.id}
            estimatedItemSize={140}
            keyboardDismissMode="on-drag"
            getItemType={(item) => item.kind}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" colors={["#b45309"]} />}
            ListFooterComponent={<View style={{ height: 32 }} />}
            renderItem={({ item }) => {
              if (item.kind === 'banner') return <OverlapBanner a={item.a} b={item.b} companyMap={companyMap} />;
              if (item.kind === 'section') return <SectionHeader title={item.title} count={item.count} />;
              return <EventCard event={item.event} />;
            }}
          />
        </View>
      )}
    </View>
  );
}
</file>

<file path="app/_layout.tsx">
import '../global.css';
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/queries/profile';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 2 },
  },
});

function RootLayoutNav() {
  const { session, loading, user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (profileLoading && session) return; // wait for profile
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      if (!profile?.business_name) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)/dashboard');
      }
    } else if (session && !inAuthGroup && !inOnboarding && !profile?.business_name && profile !== null && !profileLoading) {
      router.replace('/onboarding');
    }
  }, [session, loading, segments, profile, profileLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RootLayoutNav />
            <StatusBar style="dark" />
          </AuthProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
</file>

<file path="lib/mutations/events.ts">
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcStaffingTotal } from '@/lib/calculations';
import type { EventFormValues } from '@/lib/validations/event.schema';

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, userId }: { data: EventFormValues; userId: string }) => {
      // 1. Create the event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          user_id: userId,
          name: data.name,
          date: data.date,
          end_date: data.end_date || null,
          location: data.location,
          description: data.description || null,
          application_date: data.application_date || null,
          status: data.status,
          notes: data.notes || null,
          company_id: data.company_id || null,
          overnight_stay: data.overnight_stay ?? false,
          documents_uploaded: data.documents_uploaded ?? false,
          application_url: data.application_url || null,
        })
        .select()
        .single();
      if (eventError) throw eventError;

      // 2. Calculate staffing total from entries if provided
      const staffingTotal =
        data.staffing_entries.length > 0
          ? calcStaffingTotal(data.staffing_entries.map((e) => ({ ...e, id: '', event_id: event.id, created_at: '', updated_at: '' })))
          : data.staffing_costs;

      // 3. Create financials
      const zeroRated = data.zero_rated_sales ?? 0;
      const standardRated = data.standard_rated_sales ?? 0;
      const { error: finError } = await supabase.from('event_financials').insert({
        event_id: event.id,
        gross_sales: (zeroRated + standardRated) || data.gross_sales || 0,
        zero_rated_sales: zeroRated,
        standard_rated_sales: standardRated,
        concessions_commission_pct: data.concessions_commission_pct ?? 0,
        pitch_fee_refund_pct: data.pitch_fee_refund_pct ?? 0,
        cost_of_goods: data.cost_of_goods,
        pitch_fee: data.pitch_fee,
        power_fee: data.power_fee ?? 0,
        travel_costs: data.travel_costs,
        camping_costs: data.camping_costs ?? 0,
        equipment_costs: data.equipment_costs,
        other_costs: data.other_costs,
        staffing_costs: staffingTotal,
        fresh_milk_litres: data.fresh_milk_litres ?? 0,
        alt_milk_litres: data.alt_milk_litres ?? 0,
      });
      if (finError) throw finError;

      // 4. Create unit assignments
      if (data.unit_ids.length > 0) {
        const { error: unitError } = await supabase.from('event_units').insert(
          data.unit_ids.map((uid) => ({ event_id: event.id, unit_id: uid }))
        );
        if (unitError) throw unitError;
      }

      // 5. Create staffing entries
      if (data.staffing_entries.length > 0) {
        const { error: staffError } = await supabase.from('staffing_entries').insert(
          data.staffing_entries.map((e) => ({
            event_id: event.id,
            staff_name: e.staff_name,
            hours_worked: e.hours_worked,
            hourly_rate: e.hourly_rate,
          }))
        );
        if (staffError) throw staffError;
      }

      // 6. Create infrastructure items
      if (data.infrastructure_items.length > 0) {
        const { error: infraError } = await supabase.from('infrastructure_items').insert(
          data.infrastructure_items.map((item) => ({
            event_id: event.id,
            description: item.description,
            category: item.category,
            cost: item.cost,
          }))
        );
        if (infraError) throw infraError;
      }

      return event;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['units'] });
    },
  });
}

// Fields on the event row itself that are safe to optimistically merge into
// cached lists without recomputing derived data.
const EVENT_ROW_FIELDS = [
  'name', 'date', 'end_date', 'location', 'description', 'application_date',
  'status', 'notes', 'company_id', 'overnight_stay', 'documents_uploaded', 'application_url',
] as const;

function pickEventRowFields(data: EventFormValues): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of EVENT_ROW_FIELDS) {
    if (key in data) out[key] = (data as any)[key];
  }
  return out;
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    onMutate: async ({ id, data }: { id: string; data: EventFormValues }) => {
      await qc.cancelQueries({ queryKey: ['events'] });
      const patch = pickEventRowFields(data);
      const snapshots = qc.getQueriesData<any>({ queryKey: ['events'] });
      snapshots.forEach(([key, value]) => {
        if (Array.isArray(value)) {
          qc.setQueryData(key, value.map((e: any) => (e?.id === id ? { ...e, ...patch } : e)));
        } else if (value && typeof value === 'object' && value.id === id) {
          qc.setQueryData(key, { ...value, ...patch });
        }
      });
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      context?.snapshots?.forEach(([key, value]) => {
        qc.setQueryData(key, value);
      });
    },
    mutationFn: async ({ id, data }: { id: string; data: EventFormValues }) => {
      // 1. Update event
      const { error: eventError } = await supabase
        .from('events')
        .update({
          name: data.name,
          date: data.date,
          end_date: data.end_date || null,
          location: data.location,
          description: data.description || null,
          application_date: data.application_date || null,
          status: data.status,
          notes: data.notes || null,
          company_id: data.company_id || null,
          overnight_stay: data.overnight_stay ?? false,
          documents_uploaded: data.documents_uploaded ?? false,
          application_url: data.application_url || null,
          url_changed: false,
        })
        .eq('id', id);
      if (eventError) throw eventError;

      const staffingTotal =
        data.staffing_entries.length > 0
          ? calcStaffingTotal(data.staffing_entries.map((e) => ({ ...e, id: e.id ?? '', event_id: id, created_at: '', updated_at: '' })))
          : data.staffing_costs;

      const zeroRated = data.zero_rated_sales ?? 0;
      const standardRated = data.standard_rated_sales ?? 0;

      // 2. Upsert financials
      const { error: finError } = await supabase
        .from('event_financials')
        .upsert({
          event_id: id,
          gross_sales: (zeroRated + standardRated) || data.gross_sales || 0,
          zero_rated_sales: zeroRated,
          standard_rated_sales: standardRated,
          concessions_commission_pct: data.concessions_commission_pct ?? 0,
          pitch_fee_refund_pct: data.pitch_fee_refund_pct ?? 0,
          cost_of_goods: data.cost_of_goods,
          pitch_fee: data.pitch_fee,
          power_fee: data.power_fee ?? 0,
          travel_costs: data.travel_costs,
          camping_costs: data.camping_costs ?? 0,
          equipment_costs: data.equipment_costs,
          other_costs: data.other_costs,
          staffing_costs: staffingTotal,
          fresh_milk_litres: data.fresh_milk_litres ?? 0,
          alt_milk_litres: data.alt_milk_litres ?? 0,
        }, { onConflict: 'event_id' });
      if (finError) throw finError;

      // 3. Replace unit assignments
      await supabase.from('event_units').delete().eq('event_id', id);
      if (data.unit_ids.length > 0) {
        const { error: unitError } = await supabase.from('event_units').insert(
          data.unit_ids.map((uid) => ({ event_id: id, unit_id: uid }))
        );
        if (unitError) throw unitError;
      }

      // 4. Replace staffing entries
      await supabase.from('staffing_entries').delete().eq('event_id', id);
      if (data.staffing_entries.length > 0) {
        const { error: staffError } = await supabase.from('staffing_entries').insert(
          data.staffing_entries.map((e) => ({
            event_id: id, staff_name: e.staff_name, hours_worked: e.hours_worked, hourly_rate: e.hourly_rate,
          }))
        );
        if (staffError) throw staffError;
      }

      // 5. Replace infrastructure items
      await supabase.from('infrastructure_items').delete().eq('event_id', id);
      if (data.infrastructure_items.length > 0) {
        const { error: infraError } = await supabase.from('infrastructure_items').insert(
          data.infrastructure_items.map((item) => ({
            event_id: id, description: item.description, category: item.category, cost: item.cost,
          }))
        );
        if (infraError) throw infraError;
      }
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['events', id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['units'] });
    },
  });
}
</file>

<file path="supabase/migrations.sql">
-- Run this in your Supabase SQL editor to set up the database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Concessions companies
CREATE TABLE IF NOT EXISTS public.concessions_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.concessions_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD own companies" ON public.concessions_companies;
CREATE POLICY "Users can CRUD own companies" ON public.concessions_companies
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Events
DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected', 'waitlisted', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  end_date DATE,
  location TEXT NOT NULL,
  description TEXT,
  application_date DATE,
  status application_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  company_id UUID REFERENCES public.concessions_companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD own events" ON public.events;
CREATE POLICY "Users can CRUD own events" ON public.events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Event financials (1-to-1 with events)
CREATE TABLE IF NOT EXISTS public.event_financials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  gross_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_of_goods NUMERIC(12,2) NOT NULL DEFAULT 0,
  pitch_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  travel_costs NUMERIC(12,2) NOT NULL DEFAULT 0,
  equipment_costs NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_costs NUMERIC(12,2) NOT NULL DEFAULT 0,
  staffing_costs NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.event_financials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD own event_financials" ON public.event_financials;
CREATE POLICY "Users can CRUD own event_financials" ON public.event_financials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.user_id = auth.uid()
    )
  );

-- Staffing entries
CREATE TABLE IF NOT EXISTS public.staffing_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  hours_worked NUMERIC(6,2) NOT NULL DEFAULT 0,
  hourly_rate NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.staffing_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD own staffing_entries" ON public.staffing_entries;
CREATE POLICY "Users can CRUD own staffing_entries" ON public.staffing_entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
  );

-- Infrastructure items
DO $$ BEGIN
  CREATE TYPE infrastructure_category AS ENUM ('pitch_fee', 'travel', 'equipment', 'supplies', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.infrastructure_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category infrastructure_category NOT NULL DEFAULT 'other',
  cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.infrastructure_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD own infrastructure_items" ON public.infrastructure_items;
CREATE POLICY "Users can CRUD own infrastructure_items" ON public.infrastructure_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
  );

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.concessions_companies;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.concessions_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.events;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.event_financials;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.event_financials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.staffing_entries;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.staffing_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.infrastructure_items;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.infrastructure_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- Migration 002: Event discovery, URL monitoring, push tokens
-- ============================================================

-- Add push token to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS push_token TEXT,
  ADD COLUMN IF NOT EXISTS business_name_updated TEXT;

-- Add URL monitoring fields to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS application_url TEXT,
  ADD COLUMN IF NOT EXISTS page_hash TEXT,
  ADD COLUMN IF NOT EXISTS url_last_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS url_changed BOOLEAN NOT NULL DEFAULT FALSE;

-- Enable pg_cron and pg_net for scheduled URL checks
-- (run separately if these extensions are not already enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the check-application-urls edge function to run daily at 8am UTC
-- Uncomment and update YOUR_SUPABASE_PROJECT_REF and YOUR_ANON_KEY after setup:
-- SELECT cron.schedule(
--   'check-application-urls-daily',
--   '0 8 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/check-application-urls',
--     headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- ============================================================
-- Migration 003: Fleet (units), enhanced financials, Discover
-- ============================================================
-- Safe to run multiple times — uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS

-- Unit status enum
DO $$ BEGIN
  CREATE TYPE unit_status AS ENUM ('active', 'maintenance', 'retired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Units (fleet) table
CREATE TABLE IF NOT EXISTS public.units (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  registration TEXT,
  notes       TEXT,
  status      unit_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can CRUD own units"
    ON public.units FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS set_updated_at ON public.units;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- New columns on events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS overnight_stay BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS documents_uploaded BOOLEAN NOT NULL DEFAULT FALSE;

-- New columns on event_financials
ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS zero_rated_sales        NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS standard_rated_sales    NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS concessions_commission_pct NUMERIC(7,4) NOT NULL DEFAULT 0;
ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS pitch_fee_refund_pct    NUMERIC(7,4) NOT NULL DEFAULT 0;
ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS power_fee              NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS camping_costs          NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS fresh_milk_litres      NUMERIC(8,2)  NOT NULL DEFAULT 0;
ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS alt_milk_litres        NUMERIC(8,2)  NOT NULL DEFAULT 0;

-- UK Events & Concessions Company Directory
CREATE TABLE IF NOT EXISTS public.uk_events_directory (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT        NOT NULL,
  organiser           TEXT,
  website             TEXT,
  location            TEXT,
  region              TEXT,
  category            TEXT,
  description         TEXT,
  application_url     TEXT,
  typical_dates       TEXT,
  next_date           TEXT,
  estimated_footfall  TEXT,
  pitch_fee_range     TEXT,
  events_managed      TEXT,
  contact_phone       TEXT,
  contact_email       TEXT,
  last_verified_at    TIMESTAMPTZ,
  application_changed BOOLEAN     NOT NULL DEFAULT FALSE,
  page_hash           TEXT,
  source              TEXT        NOT NULL DEFAULT 'manual',
  featured            BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns if upgrading from an older version of the table
ALTER TABLE public.uk_events_directory ADD COLUMN IF NOT EXISTS events_managed      TEXT;
ALTER TABLE public.uk_events_directory ADD COLUMN IF NOT EXISTS contact_phone       TEXT;
ALTER TABLE public.uk_events_directory ADD COLUMN IF NOT EXISTS contact_email       TEXT;
ALTER TABLE public.uk_events_directory ADD COLUMN IF NOT EXISTS last_verified_at    TIMESTAMPTZ;
ALTER TABLE public.uk_events_directory ADD COLUMN IF NOT EXISTS application_changed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.uk_events_directory ADD COLUMN IF NOT EXISTS page_hash           TEXT;
ALTER TABLE public.uk_events_directory ADD COLUMN IF NOT EXISTS next_date           TEXT;

-- Unique index so we can safely upsert seed data (ON CONFLICT (name))
CREATE UNIQUE INDEX IF NOT EXISTS uk_events_directory_name_idx ON public.uk_events_directory (name);

-- Trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_directory()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.uk_events_directory;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.uk_events_directory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_directory();

-- ── Seed: Concessions Companies ──────────────────────────────────────────────
-- Uses upsert so it is safe to run again without creating duplicates.

INSERT INTO public.uk_events_directory
  (name, category, description, website, application_url, featured,
   events_managed, contact_phone, contact_email, region, source)
VALUES

('D&J Catering & Events',
 'Concessions Company',
 'One of the UK''s longest-established concessions operators, managing catering at hundreds of events annually across music festivals, motorsport and outdoor shows.',
 'https://www.dnjcatering.co.uk', 'https://www.dnjcatering.co.uk/traders', TRUE,
 'Glastonbury, Download, Isle of Wight Festival, Creamfields, V Festival, Silverstone',
 NULL, 'traders@dnjcatering.co.uk', 'National', 'manual'),

('Togather',
 'Concessions Company',
 'Modern concessions platform partnering with independent street food traders for festivals, corporate events and markets. Online application portal with rolling availability.',
 'https://www.togather.com', 'https://www.togather.com/traders', TRUE,
 'Latitude, Wilderness Festival, Victorious, Cambridge Folk Festival',
 NULL, 'traders@togather.com', 'National', 'manual'),

('Central Fusion',
 'Concessions Company',
 'Boutique concessions agency focusing on premium festivals and lifestyle events. Strong relationships with independent food and drink operators.',
 'https://www.centralfusion.co.uk', 'https://www.centralfusion.co.uk/apply', FALSE,
 'British Summer Time Hyde Park, Kew the Music, Carfest',
 NULL, 'hello@centralfusion.co.uk', 'London & South', 'manual'),

('RB Vernon',
 'Concessions Company',
 'Established concessions contractor primarily serving motorsport, air shows and outdoor sporting events. Known for large-scale pitches.',
 'https://www.rbvernon.co.uk', 'https://www.rbvernon.co.uk/catering-enquiries', FALSE,
 'Silverstone Grand Prix, Goodwood, RIAT Air Tattoo, Cheltenham Festival',
 NULL, 'catering@rbvernon.co.uk', 'Midlands & South', 'manual'),

('Severn Events',
 'Concessions Company',
 'Regional concessions operator covering the Midlands, Wales and South West. Strong presence at county shows, food festivals and rural events.',
 'https://www.severnevents.co.uk', 'https://www.severnevents.co.uk/traders', FALSE,
 'Three Counties Show, Royal Welsh Show, Malvern Shows',
 '01905 000000', 'traders@severnevents.co.uk', 'Midlands & Wales', 'manual'),

('Eat & Drink Festivals',
 'Concessions Company',
 'Specialist food and drink festival organiser running consumer shows across the UK. Direct application process for food and beverage traders.',
 'https://www.eatanddrinkfestivals.com', 'https://www.eatanddrinkfestivals.com/traders', TRUE,
 'Eat & Drink Festival (multiple cities), BBC Good Food Show',
 NULL, 'traders@eatanddrinkfestivals.com', 'National', 'manual'),

('FEAST',
 'Concessions Company',
 'Award-winning street food festival organiser creating premium outdoor dining events at historic and cultural venues across the UK.',
 'https://www.feastonline.co.uk', 'https://www.feastonline.co.uk/apply', FALSE,
 'FEAST at Blenheim Palace, FEAST Winchester, FEAST Arundel',
 NULL, 'hello@feastonline.co.uk', 'South & South East', 'manual'),

('Kerb',
 'Concessions Company',
 'London''s leading street food collective, operating markets at permanent and pop-up sites and managing concessions at major events. Highly competitive application process.',
 'https://www.kerbfood.com', 'https://www.kerbfood.com/traders', TRUE,
 'Kerb Camden, Kerb King''s Cross, Glastonbury, All Points East',
 NULL, 'traders@kerbfood.com', 'London', 'manual'),

('Tuck (by Coggers)',
 'Concessions Company',
 'Growing concessions network supplying traders to community events, food markets and smaller festivals. Good entry point for new traders.',
 'https://www.tuckmarket.co.uk', 'https://www.tuckmarket.co.uk/apply', FALSE,
 'Tuck Markets (various), local county fairs, community festivals',
 NULL, 'hello@tuckmarket.co.uk', 'National', 'manual'),

('Urban Food Fest',
 'Concessions Company',
 'Street food festival organiser running high-footfall weekend markets in city centres. Known for quality curation and social media promotion.',
 'https://www.urbanfoodfest.com', 'https://www.urbanfoodfest.com/traders', FALSE,
 'Urban Food Fest Manchester, Birmingham, Leeds, Bristol',
 NULL, 'traders@urbanfoodfest.com', 'National', 'manual'),

('Street Food Warehouse',
 'Concessions Company',
 'Fast-growing street food event company running converted warehouse events across the North of England. Seeking specialist coffee and hot drink traders.',
 'https://www.streetfoodwarehouse.co.uk', 'https://www.streetfoodwarehouse.co.uk/traders', FALSE,
 'Street Food Warehouse Leeds, Manchester, Sheffield, Newcastle',
 NULL, 'traders@streetfoodwarehouse.co.uk', 'North England', 'manual'),

('VIP Events Catering',
 'Concessions Company',
 'Premium concessions contractor for corporate hospitality, sporting events and high-end festivals. Focus on quality and premium branding.',
 'https://www.vipevents.co.uk', 'https://www.vipevents.co.uk/catering-partners', FALSE,
 'Polo events, equestrian shows, corporate summer parties',
 NULL, 'catering@vipevents.co.uk', 'South England', 'manual'),

-- New major companies
('Great British Food Festival',
 'Concessions Company',
 'The UK''s largest touring food festival, visiting stately homes and heritage venues across England. Dedicated trader application portal with seasonal availability.',
 'https://www.greatbritishfoodfestival.com', 'https://www.greatbritishfoodfestival.com/apply', TRUE,
 'Great British Food Festival at Audley End, Tatton Park, Hardwick Hall, Chatsworth, Shugborough',
 NULL, 'traders@greatbritishfoodfestival.com', 'National', 'manual'),

('Foodies Festival',
 'Concessions Company',
 'UK''s premier outdoor food and drink festival brand, running 8+ events per year at iconic venues. Strong coffee trading opportunity.',
 'https://www.foodiesfestival.com', 'https://www.foodiesfestival.com/trade-stands', TRUE,
 'Foodies Festival Edinburgh, Oxford, Brighton, Birmingham, London',
 NULL, 'trade@foodiesfestival.com', 'National', 'manual'),

('Food and Drink Festivals UK',
 'Concessions Company',
 'Regional food festival organiser running events at country parks and showgrounds across England. Coffee and hot beverage traders always welcome.',
 'https://www.foodanddrinkfestivals.com', 'https://www.foodanddrinkfestivals.com/traders', FALSE,
 'Food & Drink Festival (East Midlands, West Midlands, Yorkshire)',
 NULL, 'info@foodanddrinkfestivals.com', 'Midlands & Yorkshire', 'manual'),

('Mellors Group',
 'Concessions Company',
 'National funfair and outdoor events catering contractor. Operates at theme parks, outdoor festivals and touring shows across the UK.',
 'https://www.mellorsgroup.com', 'https://www.mellorsgroup.com/contact', FALSE,
 'Travelling fairs, theme park events, outdoor shows',
 '01623 707 666', 'enquiries@mellorsgroup.com', 'National', 'manual'),

('Broadwick Live',
 'Concessions Company',
 'Premium live events company running some of the UK''s most iconic festivals. Competitive application but excellent returns for accepted traders.',
 'https://www.broadwicklive.com', 'https://www.broadwicklive.com', TRUE,
 'Tobacco Dock events, Field Day, Printworks London',
 NULL, 'production@broadwicklive.com', 'London', 'manual'),

('RHS Shows',
 'Concessions Company',
 'Royal Horticultural Society catering concessions at flagship flower shows. Prestigious venues with wealthy demographics — premium coffee pricing well received.',
 'https://www.rhs.org.uk', 'https://www.rhs.org.uk/shows-events/exhibiting', TRUE,
 'RHS Chelsea Flower Show, RHS Hampton Court, RHS Tatton Park, RHS Cardiff',
 NULL, 'commercialventures@rhs.org.uk', 'National', 'manual'),

('Taste Festivals',
 'Concessions Company',
 'Premium food and wine festival brand with prestige venues. Application requires established brand and quality credentials.',
 'https://www.tastefestivals.com', 'https://www.tastefestivals.com/participate', FALSE,
 'Taste of London, Taste of Edinburgh',
 NULL, 'participate@tastefestivals.com', 'London & Scotland', 'manual'),

('Channell Events',
 'Concessions Company',
 'Specialist motorsport and outdoor events caterer with strong presence at UK race circuits. Reliable pitch fees and experienced operations team.',
 'https://www.channellevents.co.uk', 'https://www.channellevents.co.uk/traders', FALSE,
 'Thruxton, Snetterton, Brands Hatch, Castle Combe',
 NULL, 'traders@channellevents.co.uk', 'South & East', 'manual'),

('Street Food Hub',
 'Concessions Company',
 'Curated street food market organiser placing traders at local authority events, business parks and pop-up markets. Good for building regular income.',
 'https://www.streetfoodhub.co.uk', 'https://www.streetfoodhub.co.uk/apply', FALSE,
 'Corporate catering days, local authority events, weekend markets',
 NULL, 'hello@streetfoodhub.co.uk', 'National', 'manual'),

('NCASS (Nationwide Caterers Association)',
 'Industry Body',
 'The trade association for mobile caterers and street food traders in the UK. Provides insurance, food hygiene certificates, licensing advice and a members events directory.',
 'https://www.ncass.org.uk', 'https://www.ncass.org.uk/membership', TRUE,
 'NCASS members have access to an exclusive events listing not available elsewhere',
 '0121 603 2524', 'info@ncass.org.uk', 'National', 'manual'),

('Street Food Union (SFU)',
 'Industry Body',
 'Trade body and community for street food vendors. Runs markets and advocates for fair pitch fees and sustainable trading conditions.',
 'https://www.streetfoodunion.com', 'https://www.streetfoodunion.com/join', FALSE,
 NULL, NULL, 'hello@streetfoodunion.com', 'National', 'manual')

ON CONFLICT (name) DO UPDATE SET
  description        = EXCLUDED.description,
  website            = EXCLUDED.website,
  application_url    = EXCLUDED.application_url,
  featured           = EXCLUDED.featured,
  events_managed     = EXCLUDED.events_managed,
  contact_phone      = EXCLUDED.contact_phone,
  contact_email      = EXCLUDED.contact_email,
  region             = EXCLUDED.region,
  updated_at         = NOW();

-- ── Seed: UK Events & Festivals ──────────────────────────────────────────────

INSERT INTO public.uk_events_directory
  (name, category, description, website, application_url, featured,
   organiser, location, region, typical_dates, next_date, estimated_footfall, pitch_fee_range, source)
VALUES

('Glastonbury Festival',
 'Music Festival',
 'The world''s largest greenfield festival. Coffee trading here is highly competitive but extremely high volume — expect 200,000+ attendees. Managed via D&J Catering & Events.',
 'https://www.glastonburyfestivals.co.uk', NULL, TRUE,
 'D&J Catering & Events', 'Pilton, Somerset', 'South West', 'Late June', '2026-06-26',
 '200,000+', '£3,000–£12,000', 'manual'),

('Download Festival',
 'Music Festival',
 'UK''s premier rock and metal festival at Donington Park. Three days, 100,000+ attendance. D&J manages concessions.',
 'https://www.downloadfestival.co.uk', NULL, TRUE,
 'D&J Catering & Events', 'Donington Park, Leicestershire', 'Midlands', 'June', '2026-06-06',
 '100,000+', '£2,000–£8,000', 'manual'),

('Reading Festival',
 'Music Festival',
 'Iconic dual-site festival (Reading + Leeds). Apply through D&J for Reading. One of the best concessions events in the UK calendar.',
 'https://www.readingfestival.com', NULL, TRUE,
 'D&J Catering & Events', 'Little John''s Farm, Reading', 'South East', 'August Bank Holiday', '2026-08-28',
 '105,000+', '£2,500–£9,000', 'manual'),

('Leeds Festival',
 'Music Festival',
 'Twin event with Reading. High-volume weekend event with strong coffee trading opportunities throughout the day.',
 'https://www.leedsfestival.com', NULL, TRUE,
 'D&J Catering & Events', 'Bramham Park, Leeds', 'Yorkshire', 'August Bank Holiday', '2026-08-28',
 '105,000+', '£2,500–£9,000', 'manual'),

('Creamfields',
 'Music Festival',
 'UK''s biggest electronic music festival. 70,000 per day, 4-day event. Very strong early morning coffee demand.',
 'https://www.creamfields.com', NULL, FALSE,
 'D&J Catering & Events', 'Daresbury, Cheshire', 'North West', 'August', '2026-08-27',
 '70,000/day', '£1,500–£5,000', 'manual'),

('Latitude Festival',
 'Music Festival',
 'Arts and music festival in Suffolk. Relaxed family-friendly atmosphere, premium demographics — ideal for specialty coffee.',
 'https://www.latitudefestival.com', NULL, FALSE,
 'Togather', 'Henham Park, Suffolk', 'East of England', 'July', '2026-07-16',
 '35,000', '£1,200–£4,500', 'manual'),

('Wilderness Festival',
 'Music Festival',
 'Boutique lifestyle festival at Cornbury Park. Upmarket crowd, premium spend — excellent for high-end coffee concepts.',
 'https://www.wildernessfestival.com', NULL, FALSE,
 'Togather', 'Cornbury Park, Oxfordshire', 'South East', 'August', '2026-08-06',
 '25,000', '£1,000–£3,500', 'manual'),

('All Points East',
 'Music Festival',
 'Victoria Park London festival run by AEG Presents. Urban demographic, very coffee-forward audience.',
 'https://www.allpointseastfestival.com', NULL, FALSE,
 'Kerb', 'Victoria Park, London', 'London', 'May', '2026-05-22',
 '50,000+', '£1,800–£6,000', 'manual'),

('Field Day',
 'Music Festival',
 'Alternative music festival in London. Broadwick Live event with curated food offering. Niche but loyal audience.',
 'https://fielddayfestivals.com', NULL, FALSE,
 'Broadwick Live', 'Tobacco Dock, London', 'London', 'June', NULL,
 '15,000', '£800–£2,500', 'manual'),

('Victorious Festival',
 'Music Festival',
 'Portsmouth seafront festival. 50,000+ over the weekend, growing rapidly. Apply through Togather.',
 'https://www.victoriousfestival.co.uk', NULL, FALSE,
 'Togather', 'Southsea, Portsmouth', 'South East', 'August', '2026-08-22',
 '50,000+', '£1,200–£4,000', 'manual'),

('RHS Chelsea Flower Show',
 'Garden and Lifestyle',
 'The world''s most famous flower show. Affluent demographic (avg spend very high). Managed directly by RHS — competitive but profitable for quality operators.',
 'https://www.rhs.org.uk/shows-events/rhs-chelsea-flower-show', NULL, TRUE,
 'RHS Shows', 'Royal Hospital Chelsea, London', 'London', 'May', '2026-05-19',
 '150,000+', '£3,000–£10,000', 'manual'),

('RHS Hampton Court Palace Garden Festival',
 'Garden and Lifestyle',
 'Second largest RHS show. Summer gardens event with affluent audience and premium hospitality. Excellent coffee demand.',
 'https://www.rhs.org.uk/shows-events/rhs-hampton-court-palace-garden-festival', NULL, TRUE,
 'RHS Shows', 'Hampton Court Palace, Surrey', 'London', 'July', '2026-07-01',
 '120,000+', '£2,500–£8,000', 'manual'),

('RHS Tatton Park',
 'Garden and Lifestyle',
 'North West''s flagship garden show. Three-day event at the stunning Tatton Park estate.',
 'https://www.rhs.org.uk/shows-events/rhs-tatton-park-flower-show', NULL, FALSE,
 'RHS Shows', 'Tatton Park, Cheshire', 'North West', 'July', '2026-07-22',
 '80,000+', '£1,500–£5,500', 'manual'),

('Goodwood Festival of Speed',
 'Motorsport',
 'World''s greatest motorsport garden party. 200,000+ over 4 days, very high average spend. Managed by RB Vernon / independent application.',
 'https://www.goodwood.com/motorsport/festival-of-speed', NULL, TRUE,
 'RB Vernon', 'Goodwood House, West Sussex', 'South East', 'July', '2026-07-09',
 '200,000+', '£2,500–£10,000', 'manual'),

('Goodwood Revival',
 'Motorsport',
 'Vintage motorsport spectacular. Dress-code 1940s–1960s. Wealthy demographic, very high per-head spend. Premium coffee does well here.',
 'https://www.goodwood.com/motorsport/goodwood-revival', NULL, TRUE,
 'RB Vernon', 'Goodwood Motor Circuit, West Sussex', 'South East', 'September', '2026-09-04',
 '150,000+', '£2,500–£9,000', 'manual'),

('Silverstone Formula 1 British Grand Prix',
 'Motorsport',
 'UK''s biggest motorsport event. 450,000+ across the weekend. Managed by RB Vernon / D&J. Highly competitive pitch allocation.',
 'https://www.silverstone.co.uk', NULL, TRUE,
 'RB Vernon', 'Silverstone Circuit, Northamptonshire', 'Midlands', 'July', '2026-07-03',
 '450,000+', '£4,000–£15,000', 'manual'),

('Cheltenham Festival (Horse Racing)',
 'Equestrian',
 'Four-day National Hunt horse racing festival. Huge crowds, premium spend, excellent for hot drinks in March weather.',
 'https://www.cheltenham.co.uk/racing/cheltenham-festival', NULL, FALSE,
 'RB Vernon', 'Cheltenham Racecourse, Gloucestershire', 'South West', 'March', '2027-03-16',
 '280,000+', '£2,000–£8,000', 'manual'),

('Royal Ascot',
 'Equestrian',
 'Five-day flat racing festival. Some of the most affluent racegoers in the world. Premium branding essential — specialty coffee well suited.',
 'https://www.ascot.co.uk', NULL, FALSE,
 'Independent Application', 'Ascot Racecourse, Berkshire', 'South East', 'June', '2026-06-16',
 '300,000+', '£3,000–£12,000', 'manual'),

('Foodies Festival Edinburgh',
 'Food Festival',
 'One of Scotland''s biggest food festivals at Inverleith Park. Hot drinks are always top sellers.',
 'https://www.foodiesfestival.com', 'https://www.foodiesfestival.com/trade-stands', TRUE,
 'Foodies Festival', 'Inverleith Park, Edinburgh', 'Scotland', 'August', '2026-08-07',
 '50,000+', '£1,000–£3,500', 'manual'),

('Foodies Festival Brighton',
 'Food Festival',
 'South coast Foodies Festival, strong weekend family audience. Coffee and cold brew do very well here.',
 'https://www.foodiesfestival.com', 'https://www.foodiesfestival.com/trade-stands', FALSE,
 'Foodies Festival', 'Hove Lawns, Brighton', 'South East', 'May', '2026-05-23',
 '35,000+', '£900–£3,000', 'manual'),

('Great British Food Festival at Chatsworth',
 'Food Festival',
 'Flagship GBFF event at the spectacular Chatsworth estate. Top-tier demographic, excellent coffee revenue potential.',
 'https://www.greatbritishfoodfestival.com', 'https://www.greatbritishfoodfestival.com/apply', TRUE,
 'Great British Food Festival', 'Chatsworth House, Derbyshire', 'Midlands', 'September', '2026-09-05',
 '30,000+', '£900–£3,000', 'manual'),

('Great British Food Festival at Audley End',
 'Food Festival',
 'GBFF event at the beautiful Audley End House. Two days, affluent audience, strong demand for artisan coffee.',
 'https://www.greatbritishfoodfestival.com', 'https://www.greatbritishfoodfestival.com/apply', FALSE,
 'Great British Food Festival', 'Audley End House, Essex', 'East of England', 'June', '2026-06-27',
 '20,000+', '£800–£2,500', 'manual'),

('BBC Good Food Show Winter',
 'Food Festival',
 'BBC-branded consumer food show at the NEC Birmingham. Indoor show with massive footfall — ideal for specialty coffee.',
 'https://www.bbcgoodfoodshow.com', 'https://www.bbcgoodfoodshow.com/exhibiting', TRUE,
 'Eat & Drink Festivals', 'NEC Birmingham', 'Midlands', 'November', '2026-11-25',
 '120,000+', '£2,000–£7,000', 'manual'),

('Taste of London',
 'Food Festival',
 'Premium food and restaurant festival in Regent''s Park. Very high-end audience, strong spend. Application through Taste Festivals.',
 'https://www.tastefestivals.com', 'https://www.tastefestivals.com/participate', FALSE,
 'Taste Festivals', 'Regent''s Park, London', 'London', 'June', '2026-06-17',
 '45,000+', '£1,500–£5,000', 'manual'),

('Manchester Christmas Markets',
 'Christmas Market',
 'One of the UK''s largest Christmas markets across multiple city centre sites. Hot drink pitch applications managed by Manchester City Council.',
 'https://www.manchesterchristmas.com', 'https://www.manchester.gov.uk/christmas-markets', TRUE,
 'Manchester City Council', 'Manchester City Centre', 'North West', 'November–December', '2026-11-13',
 '500,000+', '£3,000–£12,000', 'manual'),

('Birmingham Frankfurt Christmas Market',
 'Christmas Market',
 'Europe''s largest German Christmas market outside Germany and Austria. Coffee concession applications through Birmingham Events.',
 'https://www.thinkbirmingham.com/christmas', NULL, TRUE,
 'Birmingham City Council', 'Birmingham City Centre', 'Midlands', 'November–December', '2026-11-05',
 '5,500,000+', '£4,000–£15,000', 'manual'),

('Winchester Christmas Market',
 'Christmas Market',
 'Charming Christmas market in the grounds of Winchester Cathedral. Premium demographic, strong hot drink sales.',
 'https://www.winchestercathedral.org.uk/christmas', NULL, FALSE,
 'Winchester BID', 'Winchester Cathedral, Hampshire', 'South East', 'November–December', '2026-11-20',
 '250,000+', '£2,000–£8,000', 'manual'),

('Bath Christmas Market',
 'Christmas Market',
 'One of the UK''s most atmospheric Christmas markets, set against Roman and Georgian architecture. Apply direct to Bath BID.',
 'https://www.bathchristmasmarket.co.uk', 'https://www.bathchristmasmarket.co.uk/traders', FALSE,
 'Bath BID', 'Bath City Centre', 'South West', 'Late November–December', '2026-11-26',
 '400,000+', '£2,500–£10,000', 'manual'),

('Kerb Camden Market',
 'Street Food Market',
 'London''s most iconic street food market, operating year-round. Regular weekly trading — excellent for building a loyal customer base.',
 'https://www.camdenmarket.com/food', 'https://www.kerbfood.com/traders', FALSE,
 'Kerb', 'Camden Market, London', 'London', 'Year-round, weekends', NULL,
 '5,000–15,000/day', '£300–£800/day', 'manual'),

('Kerb King''s Cross',
 'Street Food Market',
 'Lunchtime street food market at Granary Square, King''s Cross. Corporate and tourist demographic, excellent coffee take-up.',
 'https://www.kerbfood.com', 'https://www.kerbfood.com/traders', FALSE,
 'Kerb', 'Granary Square, King''s Cross, London', 'London', 'Weekdays year-round', NULL,
 '2,000–5,000/day', '£200–£600/day', 'manual'),

('Portobello Road Market',
 'Street Food Market',
 'Famous London antiques and street food market. Weekend trading, strong tourist footfall. Apply to Portobello Road BID.',
 'https://www.portobelloroad.co.uk', NULL, FALSE,
 'Portobello Road BID', 'Portobello Road, Notting Hill, London', 'London', 'Saturdays year-round', NULL,
 '3,000–10,000/day', '£150–£500/day', 'manual'),

('Digbeth Dining Club',
 'Street Food Market',
 'Birmingham''s best street food market in the creative district. Apply direct. Strong demographic for specialty coffee.',
 'https://www.digbethdiningclub.com', 'https://www.digbethdiningclub.com/apply', FALSE,
 'Digbeth Dining Club Ltd', 'Digbeth, Birmingham', 'Midlands', 'Weekends year-round', NULL,
 '2,000–6,000/day', '£200–£600/day', 'manual'),

('British Street Food Awards',
 'Food Festival',
 'Regional heats and national final celebrating the best of UK street food. Apply to compete and trade at regional heats — excellent profile building.',
 'https://www.britishstreetfood.co.uk', 'https://www.britishstreetfood.co.uk/enter', FALSE,
 'British Street Food Awards', 'Various UK cities', 'National', 'May–September', NULL,
 '5,000–20,000', '£300–£1,200', 'manual')

ON CONFLICT (name) DO UPDATE SET
  description       = EXCLUDED.description,
  website           = EXCLUDED.website,
  application_url   = EXCLUDED.application_url,
  organiser         = EXCLUDED.organiser,
  location          = EXCLUDED.location,
  region            = EXCLUDED.region,
  typical_dates     = EXCLUDED.typical_dates,
  next_date         = EXCLUDED.next_date,
  estimated_footfall = EXCLUDED.estimated_footfall,
  pitch_fee_range   = EXCLUDED.pitch_fee_range,
  featured          = EXCLUDED.featured,
  updated_at        = NOW();

-- ============================================================
-- Migration 004: pg_cron scheduled jobs for daily auto-sync
-- ============================================================
-- Run this AFTER enabling pg_cron in your Supabase dashboard:
--   Dashboard → Project Settings → Extensions → pg_cron → Enable
-- Also enable pg_net in the same way (required for HTTP calls from pg_cron).
--
-- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY with real values.
-- Service role key is safe to use here as this runs inside Supabase's
-- trusted server environment (not exposed to clients).

-- Enable required extensions (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Job 1: Daily event sync (03:00 UTC) ─────────────────────────────────────
-- Searches Brave for new UK events/festivals and upserts into uk_events_directory.
-- Requires BRAVE_SEARCH_API_KEY secret to be set.
--
SELECT cron.unschedule('sync-directory-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-directory-daily'
);

SELECT cron.schedule(
  'sync-directory-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-directory',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'Authorization',  'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ── Job 2: Daily URL check (08:00 UTC) ───────────────────────────────────────
-- Checks application URLs for your tracked events and flags page changes.
-- No API key needed — uses service role key only.
--
SELECT cron.unschedule('check-application-urls-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'check-application-urls-daily'
);

SELECT cron.schedule(
  'check-application-urls-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-application-urls',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'Authorization',  'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Verify scheduled jobs:
-- SELECT * FROM cron.job;

-- ============================================================
-- Migration 005: Multi-unit support per event
-- ============================================================
-- Adds event_units join table so multiple units can be assigned
-- to a single event. The existing unit_id column on events is
-- kept for backwards compatibility but the app now reads/writes
-- through event_units instead.

CREATE TABLE IF NOT EXISTS public.event_units (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id   UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  unit_id    UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, unit_id)
);

ALTER TABLE public.event_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own event_units" ON public.event_units;
CREATE POLICY "Users can CRUD own event_units" ON public.event_units
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
  );

-- Migrate any existing unit_id data into event_units
INSERT INTO public.event_units (event_id, unit_id)
SELECT id, unit_id FROM public.events WHERE unit_id IS NOT NULL
ON CONFLICT (event_id, unit_id) DO NOTHING;

-- ============================================================
-- Migration 006: Profile enhancements
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'Coffee';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'GBP';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_metrics JSONB NOT NULL DEFAULT '[]'::jsonb;
</file>

<file path="types/database.ts">
export type ApplicationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'waitlisted'
  | 'withdrawn';

export type InfrastructureCategory =
  | 'pitch_fee'
  | 'travel'
  | 'equipment'
  | 'supplies'
  | 'other';

export type UnitStatus = 'active' | 'maintenance' | 'retired';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          business_name: string | null;
          push_token: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          business_name?: string | null;
          push_token?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_name?: string | null;
          push_token?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      units: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          registration: string | null;
          notes: string | null;
          status: UnitStatus;
          vehicle_type: string | null;
          height_m: number | null;
          length_m: number | null;
          width_m: number | null;
          mot_date: string | null;
          tax_date: string | null;
          service_date: string | null;
          service_interval: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          registration?: string | null;
          notes?: string | null;
          status?: UnitStatus;
          vehicle_type?: string | null;
          height_m?: number | null;
          length_m?: number | null;
          width_m?: number | null;
          mot_date?: string | null;
          tax_date?: string | null;
          service_date?: string | null;
          service_interval?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          registration?: string | null;
          notes?: string | null;
          status?: UnitStatus;
          vehicle_type?: string | null;
          height_m?: number | null;
          length_m?: number | null;
          width_m?: number | null;
          mot_date?: string | null;
          tax_date?: string | null;
          service_date?: string | null;
          service_interval?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      concessions_companies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          contact_name: string | null;
          email: string | null;
          phone: string | null;
          website: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          date: string;
          end_date: string | null;
          location: string;
          description: string | null;
          application_date: string | null;
          status: ApplicationStatus;
          notes: string | null;
          company_id: string | null;
          unit_id: string | null;
          overnight_stay: boolean;
          documents_uploaded: boolean;
          application_url: string | null;
          page_hash: string | null;
          url_last_checked_at: string | null;
          url_changed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          date: string;
          end_date?: string | null;
          location: string;
          description?: string | null;
          application_date?: string | null;
          status?: ApplicationStatus;
          notes?: string | null;
          company_id?: string | null;
          unit_id?: string | null;
          overnight_stay?: boolean;
          documents_uploaded?: boolean;
          application_url?: string | null;
          page_hash?: string | null;
          url_last_checked_at?: string | null;
          url_changed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          date?: string;
          end_date?: string | null;
          location?: string;
          description?: string | null;
          application_date?: string | null;
          status?: ApplicationStatus;
          notes?: string | null;
          company_id?: string | null;
          unit_id?: string | null;
          overnight_stay?: boolean;
          documents_uploaded?: boolean;
          application_url?: string | null;
          page_hash?: string | null;
          url_last_checked_at?: string | null;
          url_changed?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "concessions_companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          }
        ];
      };
      event_financials: {
        Row: {
          id: string;
          event_id: string;
          gross_sales: number;
          zero_rated_sales: number;
          standard_rated_sales: number;
          concessions_commission_pct: number;
          pitch_fee_refund_pct: number;
          cost_of_goods: number;
          pitch_fee: number;
          power_fee: number;
          travel_costs: number;
          camping_costs: number;
          equipment_costs: number;
          other_costs: number;
          staffing_costs: number;
          fresh_milk_litres: number;
          alt_milk_litres: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          gross_sales?: number;
          zero_rated_sales?: number;
          standard_rated_sales?: number;
          concessions_commission_pct?: number;
          pitch_fee_refund_pct?: number;
          cost_of_goods?: number;
          pitch_fee?: number;
          power_fee?: number;
          travel_costs?: number;
          camping_costs?: number;
          equipment_costs?: number;
          other_costs?: number;
          staffing_costs?: number;
          fresh_milk_litres?: number;
          alt_milk_litres?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          gross_sales?: number;
          zero_rated_sales?: number;
          standard_rated_sales?: number;
          concessions_commission_pct?: number;
          pitch_fee_refund_pct?: number;
          cost_of_goods?: number;
          pitch_fee?: number;
          power_fee?: number;
          travel_costs?: number;
          camping_costs?: number;
          equipment_costs?: number;
          other_costs?: number;
          staffing_costs?: number;
          fresh_milk_litres?: number;
          alt_milk_litres?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_financials_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: true;
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };
      staffing_entries: {
        Row: {
          id: string;
          event_id: string;
          staff_name: string;
          hours_worked: number;
          hourly_rate: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          staff_name: string;
          hours_worked: number;
          hourly_rate: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          staff_name?: string;
          hours_worked?: number;
          hourly_rate?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staffing_entries_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };
      infrastructure_items: {
        Row: {
          id: string;
          event_id: string;
          description: string;
          category: InfrastructureCategory;
          cost: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          description: string;
          category: InfrastructureCategory;
          cost: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          description?: string;
          category?: InfrastructureCategory;
          cost?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "infrastructure_items_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };
      uk_events_directory: {
        Row: {
          id: string;
          name: string;
          organiser: string | null;
          website: string | null;
          location: string | null;
          region: string | null;
          category: string | null;
          description: string | null;
          application_url: string | null;
          typical_dates: string | null;
          next_date: string | null;
          estimated_footfall: string | null;
          pitch_fee_range: string | null;
          events_managed: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          last_verified_at: string | null;
          application_changed: boolean;
          page_hash: string | null;
          source: string;
          featured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          organiser?: string | null;
          website?: string | null;
          location?: string | null;
          region?: string | null;
          category?: string | null;
          description?: string | null;
          application_url?: string | null;
          typical_dates?: string | null;
          next_date?: string | null;
          estimated_footfall?: string | null;
          pitch_fee_range?: string | null;
          events_managed?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          last_verified_at?: string | null;
          application_changed?: boolean;
          source?: string;
          featured?: boolean;
        };
        Update: {
          name?: string;
          organiser?: string | null;
          website?: string | null;
          location?: string | null;
          region?: string | null;
          category?: string | null;
          description?: string | null;
          application_url?: string | null;
          typical_dates?: string | null;
          next_date?: string | null;
          estimated_footfall?: string | null;
          pitch_fee_range?: string | null;
          events_managed?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          last_verified_at?: string | null;
          application_changed?: boolean;
          source?: string;
          featured?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      application_status: ApplicationStatus;
      infrastructure_category: InfrastructureCategory;
      unit_status: UnitStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
</file>

<file path="babel.config.js">
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
</file>

<file path="app/(tabs)/events/[id]/index.tsx">
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEvent, useDeleteEvent } from '@/lib/queries/events';
import { useCreateEvent } from '@/lib/mutations/events';
import { useAuth } from '@/lib/auth';
import { FinancialsCard } from '@/components/events/FinancialsCard';
import { WeatherCard } from '@/components/events/WeatherCard';
import { StaffingList } from '@/components/events/StaffingList';
import { InfrastructureList } from '@/components/events/InfrastructureList';
import { EventStatusBadge } from '@/components/shared/EventStatusBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatDateRange, formatDate, formatCurrency } from '@/lib/formatters';
import { STATUS_COLORS, STATUSES, STATUS_LABELS } from '@/constants';
import type { ApplicationStatus } from '@/types';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

// Application journey — ordered steps
const STATUS_JOURNEY: { status: ApplicationStatus; label: string }[] = [
  { status: 'pending',   label: 'Applied' },
  { status: 'waitlisted', label: 'Waitlisted' },
  { status: 'accepted',  label: 'Accepted' },
];

function ApplicationTimeline({ currentStatus }: { currentStatus: ApplicationStatus }) {
  if (currentStatus === 'rejected' || currentStatus === 'withdrawn') {
    return (
      <View className="bg-white rounded-2xl p-4 border border-slate-100 mb-4">
        <Text className="font-bold text-slate-700 mb-3">Application Journey</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: STATUS_COLORS[currentStatus].bgHex }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: STATUS_COLORS[currentStatus].dot, marginRight: 8 }} />
          <Text style={{ fontWeight: '600', fontSize: 14, color: STATUS_COLORS[currentStatus].textHex }}>
            Application {STATUS_LABELS[currentStatus]}
          </Text>
        </View>
      </View>
    );
  }

  const currentIdx = STATUS_JOURNEY.findIndex((s) => s.status === currentStatus);

  return (
    <View className="bg-white rounded-2xl p-4 border border-slate-100 mb-4">
      <Text className="font-bold text-slate-700 mb-3">Application Journey</Text>
      <View className="flex-row items-center">
        {STATUS_JOURNEY.map((step, i) => {
          const done = i <= currentIdx;
          const isCurrent = i === currentIdx;
          const isLast = i === STATUS_JOURNEY.length - 1;
          return (
            <React.Fragment key={step.status}>
              <View className="items-center">
                <View
                  className={`w-9 h-9 rounded-full items-center justify-center border-2 ${done ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-200'}`}
                >
                  {done ? (
                    <Text className="text-white font-bold text-sm">{isCurrent ? '●' : '✓'}</Text>
                  ) : (
                    <Text className="text-slate-300 text-xs">{i + 1}</Text>
                  )}
                </View>
                <Text className={`text-xs mt-1 font-medium ${isCurrent ? 'text-emerald-600' : done ? 'text-slate-600' : 'text-slate-300'}`}>
                  {step.label}
                </Text>
              </View>
              {!isLast && (
                <View className={`flex-1 h-0.5 mx-1 mb-4 ${i < currentIdx ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: event, isLoading, refetch } = useEvent(id);
  const deleteEvent = useDeleteEvent();
  const createEvent = useCreateEvent();
  const [refreshing, setRefreshing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleDelete() {
    try {
      await deleteEvent.mutateAsync(id);
      router.back();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete event');
    }
  }

  async function handleStatusChange(newStatus: ApplicationStatus) {
    setUpdatingStatus(true);
    const { error } = await supabase.from('events').update({ status: newStatus }).eq('id', id);
    if (error) {
      Alert.alert('Error', 'Could not update status. Please try again.');
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['events', id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    }
    setUpdatingStatus(false);
  }

  async function handleAcknowledgeChange() {
    await supabase.from('events').update({ url_changed: false }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['events', id] });
  }

  async function handleDuplicate() {
    if (!user || !event) return;
    setDuplicating(true);
    try {
      const newEvent = await createEvent.mutateAsync({
        userId: user.id,
        data: {
          name: `${event.name} (copy)`,
          date: new Date().toISOString().split('T')[0],
          end_date: null,
          location: event.location,
          description: event.description ?? '',
          application_date: null,
          application_url: event.application_url ?? '',
          status: 'pending',
          notes: event.notes ?? '',
          company_id: event.company_id ?? '',
          unit_ids: event.units?.map((u) => u.id) ?? [],
          overnight_stay: event.overnight_stay,
          documents_uploaded: false,
          gross_sales: 0,
          zero_rated_sales: 0,
          standard_rated_sales: 0,
          concessions_commission_pct: event.event_financials?.concessions_commission_pct ?? 0,
          pitch_fee_refund_pct: event.event_financials?.pitch_fee_refund_pct ?? 0,
          cost_of_goods: 0,
          pitch_fee: event.event_financials?.pitch_fee ?? 0,
          power_fee: event.event_financials?.power_fee ?? 0,
          travel_costs: event.event_financials?.travel_costs ?? 0,
          camping_costs: event.event_financials?.camping_costs ?? 0,
          equipment_costs: event.event_financials?.equipment_costs ?? 0,
          other_costs: event.event_financials?.other_costs ?? 0,
          staffing_costs: 0,
          fresh_milk_litres: 0,
          alt_milk_litres: 0,
          staffing_entries: [],
          infrastructure_items: [],
        },
      });
      router.replace(`/(tabs)/events/${newEvent.id}/edit`);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not duplicate event');
    } finally {
      setDuplicating(false);
    }
  }

  if (isLoading) return <LoadingSpinner message="Loading application..." />;
  if (!event) return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-slate-500">Event not found</Text>
    </View>
  );

  const dotColor = STATUS_COLORS[event.status]?.dot ?? '#94a3b8';

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white border-b border-slate-100">
        <View style={{ height: 4, backgroundColor: dotColor }} />
        <View className="px-4 pt-3 pb-4">
          <View className="flex-row items-center justify-between mb-2">
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back to applications"
              className="flex-row items-center"
            >
              <Text className="text-amber-500 font-semibold text-sm">‹ Applications</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/events/${id}/edit`)}
              accessibilityRole="button"
              accessibilityLabel="Edit event"
              className="bg-slate-900 px-4 py-1.5 rounded-xl"
            >
              <Text className="text-white font-semibold text-sm">Edit</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-xl font-bold text-slate-900 mb-2 leading-snug">{event.name}</Text>

          <View className="flex-row items-center flex-wrap gap-2 mb-1">
            <EventStatusBadge status={event.status} />
            <Text className="text-slate-500 text-sm">📅 {formatDateRange(event.date, event.end_date)}</Text>
          </View>
          <Text className="text-slate-500 text-sm">📍 {event.location}</Text>
          {event.concessions_companies && (
            <Text className="text-slate-400 text-xs mt-0.5">🏢 {event.concessions_companies.name}</Text>
          )}
          {event.units?.length > 0 && (
            <Text className="text-slate-400 text-xs mt-0.5">🚐 {event.units.map((u) => u.name).join(' · ')}</Text>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#f59e0b" />}
      >
        {/* URL change alert */}
        {event.url_changed && (
          <View className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-3">
                <Text className="font-bold text-orange-800 text-sm mb-1">⚡ Application page changed!</Text>
                <Text className="text-orange-700 text-xs leading-relaxed">
                  The application page was updated since your last check. It might show your acceptance or rejection decision.
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleAcknowledgeChange}
                accessibilityRole="button"
                accessibilityLabel="Dismiss page changed alert"
                className="bg-orange-100 px-2.5 py-1 rounded-lg"
              >
                <Text className="text-orange-700 text-xs font-semibold">Dismiss</Text>
              </TouchableOpacity>
            </View>
            {event.application_url && (
              <TouchableOpacity
                onPress={() => event.application_url && Linking.openURL(event.application_url)}
                className="mt-3 bg-orange-500 py-2.5 rounded-xl items-center"
              >
                <Text className="text-white font-semibold text-sm">Open Application Page ↗</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Post-event completion prompt */}
        {event.status === 'accepted' &&
          event.date < new Date().toISOString().split('T')[0] &&
          (!event.event_financials || event.event_financials.gross_sales === 0) && (
          <View style={{ backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 16, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 20 }}>📋</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: '#92400e', fontSize: 14 }}>Event has passed</Text>
              <Text style={{ color: '#b45309', fontSize: 12, marginTop: 2 }}>No sales figures entered yet — add the actuals to keep your reports accurate.</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/events/${id}/edit`)}
              accessibilityRole="button"
              accessibilityLabel="Add sales figures"
              style={{ backgroundColor: '#b45309', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}
            >
              <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>Add →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Application journey */}
        <ApplicationTimeline currentStatus={event.status} />

        {/* Quick status update */}
        <View className="bg-white rounded-2xl p-4 border border-slate-100 mb-4">
          <Text className="font-bold text-slate-700 mb-3">Update Status</Text>
          <View className="flex-row flex-wrap gap-2">
            {STATUSES.map((s) => {
              const colors = STATUS_COLORS[s];
              const active = event.status === s;
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => !active && handleStatusChange(s)}
                  disabled={updatingStatus || active}
                  accessibilityRole="radio"
                  accessibilityLabel={`Set status to ${STATUS_LABELS[s]}`}
                  accessibilityState={{ selected: active, disabled: updatingStatus || active }}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1,
                    backgroundColor: active ? colors.textHex : '#ffffff',
                    borderColor: active ? colors.textHex : '#e2e8f0',
                  }}
                >
                  <View style={{ backgroundColor: active ? '#ffffff' : colors.dot, width: 7, height: 7, borderRadius: 4, marginRight: 6 }} />
                  <Text style={{ fontSize: 12, fontWeight: '500', color: active ? '#ffffff' : '#4b5563' }}>{STATUS_LABELS[s]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Application URL quick access */}
        {event.application_url && (
          <TouchableOpacity
            onPress={() => event.application_url && Linking.openURL(event.application_url)}
            className="bg-white rounded-2xl p-4 border border-slate-100 mb-4 flex-row items-center"
            activeOpacity={0.7}
          >
            <Text className="text-2xl mr-3">🔗</Text>
            <View className="flex-1">
              <Text className="font-semibold text-slate-800 text-sm">Application Portal</Text>
              <Text className="text-slate-400 text-xs mt-0.5" numberOfLines={1}>
                {event.application_url}
              </Text>
            </View>
            <Text className="text-amber-500 font-semibold text-sm">Open ↗</Text>
          </TouchableOpacity>
        )}

        {/* Weather forecast */}
        {event.location && event.date && (
          <View className="mb-4">
            <WeatherCard
              location={event.location}
              startDate={event.date}
              endDate={event.end_date}
            />
          </View>
        )}

        {/* Financials */}
        {event.event_financials && (
          <View className="mb-4">
            <FinancialsCard financials={event.event_financials} calculations={event.calculations} />
          </View>
        )}

        {/* Staffing */}
        {event.staffing_entries?.length > 0 && (
          <View className="mb-4">
            <StaffingList entries={event.staffing_entries} />
          </View>
        )}

        {/* Infrastructure */}
        {event.infrastructure_items?.length > 0 && (
          <View className="mb-4">
            <InfrastructureList items={event.infrastructure_items} />
          </View>
        )}

        {/* Details */}
        <View className="bg-white rounded-2xl p-4 border border-slate-100 mb-4 gap-3">
          <Text className="font-bold text-slate-700">Details</Text>
          {event.application_date && (
            <View className="flex-row">
              <Text className="text-slate-400 text-sm w-32">Applied on</Text>
              <Text className="text-slate-700 text-sm font-medium">{formatDate(event.application_date)}</Text>
            </View>
          )}
          {event.overnight_stay && (
            <View className="flex-row items-center">
              <Text className="text-slate-400 text-sm w-32">Overnight stay</Text>
              <Text className="text-amber-700 text-sm font-medium">🌙 Yes</Text>
            </View>
          )}
          <View className="flex-row items-center">
            <Text className="text-slate-400 text-sm w-32">Docs uploaded</Text>
            <Text className={`text-sm font-medium ${event.documents_uploaded ? 'text-green-600' : 'text-slate-400'}`}>
              {event.documents_uploaded ? '✅ Yes' : '⏳ Not yet'}
            </Text>
          </View>
          {event.url_last_checked_at && (
            <View className="flex-row">
              <Text className="text-slate-400 text-sm w-32">Last checked</Text>
              <Text className="text-slate-700 text-sm">{formatDate(event.url_last_checked_at)}</Text>
            </View>
          )}
          {event.description && (
            <Text className="text-slate-600 text-sm leading-relaxed">{event.description}</Text>
          )}
          {event.notes && (
            <>
              <View className="border-t border-slate-50" />
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Notes</Text>
              <Text className="text-slate-600 text-sm leading-relaxed">{event.notes}</Text>
            </>
          )}
        </View>

        <View className="bg-white rounded-2xl p-4 border border-stone-100 mb-6 gap-3">
          <TouchableOpacity
            onPress={handleDuplicate}
            disabled={duplicating}
            accessibilityRole="button"
            accessibilityLabel="Duplicate event"
            accessibilityState={{ disabled: duplicating }}
            style={{ borderWidth: 1, borderColor: '#d6d3d1', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#57534e', fontWeight: '500', fontSize: 14 }}>
              {duplicating ? 'Duplicating…' : '📋 Duplicate Event'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'Delete Event',
                `Are you sure you want to delete "${event.name}"? This cannot be undone.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: handleDelete },
                ],
              )
            }
            className="border border-red-200 py-3 rounded-xl items-center"
          >
            <Text className="text-red-500 font-medium text-sm">Delete Event</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}
</file>

<file path="app/(tabs)/discover.tsx">
import React, { useState, useEffect, useMemo, startTransition } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  RefreshControl, Linking, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDiscoverEvents } from '@/lib/queries/discover';
import { useCompanies } from '@/lib/queries/companies';
import { useCreateEvent } from '@/lib/mutations/events';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { DiscoveredEvent } from '@/types';

const REGIONS = ['All UK', 'London', 'South East', 'South West', 'East of England', 'Midlands', 'West Midlands', 'North West', 'Yorkshire', 'North East', 'Scotland', 'Wales', 'National'];

const EVENT_CATEGORIES = ['All', 'Music Festival', 'Food Festival', 'Street Food Market', 'Christmas Market', 'Garden and Lifestyle', 'Motorsport', 'Equestrian'];
const COMPANY_CATEGORIES = ['All', 'Concessions Company', 'Industry Body'];

// Days since a date string
function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatRelativeTime(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Category badge colours — using explicit style objects to avoid NativeWind dynamic class issues
const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  'Music Festival':       { bg: '#f3e8ff', text: '#7e22ce' },
  'Food Festival':        { bg: '#ffedd5', text: '#c2410c' },
  'Street Food Market':   { bg: '#dcfce7', text: '#15803d' },
  'Christmas Market':     { bg: '#fee2e2', text: '#b91c1c' },
  'Garden and Lifestyle': { bg: '#d1fae5', text: '#065f46' },
  'Motorsport':           { bg: '#dbeafe', text: '#1d4ed8' },
  'Equestrian':           { bg: '#fef3c7', text: '#92400e' },
};
const DEFAULT_CATEGORY_STYLE = { bg: '#f1f5f9', text: '#475569' };

function VerifiedBadge({ lastVerifiedAt }: { lastVerifiedAt: string | null }) {
  const days = daysSince(lastVerifiedAt);
  if (days === null) return null;
  const fresh = days <= 7;
  const stale = days > 30;
  const bgColor = fresh ? '#dcfce7' : stale ? '#ffedd5' : '#f1f5f9';
  const textColor = fresh ? '#15803d' : stale ? '#c2410c' : '#64748b';
  return (
    <View style={{ backgroundColor: bgColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
      <Text style={{ color: textColor, fontSize: 11, fontWeight: '500' }}>
        {fresh ? `Verified ${days}d ago` : stale ? `Check needed (${days}d)` : `Verified ${days}d ago`}
      </Text>
    </View>
  );
}

function EventCard({ event, onAdd, adding }: { event: DiscoveredEvent; onAdd: (e: DiscoveredEvent) => void; adding: boolean }) {
  const catStyle = CATEGORY_STYLES[event.category] ?? DEFAULT_CATEGORY_STYLE;

  return (
    <View className="bg-white rounded-2xl mb-3 border border-slate-100 overflow-hidden">
      <View className="h-1 bg-amber-400" />
      <View className="p-4">
        {event.featured && (
          <View style={{ alignSelf: 'flex-start', backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12, marginBottom: 8 }}>
            <Text style={{ color: '#b45309', fontSize: 12, fontWeight: '600' }}>⭐ Featured</Text>
          </View>
        )}

        <View className="flex-row items-start justify-between mb-2">
          <Text className="font-bold text-slate-900 text-base leading-snug flex-1 mr-3" numberOfLines={2}>
            {event.title}
          </Text>
          <View style={{ backgroundColor: catStyle.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
            <Text style={{ color: catStyle.text, fontSize: 11, fontWeight: '500' }}>{event.category}</Text>
          </View>
        </View>

        {event.organiser && (
          <Text className="text-slate-400 text-xs mb-2">Organised by {event.organiser}</Text>
        )}

        <Text className="text-slate-600 text-sm leading-relaxed mb-3" numberOfLines={3}>
          {event.description}
        </Text>

        <View className="flex-row flex-wrap gap-1.5 mb-3">
          {event.location && (
            <View className="bg-slate-50 px-2.5 py-1 rounded-full">
              <Text className="text-slate-500 text-xs">📍 {event.location}</Text>
            </View>
          )}
          {event.dateHint && (
            <View className="bg-slate-50 px-2.5 py-1 rounded-full">
              <Text className="text-slate-500 text-xs">📅 {event.dateHint}</Text>
            </View>
          )}
          {event.estimatedFootfall && (
            <View className="bg-slate-50 px-2.5 py-1 rounded-full">
              <Text className="text-slate-500 text-xs">👥 {event.estimatedFootfall}</Text>
            </View>
          )}
          {event.pitchFeeRange && (
            <View className="bg-slate-50 px-2.5 py-1 rounded-full">
              <Text className="text-slate-500 text-xs">💷 {event.pitchFeeRange}</Text>
            </View>
          )}
        </View>

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => { if (event.url) Linking.openURL(event.url); }}
            className="flex-1 border border-slate-200 py-2.5 rounded-xl items-center"
          >
            <Text className="text-slate-600 font-medium text-sm">View & Apply ↗</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onAdd(event)}
            disabled={adding}
            className="flex-1 bg-amber-500 py-2.5 rounded-xl items-center"
          >
            {adding ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-semibold text-sm">+ Track It</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function CompanyCard({ company }: { company: DiscoveredEvent }) {
  const isIndustryBody = company.category === 'Industry Body';

  return (
    <View className="bg-white rounded-2xl mb-3 border border-slate-100 overflow-hidden">
      <View style={{ height: 6, backgroundColor: isIndustryBody ? '#94a3b8' : '#10b981' }} />
      <View className="p-4">
        <View className="flex-row items-start justify-between mb-1">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center gap-2 flex-wrap mb-0.5">
              {company.featured && (
                <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                  <Text style={{ color: '#b45309', fontSize: 11, fontWeight: '600' }}>⭐ Major</Text>
                </View>
              )}
              {company.applicationChanged && (
                <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                  <Text style={{ color: '#15803d', fontSize: 11, fontWeight: '600' }}>🆕 Page Updated</Text>
                </View>
              )}
            </View>
            <Text className="font-bold text-slate-900 text-base leading-snug">{company.title}</Text>
          </View>
          <View style={{ backgroundColor: isIndustryBody ? '#f1f5f9' : '#d1fae5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
            <Text style={{ color: isIndustryBody ? '#475569' : '#065f46', fontSize: 11, fontWeight: '500' }}>
              {isIndustryBody ? 'Industry Body' : 'Concessions Co.'}
            </Text>
          </View>
        </View>

        <Text className="text-slate-600 text-sm leading-relaxed mb-3">{company.description}</Text>

        {company.eventsManaged && (
          <View className="bg-slate-50 rounded-xl p-3 mb-3">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Events They Run</Text>
            <Text className="text-slate-700 text-sm leading-relaxed">{company.eventsManaged}</Text>
          </View>
        )}

        <View className="flex-row flex-wrap gap-2 mb-3">
          {company.location && (
            <View className="bg-slate-50 px-2.5 py-1 rounded-full">
              <Text className="text-slate-500 text-xs">📍 {company.location}</Text>
            </View>
          )}
          {company.pitchFeeRange && (
            <View className="bg-slate-50 px-2.5 py-1 rounded-full">
              <Text className="text-slate-500 text-xs">💷 {company.pitchFeeRange}</Text>
            </View>
          )}
          {company.contactPhone && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${company.contactPhone}`)}
              className="bg-blue-50 px-2.5 py-1 rounded-full"
            >
              <Text className="text-blue-600 text-xs font-medium">📞 {company.contactPhone}</Text>
            </TouchableOpacity>
          )}
          {company.contactEmail && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`mailto:${company.contactEmail}`)}
              className="bg-blue-50 px-2.5 py-1 rounded-full"
            >
              <Text className="text-blue-600 text-xs font-medium">✉️ {company.contactEmail}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row items-center justify-between">
          <VerifiedBadge lastVerifiedAt={company.lastVerifiedAt} />
          <TouchableOpacity
            onPress={() => { if (company.url) Linking.openURL(company.url); }}
            className="bg-emerald-500 px-4 py-2.5 rounded-xl"
          >
            <Text className="text-white font-semibold text-sm">Apply Now ↗</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'events' | 'apply'>('apply');
  const [searchText, setSearchText] = useState('');
  const [region, setRegion] = useState('All UK');
  const [category, setCategory] = useState('All');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    supabase
      .from('uk_events_directory')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.updated_at) setLastSynced(new Date(data.updated_at));
      });
  }, []);

  const { data: allResults = [], isLoading, refetch, error } = useDiscoverEvents({});
  const { data: companies = [] } = useCompanies();
  const createEvent = useCreateEvent();

  const events = useMemo(() => allResults.filter((r) => !r.isCompany), [allResults]);
  const concessionsCos = useMemo(() => allResults.filter((r) => r.isCompany), [allResults]);

  const filteredEvents = useMemo(() => {
    let results = events;
    if (region !== 'All UK') {
      results = results.filter((e) =>
        e.region?.toLowerCase().includes(region.toLowerCase()) ||
        e.location?.toLowerCase().includes(region.toLowerCase())
      );
    }
    if (category !== 'All') {
      results = results.filter((e) => e.category?.toLowerCase() === category.toLowerCase());
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      results = results.filter((e) =>
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.organiser?.toLowerCase().includes(q)
      );
    }
    return results;
  }, [events, region, category, searchText]);

  const filteredCompanies = useMemo(() => {
    let results = concessionsCos;
    if (category !== 'All') {
      results = results.filter((c) => c.category?.toLowerCase() === category.toLowerCase());
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      results = results.filter((c) =>
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.eventsManaged?.toLowerCase().includes(q) ||
        c.organiser?.toLowerCase().includes(q)
      );
    }
    // Featured first, then alphabetical
    return [...results].sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [concessionsCos, category, searchText]);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await supabase.functions.invoke('sync-directory', { body: {} });
      // Re-fetch data after sync
      await refetch();
      // Update last synced
      setLastSynced(new Date());
    } catch {
      // silently ignore - edge function may not exist in dev
    } finally {
      setSyncing(false);
    }
  }

  async function handleAddEvent(discovered: DiscoveredEvent) {
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in to track events.');
      return;
    }
    setAddingId(discovered.id);
    try {
      const firstWord = discovered.organiser?.toLowerCase().split(' ')[0] ?? '';
      const matchedCompany = companies.find((c) =>
        (discovered.source && c.website?.toLowerCase().includes(discovered.source.toLowerCase())) ||
        (firstWord && c.name.toLowerCase().includes(firstWord))
      );
      const eventName = discovered.title.length > 80 ? discovered.title.slice(0, 80) : discovered.title;
      await createEvent.mutateAsync({
        userId: user.id,
        data: {
          name: eventName,
          date: new Date().toISOString().split('T')[0],
          location: discovered.location ?? '',
          status: 'pending',
          description: discovered.description ?? '',
          application_url: discovered.url ?? '',
          company_id: matchedCompany?.id ?? '',
          notes: `Discovered via Brewed Discover — ${discovered.organiser ?? discovered.source}`,
          // Financial defaults
          gross_sales: 0,
          zero_rated_sales: 0,
          standard_rated_sales: 0,
          concessions_commission_pct: 0,
          pitch_fee_refund_pct: 0,
          cost_of_goods: 0,
          pitch_fee: 0,
          power_fee: 0,
          travel_costs: 0,
          camping_costs: 0,
          equipment_costs: 0,
          other_costs: 0,
          staffing_costs: 0,
          fresh_milk_litres: 0,
          alt_milk_litres: 0,
          // Flags
          overnight_stay: false,
          documents_uploaded: false,
          // Arrays
          staffing_entries: [],
          infrastructure_items: [],
        },
      });
      Alert.alert(
        'Added!',
        `"${eventName.slice(0, 50)}" added to your events as Pending. Update the date and details when ready.`,
        [{ text: 'Done' }, { text: 'View Events', onPress: () => router.push('/(tabs)/events') }]
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not add event';
      Alert.alert('Error', msg);
    } finally {
      setAddingId(null);
    }
  }

  const currentCategories = activeTab === 'events' ? EVENT_CATEGORIES : COMPANY_CATEGORIES;
  const currentCount = activeTab === 'events' ? filteredEvents.length : filteredCompanies.length;

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-4 pt-3 pb-3 border-b border-slate-100">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View>
            <Text className="text-2xl font-bold text-slate-900">Discover</Text>
            {lastSynced && (
              <Text className="text-stone-400 text-xs">
                Last synced: {formatRelativeTime(lastSynced)}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={handleSync}
            disabled={syncing}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f5f5f4', borderWidth: 1, borderColor: '#e7e5e4' }}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#78716c" />
            ) : (
              <Text style={{ color: '#57534e', fontSize: 13, fontWeight: '500' }}>↻ Refresh</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tab switcher */}
        <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => startTransition(() => { setActiveTab('apply'); setCategory('All'); })}
            style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: activeTab === 'apply' ? '#ffffff' : 'transparent' }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: activeTab === 'apply' ? '#0f172a' : '#94a3b8' }}>
              Who to Apply To
            </Text>
            <Text style={{ fontSize: 12, color: activeTab === 'apply' ? '#10b981' : '#94a3b8' }}>
              {concessionsCos.length} companies
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => startTransition(() => { setActiveTab('events'); setCategory('All'); })}
            style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: activeTab === 'events' ? '#ffffff' : 'transparent' }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: activeTab === 'events' ? '#0f172a' : '#94a3b8' }}>
              Events & Festivals
            </Text>
            <Text style={{ fontSize: 12, color: activeTab === 'events' ? '#f59e0b' : '#94a3b8' }}>
              {events.length} events
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View className="flex-row items-center bg-slate-100 rounded-xl px-3 py-2.5 mb-3">
          <Text className="text-slate-400 mr-2">🔍</Text>
          <TextInput
            className="flex-1 text-slate-900 text-sm"
            placeholder={activeTab === 'apply' ? 'Search concessions companies...' : 'Search festivals, markets...'}
            placeholderTextColor="#94a3b8"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Text className="text-slate-400 text-lg">×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Region filter — only for events tab */}
        {activeTab === 'events' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 6 }}>
            {REGIONS.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRegion(r)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1,
                  backgroundColor: region === r ? '#1e293b' : '#fff',
                  borderColor: region === r ? '#1e293b' : '#e2e8f0',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '500', color: region === r ? '#fff' : '#475569' }}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {currentCategories.map((c) => {
            const active = category === c;
            const activeColor = activeTab === 'apply' ? '#10b981' : '#f59e0b';
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setCategory(c)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1,
                  backgroundColor: active ? activeColor : '#fff',
                  borderColor: active ? activeColor : '#e2e8f0',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '500', color: active ? '#fff' : '#475569' }}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text className="text-slate-500 text-sm">Loading directory...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-3">⚠️</Text>
          <Text className="font-semibold text-slate-700 text-center mb-2">Could not load directory</Text>
          <Text className="text-slate-400 text-xs text-center mb-1">
            {error instanceof Error ? error.message : 'Database error'}
          </Text>
          <Text className="text-slate-400 text-xs text-center mb-4">
            Run the Migration 003 SQL in your Supabase dashboard, then tap Retry.
          </Text>
          <TouchableOpacity onPress={() => refetch()} className="mt-2 bg-amber-500 px-6 py-3 rounded-xl">
            <Text className="text-white font-semibold text-sm">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#f59e0b" />}
        >
          <Text className="text-slate-400 text-xs mb-3">{currentCount} {activeTab === 'apply' ? 'companies' : 'events'} found</Text>

          {currentCount === 0 ? (
            <View className="items-center py-16 px-6">
              <Text className="text-4xl mb-3">{activeTab === 'apply' ? '🏢' : '🔍'}</Text>
              <Text className="font-semibold text-slate-700 text-center text-base">Nothing matches your search</Text>
              <TouchableOpacity
                onPress={() => { setSearchText(''); setRegion('All UK'); setCategory('All'); }}
                className="mt-4 border border-slate-200 px-5 py-2.5 rounded-xl"
              >
                <Text className="text-slate-600 font-medium text-sm">Clear filters</Text>
              </TouchableOpacity>
            </View>
          ) : activeTab === 'apply' ? (
            <>
              <View className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-4 flex-row items-start">
                <Text className="text-lg mr-2">💡</Text>
                <Text className="text-emerald-800 text-xs leading-relaxed flex-1">
                  Tap <Text className="font-semibold">Apply Now</Text> to go straight to each company's application page. Companies with a <Text className="font-semibold">🆕 Page Updated</Text> badge have had changes to their trader portal recently.
                </Text>
              </View>
              {filteredCompanies.map((company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </>
          ) : (
            filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onAdd={handleAddEvent}
                adding={addingId === event.id}
              />
            ))
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}
</file>

<file path="components/events/EventForm.tsx">
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Switch, Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { format, parseISO, isValid } from 'date-fns';
import { useForm, Controller, useFieldArray, Control, UseFormWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { eventSchema } from '@/lib/validations/event.schema';
import type { EventFormValues } from '@/lib/validations/event.schema';
import { FormField } from '@/components/shared/FormField';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { formatCurrency } from '@/lib/formatters';
import {
  STATUSES, STATUS_LABELS, STATUS_COLORS,
  INFRASTRUCTURE_CATEGORIES, INFRASTRUCTURE_CATEGORY_LABELS,
  UNIT_STATUS_COLORS,
} from '@/constants';
import type { ConcessionsCompany, ApplicationStatus, InfrastructureCategory, Unit } from '@/types';

const TABS = ['Details', 'Financials', 'Staffing', 'Costs', 'Notes'] as const;

/** Convert DD/MM/YYYY → YYYY-MM-DD. Passes through ISO dates and empty strings unchanged. */
function ukToIso(val: string | undefined | null): string {
  if (!val) return '';
  const match = val.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  return val;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 mb-1">
      {title}
    </Text>
  );
}

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function daysInMonth(month1based: number, year: number): number {
  return new Date(year, month1based, 0).getDate();
}

function WheelColumn({
  items,
  initialIndex,
  onChange,
}: {
  items: (string | number)[];
  initialIndex: number;
  onChange: (index: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [selectedIdx, setSelectedIdx] = useState(Math.max(0, Math.min(initialIndex, items.length - 1)));

  useEffect(() => {
    const safeIdx = Math.max(0, Math.min(initialIndex, items.length - 1));
    setSelectedIdx(safeIdx);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: safeIdx * ITEM_HEIGHT, animated: false });
    }, 200);
  }, [initialIndex, items.length]);

  function handleScrollEnd(y: number) {
    const idx = Math.max(0, Math.min(Math.round(y / ITEM_HEIGHT), items.length - 1));
    setSelectedIdx(idx);
    onChange(idx);
  }

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      {/* Selection highlight band */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', top: ITEM_HEIGHT * 2, left: 4, right: 4,
          height: ITEM_HEIGHT, backgroundColor: '#f1f5f9', borderRadius: 10,
        }}
      />
      <ScrollView
        ref={scrollRef}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
        onMomentumScrollEnd={(e) => handleScrollEnd(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => handleScrollEnd(e.nativeEvent.contentOffset.y)}
      >
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => {
              setSelectedIdx(index);
              onChange(index);
              scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
            }}
            activeOpacity={0.6}
          >
            <Text style={{
              fontSize: selectedIdx === index ? 17 : 15,
              fontWeight: selectedIdx === index ? '600' : '400',
              color: selectedIdx === index ? '#0f172a' : '#94a3b8',
            }}>
              {String(item)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function DatePickerModal({
  visible, value, onConfirm, onClose,
}: {
  visible: boolean; value: string; onConfirm: (iso: string) => void; onClose: () => void;
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 5 + i);

  const [dayIdx, setDayIdx] = useState(now.getDate() - 1);
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [yearIdx, setYearIdx] = useState(5);

  useEffect(() => {
    if (!visible) return;
    const p = (() => {
      if (!value) return now;
      try { const d = parseISO(value); return isValid(d) ? d : now; }
      catch { return now; }
    })();
    const yi = years.indexOf(p.getFullYear());
    setDayIdx(p.getDate() - 1);
    setMonthIdx(p.getMonth());
    setYearIdx(yi >= 0 ? yi : 5);
  }, [visible]);

  const numDays = daysInMonth(monthIdx + 1, years[yearIdx]);
  const days = Array.from({ length: numDays }, (_, i) => i + 1);
  const clampedDayIdx = Math.min(dayIdx, numDays - 1);

  function handleConfirm() {
    const year = years[yearIdx];
    const month = monthIdx + 1;
    const day = Math.min(dayIdx + 1, daysInMonth(month, year));
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onConfirm(iso);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 16, color: '#64748b' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 36 }}>
            <WheelColumn
              key={`day-${monthIdx}-${yearIdx}`}
              items={days}
              initialIndex={clampedDayIdx}
              onChange={(idx) => setDayIdx(idx)}
            />
            <WheelColumn
              key="month"
              items={MONTHS_SHORT}
              initialIndex={monthIdx}
              onChange={(idx) => setMonthIdx(idx)}
            />
            <WheelColumn
              key="year"
              items={years}
              initialIndex={yearIdx}
              onChange={(idx) => setYearIdx(idx)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DatePickerButton({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  const displayText = value
    ? (() => { try { const d = parseISO(value); return isValid(d) ? format(d, 'd MMM yyyy') : value; } catch { return value; } })()
    : '';

  return (
    <View>
      <Text className="text-slate-600 text-sm font-semibold mb-1.5">
        {label}{required && <Text className="text-red-500"> *</Text>}
      </Text>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
          paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#ffffff',
        }}
      >
        <Text style={{ color: displayText ? '#0f172a' : '#94a3b8', fontSize: 15 }}>
          {displayText || 'Select date'}
        </Text>
        <Text style={{ fontSize: 16 }}>📅</Text>
      </TouchableOpacity>
      <DatePickerModal
        visible={show}
        value={value}
        onConfirm={onChange}
        onClose={() => setShow(false)}
      />
    </View>
  );
}

function CalcRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View className="flex-row justify-between items-center py-1">
      <Text className={`text-xs ${highlight ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
        {label}
      </Text>
      <Text className={`text-xs font-semibold ${highlight ? 'text-slate-900' : 'text-slate-600'}`}>
        {value}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// FINANCIALS TAB SUB-COMPONENT
// ─────────────────────────────────────────────────────────────
function FinancialsTabContent({
  control,
  watch,
}: {
  control: Control<EventFormValues>;
  watch: UseFormWatch<EventFormValues>;
}) {
  const zeroRated = watch('zero_rated_sales') ?? 0;
  const standardRated = watch('standard_rated_sales') ?? 0;
  const commissionPct = watch('concessions_commission_pct') ?? 0;
  const pitchFee = watch('pitch_fee') ?? 0;
  const refundPct = watch('pitch_fee_refund_pct') ?? 0;
  const powerFee = watch('power_fee') ?? 0;

  const standardRatedNet = standardRated / 1.2;
  const vatCollected = standardRated - standardRatedNet;
  const totalNetSales = zeroRated + standardRatedNet;

  const commissionAmount = totalNetSales * (commissionPct / 100);
  const pitchFeeRefundGross = pitchFee * (refundPct / 100);
  const netRefund = pitchFeeRefundGross - commissionAmount;
  const effectivePitchFee = pitchFee - pitchFeeRefundGross + commissionAmount + powerFee;

  return (
    <View className="gap-4">
      <View className="bg-amber-50 rounded-xl p-3 border border-amber-100">
        <Text className="text-amber-800 text-sm font-medium mb-0.5">Recording financials</Text>
        <Text className="text-amber-700 text-xs">
          Fill in after the event. Profit is calculated on net (ex-VAT) sales.
        </Text>
      </View>

      {/* ── SALES & VAT ── */}
      <SectionHeader title="Sales & VAT" />
      <View className="bg-white rounded-xl p-4 border border-slate-100 gap-3">
        <Controller
          control={control}
          name="standard_rated_sales"
          render={({ field }) => (
            <CurrencyInput
              label="Hot drinks & food — 20% VAT"
              value={field.value}
              onChangeValue={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="zero_rated_sales"
          render={({ field }) => (
            <CurrencyInput
              label="Cold drinks — 0% VAT"
              value={field.value}
              onChangeValue={field.onChange}
            />
          )}
        />
        {(zeroRated > 0 || standardRated > 0) && (
          <View className="bg-slate-50 rounded-lg p-3 mt-1 gap-0.5">
            <CalcRow label="Standard-rated ex-VAT" value={formatCurrency(standardRatedNet)} />
            <CalcRow label="VAT collected (20%)" value={formatCurrency(vatCollected)} />
            <CalcRow
              label="Total net sales (ex-VAT)"
              value={formatCurrency(totalNetSales)}
              highlight
            />
          </View>
        )}
      </View>

      {/* ── CONCESSIONS COMPANY ── */}
      <SectionHeader title="Concessions Company / Organiser" />
      <View className="bg-white rounded-xl p-4 border border-slate-100 gap-3">
        <Controller
          control={control}
          name="concessions_commission_pct"
          render={({ field }) => (
            <FormField
              label="Commission % (taken on net sales ex-VAT)"
              value={field.value ? String(field.value) : ''}
              onChangeText={(t) => field.onChange(parseFloat(t) || 0)}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          )}
        />
        <Controller
          control={control}
          name="pitch_fee"
          render={({ field }) => (
            <CurrencyInput
              label="Pitch fee paid upfront"
              value={field.value}
              onChangeValue={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="pitch_fee_refund_pct"
          render={({ field }) => (
            <FormField
              label="Pitch fee refund % (before commission deduction)"
              value={field.value ? String(field.value) : ''}
              onChangeText={(t) => field.onChange(parseFloat(t) || 0)}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          )}
        />
        <Controller
          control={control}
          name="power_fee"
          render={({ field }) => (
            <CurrencyInput
              label="Power / site fee"
              value={field.value}
              onChangeValue={field.onChange}
            />
          )}
        />
        {(pitchFee > 0 || commissionPct > 0 || powerFee > 0) && (
          <View className="bg-slate-50 rounded-lg p-3 mt-1 gap-0.5">
            <CalcRow
              label={`Commission (${commissionPct}% × net sales)`}
              value={formatCurrency(commissionAmount)}
            />
            <CalcRow
              label={`Pitch fee refund gross (${refundPct}%)`}
              value={formatCurrency(pitchFeeRefundGross)}
            />
            <CalcRow
              label="Commission deducted from refund"
              value={`-${formatCurrency(commissionAmount)}`}
            />
            <CalcRow
              label="Net refund received"
              value={formatCurrency(Math.max(0, netRefund))}
            />
            {netRefund < 0 && (
              <CalcRow
                label="Extra commission owed"
                value={formatCurrency(Math.abs(netRefund))}
              />
            )}
            {powerFee > 0 && (
              <CalcRow
                label="Power / site fee"
                value={formatCurrency(powerFee)}
              />
            )}
            <CalcRow
              label="Total site cost"
              value={formatCurrency(Math.max(0, effectivePitchFee))}
              highlight
            />
          </View>
        )}
      </View>

      {/* ── YOUR OTHER COSTS ── */}
      <SectionHeader title="Your Other Costs" />
      <View className="bg-white rounded-xl p-4 border border-slate-100 gap-3">
        <Controller
          control={control}
          name="cost_of_goods"
          render={({ field }) => (
            <CurrencyInput
              label="Cost of Goods / COGS (stock, ingredients)"
              value={field.value}
              onChangeValue={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="staffing_costs"
          render={({ field }) => (
            <CurrencyInput
              label="Staffing Total (or use Staffing tab)"
              value={field.value}
              onChangeValue={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="travel_costs"
          render={({ field }) => (
            <CurrencyInput
              label="Travel & Fuel"
              value={field.value}
              onChangeValue={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="camping_costs"
          render={({ field }) => (
            <CurrencyInput
              label="Camping Costs"
              value={field.value}
              onChangeValue={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="equipment_costs"
          render={({ field }) => (
            <CurrencyInput
              label="Equipment & Hire"
              value={field.value}
              onChangeValue={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="other_costs"
          render={({ field }) => (
            <CurrencyInput
              label="Other Costs"
              value={field.value}
              onChangeValue={field.onChange}
              placeholder="packaging, ice, gas..."
            />
          )}
        />
      </View>

      {/* ── MILK & CONSUMABLES ── */}
      <SectionHeader title="Milk & Consumables" />
      <View className="bg-white rounded-xl p-4 border border-slate-100 gap-3">
        <Controller
          control={control}
          name="fresh_milk_litres"
          render={({ field }) => (
            <FormField
              label="Fresh Milk (litres)"
              value={field.value ? String(field.value) : ''}
              onChangeText={(t) => field.onChange(parseFloat(t) || 0)}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          )}
        />
        <Controller
          control={control}
          name="alt_milk_litres"
          render={({ field }) => (
            <FormField
              label="Alternative Milk (litres)"
              value={field.value ? String(field.value) : ''}
              onChangeText={(t) => field.onChange(parseFloat(t) || 0)}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          )}
        />
        <View className="bg-blue-50 rounded-xl px-3 py-2.5">
          <Text className="text-blue-700 text-xs">
            💡 Milk usage is tracked on the dashboard for stock planning.
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// PROPS & MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
interface Props {
  defaultValues?: Partial<EventFormValues>;
  companies: ConcessionsCompany[];
  units: Unit[];
  onSubmit: (data: EventFormValues) => Promise<void>;
  submitLabel?: string;
}

export function EventForm({
  defaultValues,
  companies,
  units,
  onSubmit,
  submitLabel = 'Save Application',
}: Props) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Details');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema) as any,
    defaultValues: {
      name: '',
      date: '',
      end_date: '',
      location: '',
      description: '',
      application_date: '',
      status: 'pending',
      notes: '',
      company_id: '',
      unit_ids: [],
      application_url: '',
      overnight_stay: false,
      documents_uploaded: false,
      gross_sales: 0,
      zero_rated_sales: 0,
      standard_rated_sales: 0,
      concessions_commission_pct: 0,
      pitch_fee_refund_pct: 0,
      cost_of_goods: 0,
      pitch_fee: 0,
      power_fee: 0,
      travel_costs: 0,
      camping_costs: 0,
      equipment_costs: 0,
      other_costs: 0,
      staffing_costs: 0,
      fresh_milk_litres: 0,
      alt_milk_litres: 0,
      staffing_entries: [],
      infrastructure_items: [],
      ...defaultValues,
    },
  });

  const { fields: staffFields, append: appendStaff, remove: removeStaff } = useFieldArray({
    control,
    name: 'staffing_entries',
  });
  const { fields: infraFields, append: appendInfra, remove: removeInfra } = useFieldArray({
    control,
    name: 'infrastructure_items',
  });

  const selectedStatus = watch('status') as ApplicationStatus;
  const selectedCompanyId = watch('company_id');
  const selectedUnitIds = (watch('unit_ids') ?? []) as string[];

  async function handleFormSubmit(data: EventFormValues) {
    setLoading(true);
    try {
      const converted = {
        ...data,
        date: ukToIso(data.date),
        end_date: data.end_date ? ukToIso(data.end_date) : data.end_date,
        application_date: data.application_date
          ? ukToIso(data.application_date)
          : data.application_date,
      };
      await onSubmit(converted);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Failed to save. Check your connection and try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* Tab bar */}
      <View className="bg-white border-b border-slate-100">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 4 }}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full ${
                activeTab === tab ? 'bg-slate-900' : 'bg-slate-100'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  activeTab === tab ? 'text-white' : 'text-slate-800'
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView className="flex-1 px-4 pt-5" keyboardShouldPersistTaps="handled">

        {/* ══════════════════════════════════════════
            DETAILS TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'Details' && (
          <View className="gap-4">
            {/* Name */}
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <FormField
                  label="Event / Market Name"
                  required
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.name?.message}
                  placeholder="Brighton Food Festival 2025"
                />
              )}
            />

            {/* Dates — side by side */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="date"
                  render={({ field }) => (
                    <DatePickerButton
                      label="Start Date"
                      required
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="end_date"
                  render={({ field }) => (
                    <DatePickerButton
                      label="End Date"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </View>
            </View>

            {/* Location */}
            <Controller
              control={control}
              name="location"
              render={({ field }) => (
                <FormField
                  label="Location"
                  required
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.location?.message}
                  placeholder="Brighton, East Sussex"
                />
              )}
            />

            {/* Applied On */}
            <Controller
              control={control}
              name="application_date"
              render={({ field }) => (
                <DatePickerButton
                  label="Applied On"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />

            {/* Application URL */}
            <Controller
              control={control}
              name="application_url"
              render={({ field }) => (
                <FormField
                  label="Application Portal URL"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  placeholder="https://organiser.com/apply"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              )}
            />
            <View className="bg-blue-50 rounded-xl px-3 py-2.5 -mt-2">
              <Text className="text-blue-700 text-xs">
                💡 Save the URL and the app will alert you if the page changes — useful for spotting
                when decisions are published.
              </Text>
            </View>

            {/* Unit selector — multi-select */}
            {units.length > 0 && (
              <View>
                <Text className="text-slate-600 text-sm font-semibold mb-2">Units / Vehicles</Text>
                <Text className="text-slate-400 text-xs mb-2">Select all units attending this event</Text>
                <View className="flex-row flex-wrap gap-2">
                  {units.map((u) => {
                    const active = selectedUnitIds.includes(u.id);
                    return (
                      <TouchableOpacity
                        key={u.id}
                        onPress={() => {
                          const current = selectedUnitIds;
                          setValue(
                            'unit_ids',
                            active ? current.filter((id) => id !== u.id) : [...current, u.id],
                          );
                        }}
                        style={{
                          flexDirection: 'row', alignItems: 'center',
                          paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
                          borderWidth: 1,
                          backgroundColor: active ? '#1e293b' : '#ffffff',
                          borderColor: active ? '#1e293b' : '#e2e8f0',
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '500', color: active ? '#ffffff' : '#374151' }}>
                          {u.name}
                        </Text>
                        {u.registration ? (
                          <Text style={{ fontSize: 11, marginLeft: 6, color: active ? '#94a3b8' : '#9ca3af' }}>
                            {u.registration}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {selectedUnitIds.length > 0 && (
                  <TouchableOpacity onPress={() => setValue('unit_ids', [])} className="mt-2">
                    <Text className="text-slate-400 text-xs">Clear selection</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Application Status selector */}
            <View>
              <Text className="text-slate-600 text-sm font-semibold mb-2">
                Application Status <Text className="text-red-500">*</Text>
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {STATUSES.map((s) => {
                  const colors = STATUS_COLORS[s];
                  const active = selectedStatus === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setValue('status', s)}
                      style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
                        borderWidth: 1,
                        backgroundColor: active ? colors.textHex : '#ffffff',
                        borderColor: active ? colors.textHex : '#e2e8f0',
                      }}
                    >
                      <View
                        style={{ backgroundColor: active ? '#ffffff' : colors.dot, width: 7, height: 7, borderRadius: 4, marginRight: 6 }}
                      />
                      <Text style={{ fontSize: 14, fontWeight: '500', color: active ? '#ffffff' : '#4b5563' }}>
                        {STATUS_LABELS[s]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Concessions Company selector */}
            <View>
              <Text className="text-slate-600 text-sm font-semibold mb-2">
                Concessions Company / Organiser
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() => setValue('company_id', '')}
                  className={`px-3 py-1.5 rounded-xl border ${
                    !selectedCompanyId
                      ? 'bg-slate-900 border-slate-900'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      !selectedCompanyId ? 'text-white font-medium' : 'text-slate-500'
                    }`}
                  >
                    None
                  </Text>
                </TouchableOpacity>
                {companies.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setValue('company_id', c.id)}
                    className={`px-3 py-1.5 rounded-xl border ${
                      selectedCompanyId === c.id
                        ? 'bg-slate-900 border-slate-900'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        selectedCompanyId === c.id
                          ? 'text-white font-medium'
                          : 'text-slate-600'
                      }`}
                      numberOfLines={1}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description */}
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <FormField
                  label="Description"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  placeholder="What is the event? Expected footfall, etc."
                  multiline
                  numberOfLines={3}
                  style={{ textAlignVertical: 'top', minHeight: 72 }}
                />
              )}
            />

            {/* Toggle rows */}
            <View className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              {/* Overnight Stay */}
              <Controller
                control={control}
                name="overnight_stay"
                render={({ field }) => (
                  <View className="flex-row items-center justify-between px-4 py-3.5">
                    <View className="flex-1 mr-3">
                      <Text className="text-sm font-medium text-slate-700">
                        Overnight Stay Required
                      </Text>
                    </View>
                    <Switch
                      value={field.value ?? false}
                      onValueChange={field.onChange}
                      trackColor={{ false: '#e2e8f0', true: '#1e293b' }}
                      thumbColor="#ffffff"
                    />
                  </View>
                )}
              />
              <View className="border-t border-slate-100" />
              {/* Documents Uploaded */}
              <Controller
                control={control}
                name="documents_uploaded"
                render={({ field }) => (
                  <View className="flex-row items-center justify-between px-4 py-3.5">
                    <View className="flex-1 mr-3">
                      <Text className="text-sm font-medium text-slate-700">
                        Paperwork / Docs Uploaded
                      </Text>
                    </View>
                    <Switch
                      value={field.value ?? false}
                      onValueChange={field.onChange}
                      trackColor={{ false: '#e2e8f0', true: '#1e293b' }}
                      thumbColor="#ffffff"
                    />
                  </View>
                )}
              />
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════
            FINANCIALS TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'Financials' && (
          <FinancialsTabContent control={control} watch={watch} />
        )}

        {/* ══════════════════════════════════════════
            STAFFING TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'Staffing' && (
          <View className="gap-4">
            <View className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <Text className="text-blue-800 text-xs">
                Add individual staff members. Their total cost will override the staffing figure in
                Financials.
              </Text>
            </View>
            {staffFields.map((field, i) => (
              <View key={field.id} className="bg-white rounded-xl p-4 border border-slate-100 gap-3">
                <View className="flex-row justify-between items-center">
                  <Text className="font-semibold text-slate-700 text-sm">
                    Staff Member {i + 1}
                  </Text>
                  <TouchableOpacity onPress={() => removeStaff(i)}>
                    <Text className="text-red-400 text-sm font-medium">Remove</Text>
                  </TouchableOpacity>
                </View>
                <Controller
                  control={control}
                  name={`staffing_entries.${i}.staff_name`}
                  render={({ field: f }) => (
                    <FormField
                      label="Name"
                      value={f.value}
                      onChangeText={f.onChange}
                      placeholder="Jane Smith"
                      error={errors.staffing_entries?.[i]?.staff_name?.message}
                    />
                  )}
                />
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name={`staffing_entries.${i}.hours_worked`}
                      render={({ field: f }) => (
                        <FormField
                          label="Hours"
                          value={String(f.value || '')}
                          onChangeText={(t) => f.onChange(parseFloat(t) || 0)}
                          keyboardType="decimal-pad"
                          placeholder="8"
                        />
                      )}
                    />
                  </View>
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name={`staffing_entries.${i}.hourly_rate`}
                      render={({ field: f }) => (
                        <CurrencyInput
                          label="Hourly Rate"
                          value={f.value}
                          onChangeValue={f.onChange}
                        />
                      )}
                    />
                  </View>
                </View>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => appendStaff({ staff_name: '', hours_worked: 0, hourly_rate: 0 })}
              className="border-2 border-dashed border-slate-300 rounded-xl py-4 items-center"
            >
              <Text className="text-slate-500 font-medium">+ Add Staff Member</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ══════════════════════════════════════════
            COSTS TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'Costs' && (
          <View className="gap-4">
            {infraFields.map((field, i) => (
              <View key={field.id} className="bg-white rounded-xl p-4 border border-slate-100 gap-3">
                <View className="flex-row justify-between items-center">
                  <Text className="font-semibold text-slate-700 text-sm">Cost Item {i + 1}</Text>
                  <TouchableOpacity onPress={() => removeInfra(i)}>
                    <Text className="text-red-400 text-sm font-medium">Remove</Text>
                  </TouchableOpacity>
                </View>
                <Controller
                  control={control}
                  name={`infrastructure_items.${i}.description`}
                  render={({ field: f }) => (
                    <FormField
                      label="Description"
                      value={f.value}
                      onChangeText={f.onChange}
                      placeholder="Generator hire"
                      error={errors.infrastructure_items?.[i]?.description?.message}
                    />
                  )}
                />
                <View>
                  <Text className="text-slate-600 text-sm font-medium mb-2">Category</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {INFRASTRUCTURE_CATEGORIES.map((cat) => {
                      const current = watch(
                        `infrastructure_items.${i}.category`,
                      ) as InfrastructureCategory;
                      return (
                        <TouchableOpacity
                          key={cat}
                          onPress={() =>
                            setValue(`infrastructure_items.${i}.category`, cat)
                          }
                          className={`px-3 py-1 rounded-full border ${
                            current === cat
                              ? 'bg-slate-900 border-slate-900'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <Text
                            className={`text-xs font-medium ${
                              current === cat ? 'text-white' : 'text-slate-600'
                            }`}
                          >
                            {INFRASTRUCTURE_CATEGORY_LABELS[cat]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                <Controller
                  control={control}
                  name={`infrastructure_items.${i}.cost`}
                  render={({ field: f }) => (
                    <CurrencyInput label="Cost" value={f.value} onChangeValue={f.onChange} />
                  )}
                />
              </View>
            ))}
            <TouchableOpacity
              onPress={() => appendInfra({ description: '', category: 'other', cost: 0 })}
              className="border-2 border-dashed border-slate-300 rounded-xl py-4 items-center"
            >
              <Text className="text-slate-500 font-medium">+ Add Cost Item</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ══════════════════════════════════════════
            NOTES TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'Notes' && (
          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <FormField
                label="Notes & Observations"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                placeholder="Footfall, parking, setup notes, what sold well..."
                multiline
                numberOfLines={12}
                style={{ textAlignVertical: 'top', minHeight: 240 }}
              />
            )}
          />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit button */}
      <View className="px-4 pb-8 pt-3 bg-white border-t border-slate-100">
        <TouchableOpacity
          onPress={handleSubmit(handleFormSubmit)}
          className="bg-amber-500 py-4 rounded-2xl items-center"
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
</file>

<file path="package.json">
{
  "name": "brewedbyboon",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "@expo/vector-icons": "^14.1.0",
    "@hookform/resolvers": "^3.9.0",
    "@react-native-async-storage/async-storage": "^2.1.0",
    "@shopify/flash-list": "2.0.2",
    "@supabase/supabase-js": "^2.45.0",
    "@tanstack/react-query": "^5.56.0",
    "date-fns": "^3.6.0",
    "expo": "~54.0.0",
    "expo-constants": "~18.0.13",
    "expo-device": "~8.0.10",
    "expo-haptics": "~15.0.8",
    "expo-linking": "~8.0.11",
    "expo-notifications": "~0.32.16",
    "expo-router": "~6.0.23",
    "expo-secure-store": "~15.0.8",
    "expo-status-bar": "~3.0.9",
    "nativewind": "^4.0.36",
    "react": "19.1.0",
    "react-hook-form": "^7.53.0",
    "react-native": "0.81.5",
    "react-native-gesture-handler": "~2.28.0",
    "react-native-reanimated": "~4.1.1",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0",
    "react-native-svg": "15.12.1",
    "react-native-worklets": "0.5.1",
    "tailwindcss": "^3.4.14",
    "zod": "^3.23.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "~19.0.0",
    "babel-preset-expo": "~12.0.0",
    "typescript": "~5.3.0"
  },
  "private": true
}
</file>

</files>
