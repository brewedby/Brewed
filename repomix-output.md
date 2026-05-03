This file is a merged representation of the entire codebase, combined into a single document by Repomix.
The content has been processed where line numbers have been added, content has been formatted for parsing in markdown style.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Line numbers have been added to the beginning of each line
- Content has been formatted for parsing in markdown style
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
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
```

# Files

## File: app/(auth)/_layout.tsx
````typescript
 1: import { Stack } from 'expo-router';
 2: 
 3: export default function AuthLayout() {
 4:   return (
 5:     <Stack screenOptions={{ headerShown: false }}>
 6:       <Stack.Screen name="sign-in" />
 7:       <Stack.Screen name="sign-up" />
 8:     </Stack>
 9:   );
10: }
````

## File: app/(auth)/sign-in.tsx
````typescript
  1: import React, { useRef, useState } from 'react';
  2: import {
  3:   View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  4:   Platform, ScrollView, ActivityIndicator, Alert,
  5: } from 'react-native';
  6: import { Link } from 'expo-router';
  7: import { supabase } from '@/lib/supabase';
  8: 
  9: export default function SignInScreen() {
 10:   const [email, setEmail] = useState('');
 11:   const [password, setPassword] = useState('');
 12:   const [loading, setLoading] = useState(false);
 13:   const [sendingReset, setSendingReset] = useState(false);
 14:   const passwordRef = useRef<TextInput>(null);
 15: 
 16:   const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;
 17: 
 18:   async function handleSignIn() {
 19:     if (!canSubmit) {
 20:       if (!email || !password) {
 21:         Alert.alert('Error', 'Please enter your email and password.');
 22:       }
 23:       return;
 24:     }
 25:     setLoading(true);
 26:     const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
 27:     setLoading(false);
 28:     if (error) Alert.alert('Sign in failed', error.message);
 29:   }
 30: 
 31:   async function handleForgotPassword() {
 32:     if (!email.trim()) {
 33:       Alert.alert('Enter your email', 'Please type your email address above, then tap "Forgot password?" again.');
 34:       return;
 35:     }
 36:     setSendingReset(true);
 37:     const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
 38:     setSendingReset(false);
 39:     if (error) {
 40:       Alert.alert('Error', error.message);
 41:     } else {
 42:       Alert.alert('Check your email', `A password reset link has been sent to ${email.trim()}.`);
 43:     }
 44:   }
 45: 
 46:   return (
 47:     <KeyboardAvoidingView
 48:       className="flex-1 bg-stone-950"
 49:       behavior={Platform.OS === 'ios' ? 'padding' : undefined}
 50:     >
 51:       <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
 52:         <View className="flex-1 justify-center px-6 py-12">
 53:           <View className="items-center mb-10">
 54:             <View className="w-20 h-20 rounded-2xl bg-amber-700 items-center justify-center mb-4">
 55:               <Text className="text-4xl">☕</Text>
 56:             </View>
 57:             <Text className="text-3xl font-bold text-white">Brewed by Boon</Text>
 58:             <Text className="text-stone-400 mt-1">Coffee Truck Management</Text>
 59:           </View>
 60: 
 61:           <View className="gap-4">
 62:             <View>
 63:               <Text className="text-stone-300 mb-1.5 font-medium">Email</Text>
 64:               <TextInput
 65:                 className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border border-stone-700"
 66:                 placeholder="you@example.com"
 67:                 placeholderTextColor="#78716c"
 68:                 keyboardType="email-address"
 69:                 autoCapitalize="none"
 70:                 autoComplete="email"
 71:                 value={email}
 72:                 onChangeText={setEmail}
 73:                 returnKeyType="next"
 74:                 onSubmitEditing={() => passwordRef.current?.focus()}
 75:                 blurOnSubmit={false}
 76:               />
 77:             </View>
 78: 
 79:             <View>
 80:               <View className="flex-row items-center justify-between mb-1.5">
 81:                 <Text className="text-stone-300 font-medium">Password</Text>
 82:                 <TouchableOpacity onPress={handleForgotPassword} disabled={sendingReset} accessibilityRole="button">
 83:                   <Text className="text-amber-500 text-xs font-medium">
 84:                     {sendingReset ? 'Sending…' : 'Forgot password?'}
 85:                   </Text>
 86:                 </TouchableOpacity>
 87:               </View>
 88:               <TextInput
 89:                 ref={passwordRef}
 90:                 className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border border-stone-700"
 91:                 placeholder="••••••••"
 92:                 placeholderTextColor="#78716c"
 93:                 secureTextEntry
 94:                 autoComplete="password"
 95:                 value={password}
 96:                 onChangeText={setPassword}
 97:                 returnKeyType="done"
 98:                 onSubmitEditing={handleSignIn}
 99:               />
100:             </View>
101: 
102:             <TouchableOpacity
103:               className="bg-amber-700 py-4 rounded-xl items-center mt-2"
104:               style={{ opacity: canSubmit ? 1 : 0.6 }}
105:               onPress={handleSignIn}
106:               disabled={!canSubmit}
107:               accessibilityRole="button"
108:               accessibilityState={{ disabled: !canSubmit }}
109:             >
110:               {loading ? (
111:                 <ActivityIndicator color="#fff" />
112:               ) : (
113:                 <Text className="text-white font-semibold text-base">Sign In</Text>
114:               )}
115:             </TouchableOpacity>
116: 
117:             <View className="flex-row justify-center mt-4">
118:               <Text className="text-stone-400">Don't have an account? </Text>
119:               <Link href="/(auth)/sign-up">
120:                 <Text className="text-amber-500 font-medium">Sign up</Text>
121:               </Link>
122:             </View>
123:           </View>
124:         </View>
125:       </ScrollView>
126:     </KeyboardAvoidingView>
127:   );
128: }
````

## File: app/(auth)/sign-up.tsx
````typescript
  1: import React, { useMemo, useRef, useState } from 'react';
  2: import {
  3:   View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  4:   Platform, ScrollView, ActivityIndicator, Alert,
  5: } from 'react-native';
  6: import { Link } from 'expo-router';
  7: import { supabase } from '@/lib/supabase';
  8: 
  9: type Strength = { label: string; color: string; bars: number };
 10: 
 11: function scorePassword(pw: string): Strength {
 12:   if (!pw) return { label: '', color: '#57534e', bars: 0 };
 13:   let score = 0;
 14:   if (pw.length >= 6) score++;
 15:   if (pw.length >= 10) score++;
 16:   if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
 17:   if (/\d/.test(pw)) score++;
 18:   if (/[^A-Za-z0-9]/.test(pw)) score++;
 19:   if (score <= 2) return { label: 'Weak', color: '#ef4444', bars: 1 };
 20:   if (score <= 3) return { label: 'Medium', color: '#f59e0b', bars: 2 };
 21:   return { label: 'Strong', color: '#22c55e', bars: 3 };
 22: }
 23: 
 24: export default function SignUpScreen() {
 25:   const [businessName, setBusinessName] = useState('');
 26:   const [email, setEmail] = useState('');
 27:   const [password, setPassword] = useState('');
 28:   const [confirmPassword, setConfirmPassword] = useState('');
 29:   const [loading, setLoading] = useState(false);
 30: 
 31:   const emailRef = useRef<TextInput>(null);
 32:   const passwordRef = useRef<TextInput>(null);
 33:   const confirmRef = useRef<TextInput>(null);
 34: 
 35:   const strength = useMemo(() => scorePassword(password), [password]);
 36:   const passwordsMatch = confirmPassword.length === 0 || confirmPassword === password;
 37:   const canSubmit =
 38:     email.trim().length > 0 &&
 39:     password.length >= 6 &&
 40:     confirmPassword === password &&
 41:     !loading;
 42: 
 43:   async function handleSignUp() {
 44:     if (!email || !password) {
 45:       Alert.alert('Error', 'Please enter your email and password.');
 46:       return;
 47:     }
 48:     if (password.length < 6) {
 49:       Alert.alert('Error', 'Password must be at least 6 characters.');
 50:       return;
 51:     }
 52:     if (password !== confirmPassword) {
 53:       Alert.alert('Error', 'Passwords do not match.');
 54:       return;
 55:     }
 56:     setLoading(true);
 57:     const { error } = await supabase.auth.signUp({
 58:       email: email.trim(),
 59:       password,
 60:       options: { data: { business_name: businessName.trim() } },
 61:     });
 62:     setLoading(false);
 63:     if (error) {
 64:       Alert.alert('Sign up failed', error.message);
 65:     } else {
 66:       Alert.alert('Account created!', 'Please check your email to confirm your account.');
 67:     }
 68:   }
 69: 
 70:   return (
 71:     <KeyboardAvoidingView
 72:       className="flex-1 bg-stone-950"
 73:       behavior={Platform.OS === 'ios' ? 'padding' : undefined}
 74:     >
 75:       <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
 76:         <View className="flex-1 justify-center px-6 py-12">
 77:           <View className="items-center mb-10">
 78:             <View className="w-20 h-20 rounded-2xl bg-amber-700 items-center justify-center mb-4">
 79:               <Text className="text-4xl">☕</Text>
 80:             </View>
 81:             <Text className="text-3xl font-bold text-white">Create Account</Text>
 82:             <Text className="text-stone-400 mt-1">Start tracking your events</Text>
 83:           </View>
 84: 
 85:           <View className="gap-4">
 86:             <View>
 87:               <Text className="text-stone-300 mb-1.5 font-medium">Business Name</Text>
 88:               <TextInput
 89:                 className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border border-stone-700"
 90:                 placeholder="Brewed by Boon Ltd"
 91:                 placeholderTextColor="#78716c"
 92:                 autoCapitalize="words"
 93:                 value={businessName}
 94:                 onChangeText={setBusinessName}
 95:                 returnKeyType="next"
 96:                 onSubmitEditing={() => emailRef.current?.focus()}
 97:                 blurOnSubmit={false}
 98:               />
 99:             </View>
100: 
101:             <View>
102:               <Text className="text-stone-300 mb-1.5 font-medium">Email</Text>
103:               <TextInput
104:                 ref={emailRef}
105:                 className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border border-stone-700"
106:                 placeholder="you@example.com"
107:                 placeholderTextColor="#78716c"
108:                 keyboardType="email-address"
109:                 autoCapitalize="none"
110:                 autoComplete="email"
111:                 value={email}
112:                 onChangeText={setEmail}
113:                 returnKeyType="next"
114:                 onSubmitEditing={() => passwordRef.current?.focus()}
115:                 blurOnSubmit={false}
116:               />
117:             </View>
118: 
119:             <View>
120:               <Text className="text-stone-300 mb-1.5 font-medium">Password</Text>
121:               <TextInput
122:                 ref={passwordRef}
123:                 className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border border-stone-700"
124:                 placeholder="Min. 6 characters"
125:                 placeholderTextColor="#78716c"
126:                 secureTextEntry
127:                 autoComplete="password-new"
128:                 value={password}
129:                 onChangeText={setPassword}
130:                 returnKeyType="next"
131:                 onSubmitEditing={() => confirmRef.current?.focus()}
132:                 blurOnSubmit={false}
133:               />
134:               {password.length > 0 && (
135:                 <View className="mt-2 flex-row items-center gap-2">
136:                   <View className="flex-row gap-1 flex-1">
137:                     {[1, 2, 3].map((i) => (
138:                       <View
139:                         key={i}
140:                         style={{
141:                           flex: 1,
142:                           height: 4,
143:                           borderRadius: 2,
144:                           backgroundColor: i <= strength.bars ? strength.color : '#44403c',
145:                         }}
146:                       />
147:                     ))}
148:                   </View>
149:                   <Text style={{ color: strength.color, fontSize: 11, fontWeight: '600', minWidth: 54, textAlign: 'right' }}>
150:                     {strength.label}
151:                   </Text>
152:                 </View>
153:               )}
154:             </View>
155: 
156:             <View>
157:               <Text className="text-stone-300 mb-1.5 font-medium">Confirm Password</Text>
158:               <TextInput
159:                 ref={confirmRef}
160:                 className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border"
161:                 style={{ borderColor: passwordsMatch ? '#44403c' : '#dc2626' }}
162:                 placeholder="Re-enter your password"
163:                 placeholderTextColor="#78716c"
164:                 secureTextEntry
165:                 autoComplete="password-new"
166:                 value={confirmPassword}
167:                 onChangeText={setConfirmPassword}
168:                 returnKeyType="done"
169:                 onSubmitEditing={handleSignUp}
170:               />
171:               {!passwordsMatch && (
172:                 <Text className="text-red-500 text-xs mt-1.5">Passwords don't match</Text>
173:               )}
174:             </View>
175: 
176:             <TouchableOpacity
177:               className="bg-amber-700 py-4 rounded-xl items-center mt-2"
178:               style={{ opacity: canSubmit ? 1 : 0.6 }}
179:               onPress={handleSignUp}
180:               disabled={!canSubmit}
181:               accessibilityRole="button"
182:               accessibilityState={{ disabled: !canSubmit }}
183:             >
184:               {loading ? (
185:                 <ActivityIndicator color="#fff" />
186:               ) : (
187:                 <Text className="text-white font-semibold text-base">Create Account</Text>
188:               )}
189:             </TouchableOpacity>
190: 
191:             <View className="flex-row justify-center mt-4">
192:               <Text className="text-stone-400">Already have an account? </Text>
193:               <Link href="/(auth)/sign-in">
194:                 <Text className="text-amber-500 font-medium">Sign in</Text>
195:               </Link>
196:             </View>
197:           </View>
198:         </View>
199:       </ScrollView>
200:     </KeyboardAvoidingView>
201:   );
202: }
````

## File: app/(tabs)/companies/[id]/edit.tsx
````typescript
 1: import React from 'react';
 2: import { View, Text, TouchableOpacity } from 'react-native';
 3: import { useSafeAreaInsets } from 'react-native-safe-area-context';
 4: import { useLocalSearchParams, useRouter } from 'expo-router';
 5: import { CompanyForm } from '@/components/companies/CompanyForm';
 6: import { useCompany } from '@/lib/queries/companies';
 7: import { useUpdateCompany } from '@/lib/mutations/companies';
 8: import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
 9: 
10: export default function EditCompanyScreen() {
11:   const insets = useSafeAreaInsets();
12:   const { id } = useLocalSearchParams<{ id: string }>();
13:   const router = useRouter();
14:   const { data: company, isLoading } = useCompany(id);
15:   const updateCompany = useUpdateCompany();
16: 
17:   if (isLoading) return <LoadingSpinner message="Loading company..." />;
18:   if (!company) return null;
19: 
20:   return (
21:     <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
22:       <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-stone-100">
23:         <Text className="text-lg font-bold text-stone-900">Edit Company</Text>
24:         <TouchableOpacity onPress={() => router.back()}>
25:           <Text className="text-stone-500">Cancel</Text>
26:         </TouchableOpacity>
27:       </View>
28:       <CompanyForm
29:         defaultValues={{
30:           name: company.name,
31:           contact_name: company.contact_name ?? '',
32:           email: company.email ?? '',
33:           phone: company.phone ?? '',
34:           website: company.website ?? '',
35:           notes: company.notes ?? '',
36:         }}
37:         onSubmit={(data) => updateCompany.mutateAsync({ id, data })}
38:         submitLabel="Save Changes"
39:       />
40:     </View>
41:   );
42: }
````

## File: app/(tabs)/companies/[id]/index.tsx
````typescript
  1: import React, { useState } from 'react';
  2: import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, Linking } from 'react-native';
  3: import { useSafeAreaInsets } from 'react-native-safe-area-context';
  4: import { useLocalSearchParams, useRouter } from 'expo-router';
  5: import { useCompany } from '@/lib/queries/companies';
  6: import { useEvents, useDeleteEvent } from '@/lib/queries/events';
  7: import { useDeleteCompany } from '@/lib/queries/companies';
  8: import { EventCard } from '@/components/events/EventCard';
  9: import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
 10: import { EmptyState } from '@/components/shared/EmptyState';
 11: import { formatCurrency } from '@/lib/formatters';
 12: import { calcEventFinancials } from '@/lib/calculations';
 13: 
 14: export default function CompanyDetailScreen() {
 15:   const insets = useSafeAreaInsets();
 16:   const { id } = useLocalSearchParams<{ id: string }>();
 17:   const router = useRouter();
 18:   const { data: company, isLoading, refetch } = useCompany(id);
 19:   const { data: allEvents } = useEvents({ companyId: id });
 20:   const deleteCompany = useDeleteCompany();
 21:   const [refreshing, setRefreshing] = useState(false);
 22: 
 23:   async function handleRefresh() {
 24:     setRefreshing(true);
 25:     await refetch();
 26:     setRefreshing(false);
 27:   }
 28: 
 29:   async function handleDelete() {
 30:     try {
 31:       await deleteCompany.mutateAsync(id);
 32:       router.back();
 33:     } catch (e: any) {
 34:       Alert.alert('Error', e.message);
 35:     }
 36:   }
 37: 
 38:   if (isLoading) return <LoadingSpinner message="Loading company..." />;
 39:   if (!company) return (
 40:     <View className="flex-1 items-center justify-center">
 41:       <Text className="text-stone-500">Company not found</Text>
 42:     </View>
 43:   );
 44: 
 45:   const events = allEvents ?? [];
 46:   const totalRevenue = events.reduce((s, e) => s + (e.event_financials?.gross_sales ?? 0), 0);
 47:   const totalNet = events.reduce((s, e) => s + e.calculations.netProfit, 0);
 48:   const accepted = events.filter((e) => e.status === 'accepted').length;
 49:   const decided = events.filter((e) => e.status === 'accepted' || e.status === 'rejected').length;
 50:   const acceptanceRate = decided > 0 ? ((accepted / decided) * 100).toFixed(0) : '—';
 51: 
 52:   return (
 53:     <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
 54:       <View className="bg-white px-4 pt-2 pb-4 border-b border-stone-100">
 55:         <View className="flex-row items-center justify-between mb-2">
 56:           <TouchableOpacity
 57:             onPress={() => router.back()}
 58:             accessibilityRole="button"
 59:             accessibilityLabel="Back to companies"
 60:             className="p-1"
 61:           >
 62:             <Text className="text-amber-600 text-base">‹ Companies</Text>
 63:           </TouchableOpacity>
 64:           <TouchableOpacity
 65:             onPress={() => router.push(`/(tabs)/companies/${id}/edit`)}
 66:             accessibilityRole="button"
 67:             accessibilityLabel="Edit company"
 68:             className="bg-amber-700 px-4 py-1.5 rounded-xl"
 69:           >
 70:             <Text className="text-white font-semibold text-sm">Edit</Text>
 71:           </TouchableOpacity>
 72:         </View>
 73:         <Text className="text-xl font-bold text-stone-900">{company.name}</Text>
 74:       </View>
 75: 
 76:       <ScrollView
 77:         className="flex-1 px-4 pt-4"
 78:         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />}
 79:       >
 80:         {/* Contact card */}
 81:         <View className="bg-white rounded-2xl p-4 border border-stone-100 mb-4">
 82:           <Text className="font-bold text-stone-900 mb-3">Contact</Text>
 83:           {company.contact_name && <Text className="text-stone-700 text-sm mb-1">👤 {company.contact_name}</Text>}
 84:           {company.email && (
 85:             <TouchableOpacity onPress={() => Linking.openURL(`mailto:${company.email}`)}>
 86:               <Text className="text-amber-700 text-sm mb-1">✉️ {company.email}</Text>
 87:             </TouchableOpacity>
 88:           )}
 89:           {company.phone && (
 90:             <TouchableOpacity onPress={() => Linking.openURL(`tel:${company.phone}`)}>
 91:               <Text className="text-amber-700 text-sm mb-1">📞 {company.phone}</Text>
 92:             </TouchableOpacity>
 93:           )}
 94:           {company.website && (
 95:             <TouchableOpacity onPress={() => Linking.openURL(company.website!)}>
 96:               <Text className="text-amber-700 text-sm">🌐 {company.website}</Text>
 97:             </TouchableOpacity>
 98:           )}
 99:           {!company.contact_name && !company.email && !company.phone && !company.website && (
100:             <Text className="text-stone-400 text-sm">No contact details added</Text>
101:           )}
102:           {company.notes && (
103:             <View className="mt-3 pt-3 border-t border-stone-100">
104:               <Text className="text-stone-500 text-sm">{company.notes}</Text>
105:             </View>
106:           )}
107:         </View>
108: 
109:         {/* Stats */}
110:         <View className="flex-row gap-3 mb-4">
111:           {[
112:             { label: 'Total Events', value: String(events.length) },
113:             { label: 'Accepted', value: `${accepted} (${acceptanceRate}%)` },
114:             { label: 'Total Revenue', value: formatCurrency(totalRevenue) },
115:             { label: 'Net Profit', value: formatCurrency(totalNet) },
116:           ].map((stat) => (
117:             <View key={stat.label} className="flex-1 bg-white rounded-xl p-3 border border-stone-100 items-center">
118:               <Text className="font-bold text-stone-900 text-base">{stat.value}</Text>
119:               <Text className="text-stone-400 text-xs mt-0.5 text-center">{stat.label}</Text>
120:             </View>
121:           ))}
122:         </View>
123: 
124:         {/* Events */}
125:         <Text className="font-bold text-stone-900 mb-3">Events</Text>
126:         {events.length === 0 ? (
127:           <EmptyState icon="🎪" title="No events yet" description="No events linked to this company." />
128:         ) : (
129:           events.map((event) => <EventCard key={event.id} event={event} />)
130:         )}
131: 
132:         <View className="bg-white rounded-2xl p-4 border border-stone-100 mt-4">
133:           <TouchableOpacity
134:             onPress={() =>
135:               Alert.alert(
136:                 'Delete Company',
137:                 `Delete "${company.name}"? Events linked to this company will remain but will be unlinked. This cannot be undone.`,
138:                 [
139:                   { text: 'Cancel', style: 'cancel' },
140:                   { text: 'Delete', style: 'destructive', onPress: handleDelete },
141:                 ],
142:               )
143:             }
144:             className="border border-red-200 py-3 rounded-xl items-center"
145:           >
146:             <Text className="text-red-500 font-medium text-sm">Delete Company</Text>
147:           </TouchableOpacity>
148:         </View>
149: 
150:         <View style={{ height: 40 }} />
151:       </ScrollView>
152:     </View>
153:   );
154: }
````

## File: app/(tabs)/companies/_layout.tsx
````typescript
 1: import { Stack } from 'expo-router';
 2: 
 3: export default function CompaniesLayout() {
 4:   return (
 5:     <Stack screenOptions={{ headerShown: false }}>
 6:       <Stack.Screen name="index" />
 7:       <Stack.Screen name="new" options={{ presentation: 'modal' }} />
 8:       <Stack.Screen name="[id]/index" />
 9:       <Stack.Screen name="[id]/edit" options={{ presentation: 'modal' }} />
10:     </Stack>
11:   );
12: }
````

## File: app/(tabs)/companies/index.tsx
````typescript
  1: import React, { useState } from 'react';
  2: import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
  3: import { useSafeAreaInsets } from 'react-native-safe-area-context';
  4: import { useRouter } from 'expo-router';
  5: import { useCompanies } from '@/lib/queries/companies';
  6: import { EmptyState } from '@/components/shared/EmptyState';
  7: import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
  8: import { QueryError } from '@/components/shared/QueryError';
  9: import { formatCurrency, formatDate } from '@/lib/formatters';
 10: 
 11: export default function CompaniesScreen() {
 12:   const insets = useSafeAreaInsets();
 13:   const router = useRouter();
 14:   const { data: companies, isLoading, isError, error, refetch } = useCompanies();
 15:   const [refreshing, setRefreshing] = useState(false);
 16: 
 17:   async function handleRefresh() {
 18:     setRefreshing(true);
 19:     await refetch();
 20:     setRefreshing(false);
 21:   }
 22: 
 23:   return (
 24:     <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
 25:       <View className="px-4 pt-2 pb-3 bg-white border-b border-stone-100">
 26:         <View className="flex-row items-center justify-between">
 27:           <Text className="text-2xl font-bold text-stone-900">Companies</Text>
 28:           <TouchableOpacity
 29:             onPress={() => router.push('/(tabs)/companies/new')}
 30:             accessibilityRole="button"
 31:             accessibilityLabel="Add new company"
 32:             className="bg-amber-700 px-4 py-2 rounded-xl"
 33:           >
 34:             <Text className="text-white font-semibold text-sm">+ Add Company</Text>
 35:           </TouchableOpacity>
 36:         </View>
 37:       </View>
 38: 
 39:       {isLoading ? (
 40:         <LoadingSpinner message="Loading companies..." />
 41:       ) : isError ? (
 42:         <QueryError error={error} onRetry={refetch} message="Couldn't load companies" />
 43:       ) : (
 44:         <ScrollView
 45:           className="flex-1 px-4 pt-4"
 46:           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />}
 47:         >
 48:           {!companies || companies.length === 0 ? (
 49:             <EmptyState
 50:               icon="🏢"
 51:               title="No companies yet"
 52:               description="Add concessions companies you apply to for events."
 53:               action={{ label: '+ Add Company', onPress: () => router.push('/(tabs)/companies/new') }}
 54:             />
 55:           ) : (
 56:             companies.map((company) => (
 57:               <TouchableOpacity
 58:                 key={company.id}
 59:                 onPress={() => router.push(`/(tabs)/companies/${company.id}`)}
 60:                 className="bg-white rounded-2xl p-4 mb-3 border border-stone-100 shadow-sm"
 61:                 activeOpacity={0.7}
 62:               >
 63:                 <View className="flex-row items-start justify-between">
 64:                   <View className="flex-1 mr-3">
 65:                     <Text className="font-semibold text-stone-900 text-base">{company.name}</Text>
 66:                     {company.contact_name && (
 67:                       <Text className="text-stone-500 text-sm mt-0.5">👤 {company.contact_name}</Text>
 68:                     )}
 69:                     {company.email && (
 70:                       <Text className="text-stone-400 text-xs mt-0.5">✉️ {company.email}</Text>
 71:                     )}
 72:                   </View>
 73:                   <View className="items-end">
 74:                     <View className="bg-amber-50 px-2.5 py-1 rounded-full">
 75:                       <Text className="text-amber-800 text-xs font-medium">{company.totalEvents} events</Text>
 76:                     </View>
 77:                     {company.acceptedEvents > 0 && (
 78:                       <Text className="text-green-600 text-xs mt-1 font-medium">{company.acceptedEvents} accepted</Text>
 79:                     )}
 80:                     {/* Margin badge */}
 81:                     {company.completedEventCount > 0 ? (
 82:                       <View style={{
 83:                         paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
 84:                         backgroundColor: (company.avgProfitMargin ?? 0) >= 25 ? '#dcfce7' : (company.avgProfitMargin ?? 0) >= 10 ? '#fef9c3' : '#fee2e2',
 85:                         marginTop: 4,
 86:                       }}>
 87:                         <Text style={{
 88:                           fontSize: 11, fontWeight: '600',
 89:                           color: (company.avgProfitMargin ?? 0) >= 25 ? '#166534' : (company.avgProfitMargin ?? 0) >= 10 ? '#854d0e' : '#991b1b',
 90:                         }}>
 91:                           {(company.avgProfitMargin ?? 0).toFixed(0)}% avg margin
 92:                         </Text>
 93:                       </View>
 94:                     ) : (
 95:                       <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: '#f5f5f4', marginTop: 4 }}>
 96:                         <Text style={{ fontSize: 11, fontWeight: '600', color: '#78716c' }}>No data</Text>
 97:                       </View>
 98:                     )}
 99:                     {company.completedEventCount > 0 && <Text className="text-stone-400 text-xs mt-1">Avg across {company.completedEventCount} event{company.completedEventCount !== 1 ? 's' : ''}</Text>}
100:                   </View>
101:                 </View>
102: 
103:                 {company.totalRevenue > 0 && (
104:                   <View className="flex-row mt-3 pt-3 border-t border-stone-100 gap-4">
105:                     <View>
106:                       <Text className="text-stone-400 text-xs">Total Revenue</Text>
107:                       <Text className="font-semibold text-stone-900 text-sm">{formatCurrency(company.totalRevenue)}</Text>
108:                     </View>
109:                     {company.lastEventDate && (
110:                       <View>
111:                         <Text className="text-stone-400 text-xs">Last Event</Text>
112:                         <Text className="font-semibold text-stone-700 text-sm">{formatDate(company.lastEventDate)}</Text>
113:                       </View>
114:                     )}
115:                   </View>
116:                 )}
117:               </TouchableOpacity>
118:             ))
119:           )}
120:           <View style={{ height: 32 }} />
121:         </ScrollView>
122:       )}
123:     </View>
124:   );
125: }
````

## File: app/(tabs)/companies/new.tsx
````typescript
 1: import React from 'react';
 2: import { View, Text, TouchableOpacity } from 'react-native';
 3: import { useSafeAreaInsets } from 'react-native-safe-area-context';
 4: import { useRouter } from 'expo-router';
 5: import { CompanyForm } from '@/components/companies/CompanyForm';
 6: import { useCreateCompany } from '@/lib/mutations/companies';
 7: import { useAuth } from '@/lib/auth';
 8: 
 9: export default function NewCompanyScreen() {
10:   const insets = useSafeAreaInsets();
11:   const router = useRouter();
12:   const { user } = useAuth();
13:   const createCompany = useCreateCompany();
14: 
15:   return (
16:     <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
17:       <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-stone-100">
18:         <Text className="text-lg font-bold text-stone-900">New Company</Text>
19:         <TouchableOpacity onPress={() => router.back()}>
20:           <Text className="text-stone-500">Cancel</Text>
21:         </TouchableOpacity>
22:       </View>
23:       <CompanyForm
24:         onSubmit={async (data) => { await createCompany.mutateAsync({ data, userId: user!.id }); }}
25:         submitLabel="Add Company"
26:       />
27:     </View>
28:   );
29: }
````

## File: app/(tabs)/events/[id]/edit.tsx
````typescript
 1: import React from 'react';
 2: import { View, Text, TouchableOpacity } from 'react-native';
 3: import { useSafeAreaInsets } from 'react-native-safe-area-context';
 4: import { useLocalSearchParams, useRouter } from 'expo-router';
 5: import { EventForm } from '@/components/events/EventForm';
 6: import { useEvent } from '@/lib/queries/events';
 7: import { useUpdateEvent } from '@/lib/mutations/events';
 8: import { useCompanies } from '@/lib/queries/companies';
 9: import { useUnits } from '@/lib/queries/units';
10: import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
11: import type { EventFormValues } from '@/lib/validations/event.schema';
12: 
13: export default function EditEventScreen() {
14:   const insets = useSafeAreaInsets();
15:   const { id } = useLocalSearchParams<{ id: string }>();
16:   const router = useRouter();
17:   const { data: event, isLoading } = useEvent(id);
18:   const updateEvent = useUpdateEvent();
19:   const { data: companies = [] } = useCompanies();
20:   const { data: units = [] } = useUnits();
21: 
22:   if (isLoading) return <LoadingSpinner message="Loading event..." />;
23:   if (!event) return null;
24: 
25:   const fin = event.event_financials;
26:   const defaultValues: Partial<EventFormValues> = {
27:     name: event.name,
28:     date: event.date,
29:     end_date: event.end_date ?? '',
30:     location: event.location,
31:     description: event.description ?? '',
32:     application_date: event.application_date ?? '',
33:     status: event.status,
34:     notes: event.notes ?? '',
35:     company_id: event.company_id ?? '',
36:     unit_ids: (event.units ?? []).map((u) => u.id),
37:     overnight_stay: event.overnight_stay ?? false,
38:     documents_uploaded: event.documents_uploaded ?? false,
39:     application_url: event.application_url ?? '',
40:     gross_sales: fin?.gross_sales ?? 0,
41:     zero_rated_sales: fin?.zero_rated_sales ?? 0,
42:     standard_rated_sales: fin?.standard_rated_sales ?? 0,
43:     concessions_commission_pct: fin?.concessions_commission_pct ?? 0,
44:     pitch_fee_refund_pct: fin?.pitch_fee_refund_pct ?? 0,
45:     cost_of_goods: fin?.cost_of_goods ?? 0,
46:     pitch_fee: fin?.pitch_fee ?? 0,
47:     power_fee: fin?.power_fee ?? 0,
48:     travel_costs: fin?.travel_costs ?? 0,
49:     camping_costs: fin?.camping_costs ?? 0,
50:     equipment_costs: fin?.equipment_costs ?? 0,
51:     other_costs: fin?.other_costs ?? 0,
52:     staffing_costs: fin?.staffing_costs ?? 0,
53:     fresh_milk_litres: fin?.fresh_milk_litres ?? 0,
54:     alt_milk_litres: fin?.alt_milk_litres ?? 0,
55:     staffing_entries: (event.staffing_entries ?? []).map((e) => ({
56:       id: e.id, staff_name: e.staff_name, hours_worked: e.hours_worked, hourly_rate: e.hourly_rate,
57:     })),
58:     infrastructure_items: (event.infrastructure_items ?? []).map((i) => ({
59:       id: i.id, description: i.description, category: i.category, cost: i.cost,
60:     })),
61:   };
62: 
63:   return (
64:     <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
65:       <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-stone-100">
66:         <Text className="text-lg font-bold text-stone-900" numberOfLines={1}>Edit: {event.name}</Text>
67:         <TouchableOpacity onPress={() => router.back()}>
68:           <Text className="text-stone-500">Cancel</Text>
69:         </TouchableOpacity>
70:       </View>
71:       <EventForm
72:         defaultValues={defaultValues}
73:         companies={companies}
74:         units={units}
75:         onSubmit={(data) => updateEvent.mutateAsync({ id, data })}
76:         submitLabel="Save Changes"
77:       />
78:     </View>
79:   );
80: }
````

## File: app/(tabs)/events/[id]/index.tsx
````typescript
  1: import React, { useState } from 'react';
  2: import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, Linking } from 'react-native';
  3: import * as Haptics from 'expo-haptics';
  4: import { useSafeAreaInsets } from 'react-native-safe-area-context';
  5: import { useLocalSearchParams, useRouter } from 'expo-router';
  6: import { useEvent, useDeleteEvent } from '@/lib/queries/events';
  7: import { useCreateEvent } from '@/lib/mutations/events';
  8: import { useAuth } from '@/lib/auth';
  9: import { FinancialsCard } from '@/components/events/FinancialsCard';
 10: import { WeatherCard } from '@/components/events/WeatherCard';
 11: import { StaffingList } from '@/components/events/StaffingList';
 12: import { InfrastructureList } from '@/components/events/InfrastructureList';
 13: import { EventStatusBadge } from '@/components/shared/EventStatusBadge';
 14: import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
 15: import { formatDateRange, formatDate, formatCurrency } from '@/lib/formatters';
 16: import { STATUS_COLORS, STATUSES, STATUS_LABELS } from '@/constants';
 17: import type { ApplicationStatus } from '@/types';
 18: import { supabase } from '@/lib/supabase';
 19: import { useQueryClient } from '@tanstack/react-query';
 20: 
 21: // Application journey — ordered steps
 22: const STATUS_JOURNEY: { status: ApplicationStatus; label: string }[] = [
 23:   { status: 'pending',   label: 'Applied' },
 24:   { status: 'waitlisted', label: 'Waitlisted' },
 25:   { status: 'accepted',  label: 'Accepted' },
 26: ];
 27: 
 28: function ApplicationTimeline({ currentStatus }: { currentStatus: ApplicationStatus }) {
 29:   if (currentStatus === 'rejected' || currentStatus === 'withdrawn') {
 30:     return (
 31:       <View className="bg-white rounded-2xl p-4 border border-slate-100 mb-4">
 32:         <Text className="font-bold text-slate-700 mb-3">Application Journey</Text>
 33:         <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: STATUS_COLORS[currentStatus].bgHex }}>
 34:           <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: STATUS_COLORS[currentStatus].dot, marginRight: 8 }} />
 35:           <Text style={{ fontWeight: '600', fontSize: 14, color: STATUS_COLORS[currentStatus].textHex }}>
 36:             Application {STATUS_LABELS[currentStatus]}
 37:           </Text>
 38:         </View>
 39:       </View>
 40:     );
 41:   }
 42: 
 43:   const currentIdx = STATUS_JOURNEY.findIndex((s) => s.status === currentStatus);
 44: 
 45:   return (
 46:     <View className="bg-white rounded-2xl p-4 border border-slate-100 mb-4">
 47:       <Text className="font-bold text-slate-700 mb-3">Application Journey</Text>
 48:       <View className="flex-row items-center">
 49:         {STATUS_JOURNEY.map((step, i) => {
 50:           const done = i <= currentIdx;
 51:           const isCurrent = i === currentIdx;
 52:           const isLast = i === STATUS_JOURNEY.length - 1;
 53:           return (
 54:             <React.Fragment key={step.status}>
 55:               <View className="items-center">
 56:                 <View
 57:                   className={`w-9 h-9 rounded-full items-center justify-center border-2 ${done ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-200'}`}
 58:                 >
 59:                   {done ? (
 60:                     <Text className="text-white font-bold text-sm">{isCurrent ? '●' : '✓'}</Text>
 61:                   ) : (
 62:                     <Text className="text-slate-300 text-xs">{i + 1}</Text>
 63:                   )}
 64:                 </View>
 65:                 <Text className={`text-xs mt-1 font-medium ${isCurrent ? 'text-emerald-600' : done ? 'text-slate-600' : 'text-slate-300'}`}>
 66:                   {step.label}
 67:                 </Text>
 68:               </View>
 69:               {!isLast && (
 70:                 <View className={`flex-1 h-0.5 mx-1 mb-4 ${i < currentIdx ? 'bg-emerald-400' : 'bg-slate-200'}`} />
 71:               )}
 72:             </React.Fragment>
 73:           );
 74:         })}
 75:       </View>
 76:     </View>
 77:   );
 78: }
 79: 
 80: export default function EventDetailScreen() {
 81:   const insets = useSafeAreaInsets();
 82:   const { id } = useLocalSearchParams<{ id: string }>();
 83:   const router = useRouter();
 84:   const qc = useQueryClient();
 85:   const { user } = useAuth();
 86:   const { data: event, isLoading, refetch } = useEvent(id);
 87:   const deleteEvent = useDeleteEvent();
 88:   const createEvent = useCreateEvent();
 89:   const [refreshing, setRefreshing] = useState(false);
 90:   const [updatingStatus, setUpdatingStatus] = useState(false);
 91:   const [duplicating, setDuplicating] = useState(false);
 92: 
 93:   async function handleRefresh() {
 94:     setRefreshing(true);
 95:     await refetch();
 96:     setRefreshing(false);
 97:   }
 98: 
 99:   async function handleDelete() {
100:     try {
101:       await deleteEvent.mutateAsync(id);
102:       router.back();
103:     } catch (e: unknown) {
104:       Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete event');
105:     }
106:   }
107: 
108:   async function handleStatusChange(newStatus: ApplicationStatus) {
109:     setUpdatingStatus(true);
110:     const { error } = await supabase.from('events').update({ status: newStatus }).eq('id', id);
111:     if (error) {
112:       Alert.alert('Error', 'Could not update status. Please try again.');
113:     } else {
114:       Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
115:       qc.invalidateQueries({ queryKey: ['events'] });
116:       qc.invalidateQueries({ queryKey: ['events', id] });
117:       qc.invalidateQueries({ queryKey: ['dashboard'] });
118:     }
119:     setUpdatingStatus(false);
120:   }
121: 
122:   async function handleAcknowledgeChange() {
123:     await supabase.from('events').update({ url_changed: false }).eq('id', id);
124:     qc.invalidateQueries({ queryKey: ['events', id] });
125:   }
126: 
127:   async function handleDuplicate() {
128:     if (!user || !event) return;
129:     setDuplicating(true);
130:     try {
131:       const newEvent = await createEvent.mutateAsync({
132:         userId: user.id,
133:         data: {
134:           name: `${event.name} (copy)`,
135:           date: new Date().toISOString().split('T')[0],
136:           end_date: null,
137:           location: event.location,
138:           description: event.description ?? '',
139:           application_date: null,
140:           application_url: event.application_url ?? '',
141:           status: 'pending',
142:           notes: event.notes ?? '',
143:           company_id: event.company_id ?? '',
144:           unit_ids: event.units?.map((u) => u.id) ?? [],
145:           overnight_stay: event.overnight_stay,
146:           documents_uploaded: false,
147:           gross_sales: 0,
148:           zero_rated_sales: 0,
149:           standard_rated_sales: 0,
150:           concessions_commission_pct: event.event_financials?.concessions_commission_pct ?? 0,
151:           pitch_fee_refund_pct: event.event_financials?.pitch_fee_refund_pct ?? 0,
152:           cost_of_goods: 0,
153:           pitch_fee: event.event_financials?.pitch_fee ?? 0,
154:           power_fee: event.event_financials?.power_fee ?? 0,
155:           travel_costs: event.event_financials?.travel_costs ?? 0,
156:           camping_costs: event.event_financials?.camping_costs ?? 0,
157:           equipment_costs: event.event_financials?.equipment_costs ?? 0,
158:           other_costs: event.event_financials?.other_costs ?? 0,
159:           staffing_costs: 0,
160:           fresh_milk_litres: 0,
161:           alt_milk_litres: 0,
162:           staffing_entries: [],
163:           infrastructure_items: [],
164:         },
165:       });
166:       router.replace(`/(tabs)/events/${newEvent.id}/edit`);
167:     } catch (e: any) {
168:       Alert.alert('Error', e.message ?? 'Could not duplicate event');
169:     } finally {
170:       setDuplicating(false);
171:     }
172:   }
173: 
174:   if (isLoading) return <LoadingSpinner message="Loading application..." />;
175:   if (!event) return (
176:     <View className="flex-1 items-center justify-center">
177:       <Text className="text-slate-500">Event not found</Text>
178:     </View>
179:   );
180: 
181:   const dotColor = STATUS_COLORS[event.status]?.dot ?? '#94a3b8';
182: 
183:   return (
184:     <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
185:       {/* Header */}
186:       <View className="bg-white border-b border-slate-100">
187:         <View style={{ height: 4, backgroundColor: dotColor }} />
188:         <View className="px-4 pt-3 pb-4">
189:           <View className="flex-row items-center justify-between mb-2">
190:             <TouchableOpacity
191:               onPress={() => router.back()}
192:               accessibilityRole="button"
193:               accessibilityLabel="Back to applications"
194:               className="flex-row items-center"
195:             >
196:               <Text className="text-amber-500 font-semibold text-sm">‹ Applications</Text>
197:             </TouchableOpacity>
198:             <TouchableOpacity
199:               onPress={() => router.push(`/(tabs)/events/${id}/edit`)}
200:               accessibilityRole="button"
201:               accessibilityLabel="Edit event"
202:               className="bg-slate-900 px-4 py-1.5 rounded-xl"
203:             >
204:               <Text className="text-white font-semibold text-sm">Edit</Text>
205:             </TouchableOpacity>
206:           </View>
207: 
208:           <Text className="text-xl font-bold text-slate-900 mb-2 leading-snug">{event.name}</Text>
209: 
210:           <View className="flex-row items-center flex-wrap gap-2 mb-1">
211:             <EventStatusBadge status={event.status} />
212:             <Text className="text-slate-500 text-sm">📅 {formatDateRange(event.date, event.end_date)}</Text>
213:           </View>
214:           <Text className="text-slate-500 text-sm">📍 {event.location}</Text>
215:           {event.concessions_companies && (
216:             <Text className="text-slate-400 text-xs mt-0.5">🏢 {event.concessions_companies.name}</Text>
217:           )}
218:           {event.units?.length > 0 && (
219:             <Text className="text-slate-400 text-xs mt-0.5">🚐 {event.units.map((u) => u.name).join(' · ')}</Text>
220:           )}
221:         </View>
222:       </View>
223: 
224:       <ScrollView
225:         className="flex-1 px-4 pt-4"
226:         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#f59e0b" />}
227:       >
228:         {/* URL change alert */}
229:         {event.url_changed && (
230:           <View className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4">
231:             <View className="flex-row items-start justify-between">
232:               <View className="flex-1 mr-3">
233:                 <Text className="font-bold text-orange-800 text-sm mb-1">⚡ Application page changed!</Text>
234:                 <Text className="text-orange-700 text-xs leading-relaxed">
235:                   The application page was updated since your last check. It might show your acceptance or rejection decision.
236:                 </Text>
237:               </View>
238:               <TouchableOpacity
239:                 onPress={handleAcknowledgeChange}
240:                 accessibilityRole="button"
241:                 accessibilityLabel="Dismiss page changed alert"
242:                 className="bg-orange-100 px-2.5 py-1 rounded-lg"
243:               >
244:                 <Text className="text-orange-700 text-xs font-semibold">Dismiss</Text>
245:               </TouchableOpacity>
246:             </View>
247:             {event.application_url && (
248:               <TouchableOpacity
249:                 onPress={() => event.application_url && Linking.openURL(event.application_url)}
250:                 className="mt-3 bg-orange-500 py-2.5 rounded-xl items-center"
251:               >
252:                 <Text className="text-white font-semibold text-sm">Open Application Page ↗</Text>
253:               </TouchableOpacity>
254:             )}
255:           </View>
256:         )}
257: 
258:         {/* Post-event completion prompt */}
259:         {event.status === 'accepted' &&
260:           event.date < new Date().toISOString().split('T')[0] &&
261:           (!event.event_financials || event.event_financials.gross_sales === 0) && (
262:           <View style={{ backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 16, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
263:             <Text style={{ fontSize: 20 }}>📋</Text>
264:             <View style={{ flex: 1 }}>
265:               <Text style={{ fontWeight: '700', color: '#92400e', fontSize: 14 }}>Event has passed</Text>
266:               <Text style={{ color: '#b45309', fontSize: 12, marginTop: 2 }}>No sales figures entered yet — add the actuals to keep your reports accurate.</Text>
267:             </View>
268:             <TouchableOpacity
269:               onPress={() => router.push(`/(tabs)/events/${id}/edit`)}
270:               accessibilityRole="button"
271:               accessibilityLabel="Add sales figures"
272:               style={{ backgroundColor: '#b45309', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}
273:             >
274:               <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>Add →</Text>
275:             </TouchableOpacity>
276:           </View>
277:         )}
278: 
279:         {/* Application journey */}
280:         <ApplicationTimeline currentStatus={event.status} />
281: 
282:         {/* Quick status update */}
283:         <View className="bg-white rounded-2xl p-4 border border-slate-100 mb-4">
284:           <Text className="font-bold text-slate-700 mb-3">Update Status</Text>
285:           <View className="flex-row flex-wrap gap-2">
286:             {STATUSES.map((s) => {
287:               const colors = STATUS_COLORS[s];
288:               const active = event.status === s;
289:               return (
290:                 <TouchableOpacity
291:                   key={s}
292:                   onPress={() => !active && handleStatusChange(s)}
293:                   disabled={updatingStatus || active}
294:                   accessibilityRole="radio"
295:                   accessibilityLabel={`Set status to ${STATUS_LABELS[s]}`}
296:                   accessibilityState={{ selected: active, disabled: updatingStatus || active }}
297:                   style={{
298:                     flexDirection: 'row', alignItems: 'center',
299:                     paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1,
300:                     backgroundColor: active ? colors.textHex : '#ffffff',
301:                     borderColor: active ? colors.textHex : '#e2e8f0',
302:                   }}
303:                 >
304:                   <View style={{ backgroundColor: active ? '#ffffff' : colors.dot, width: 7, height: 7, borderRadius: 4, marginRight: 6 }} />
305:                   <Text style={{ fontSize: 12, fontWeight: '500', color: active ? '#ffffff' : '#4b5563' }}>{STATUS_LABELS[s]}</Text>
306:                 </TouchableOpacity>
307:               );
308:             })}
309:           </View>
310:         </View>
311: 
312:         {/* Application URL quick access */}
313:         {event.application_url && (
314:           <TouchableOpacity
315:             onPress={() => event.application_url && Linking.openURL(event.application_url)}
316:             className="bg-white rounded-2xl p-4 border border-slate-100 mb-4 flex-row items-center"
317:             activeOpacity={0.7}
318:           >
319:             <Text className="text-2xl mr-3">🔗</Text>
320:             <View className="flex-1">
321:               <Text className="font-semibold text-slate-800 text-sm">Application Portal</Text>
322:               <Text className="text-slate-400 text-xs mt-0.5" numberOfLines={1}>
323:                 {event.application_url}
324:               </Text>
325:             </View>
326:             <Text className="text-amber-500 font-semibold text-sm">Open ↗</Text>
327:           </TouchableOpacity>
328:         )}
329: 
330:         {/* Weather forecast */}
331:         {event.location && event.date && (
332:           <View className="mb-4">
333:             <WeatherCard
334:               location={event.location}
335:               startDate={event.date}
336:               endDate={event.end_date}
337:             />
338:           </View>
339:         )}
340: 
341:         {/* Financials */}
342:         {event.event_financials && (
343:           <View className="mb-4">
344:             <FinancialsCard financials={event.event_financials} calculations={event.calculations} />
345:           </View>
346:         )}
347: 
348:         {/* Staffing */}
349:         {event.staffing_entries?.length > 0 && (
350:           <View className="mb-4">
351:             <StaffingList entries={event.staffing_entries} />
352:           </View>
353:         )}
354: 
355:         {/* Infrastructure */}
356:         {event.infrastructure_items?.length > 0 && (
357:           <View className="mb-4">
358:             <InfrastructureList items={event.infrastructure_items} />
359:           </View>
360:         )}
361: 
362:         {/* Details */}
363:         <View className="bg-white rounded-2xl p-4 border border-slate-100 mb-4 gap-3">
364:           <Text className="font-bold text-slate-700">Details</Text>
365:           {event.application_date && (
366:             <View className="flex-row">
367:               <Text className="text-slate-400 text-sm w-32">Applied on</Text>
368:               <Text className="text-slate-700 text-sm font-medium">{formatDate(event.application_date)}</Text>
369:             </View>
370:           )}
371:           {event.overnight_stay && (
372:             <View className="flex-row items-center">
373:               <Text className="text-slate-400 text-sm w-32">Overnight stay</Text>
374:               <Text className="text-amber-700 text-sm font-medium">🌙 Yes</Text>
375:             </View>
376:           )}
377:           <View className="flex-row items-center">
378:             <Text className="text-slate-400 text-sm w-32">Docs uploaded</Text>
379:             <Text className={`text-sm font-medium ${event.documents_uploaded ? 'text-green-600' : 'text-slate-400'}`}>
380:               {event.documents_uploaded ? '✅ Yes' : '⏳ Not yet'}
381:             </Text>
382:           </View>
383:           {event.url_last_checked_at && (
384:             <View className="flex-row">
385:               <Text className="text-slate-400 text-sm w-32">Last checked</Text>
386:               <Text className="text-slate-700 text-sm">{formatDate(event.url_last_checked_at)}</Text>
387:             </View>
388:           )}
389:           {event.description && (
390:             <Text className="text-slate-600 text-sm leading-relaxed">{event.description}</Text>
391:           )}
392:           {event.notes && (
393:             <>
394:               <View className="border-t border-slate-50" />
395:               <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Notes</Text>
396:               <Text className="text-slate-600 text-sm leading-relaxed">{event.notes}</Text>
397:             </>
398:           )}
399:         </View>
400: 
401:         <View className="bg-white rounded-2xl p-4 border border-stone-100 mb-6 gap-3">
402:           <TouchableOpacity
403:             onPress={handleDuplicate}
404:             disabled={duplicating}
405:             accessibilityRole="button"
406:             accessibilityLabel="Duplicate event"
407:             accessibilityState={{ disabled: duplicating }}
408:             style={{ borderWidth: 1, borderColor: '#d6d3d1', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
409:           >
410:             <Text style={{ color: '#57534e', fontWeight: '500', fontSize: 14 }}>
411:               {duplicating ? 'Duplicating…' : '📋 Duplicate Event'}
412:             </Text>
413:           </TouchableOpacity>
414:           <TouchableOpacity
415:             onPress={() =>
416:               Alert.alert(
417:                 'Delete Event',
418:                 `Are you sure you want to delete "${event.name}"? This cannot be undone.`,
419:                 [
420:                   { text: 'Cancel', style: 'cancel' },
421:                   { text: 'Delete', style: 'destructive', onPress: handleDelete },
422:                 ],
423:               )
424:             }
425:             className="border border-red-200 py-3 rounded-xl items-center"
426:           >
427:             <Text className="text-red-500 font-medium text-sm">Delete Event</Text>
428:           </TouchableOpacity>
429:         </View>
430: 
431:         <View style={{ height: 20 }} />
432:       </ScrollView>
433:     </View>
434:   );
435: }
````

## File: app/(tabs)/events/_layout.tsx
````typescript
 1: import { Stack } from 'expo-router';
 2: 
 3: export default function EventsLayout() {
 4:   return (
 5:     <Stack screenOptions={{ headerShown: false }}>
 6:       <Stack.Screen name="index" />
 7:       <Stack.Screen name="new" options={{ presentation: 'modal' }} />
 8:       <Stack.Screen name="[id]/index" />
 9:       <Stack.Screen name="[id]/edit" options={{ presentation: 'modal' }} />
10:     </Stack>
11:   );
12: }
````

## File: app/(tabs)/events/index.tsx
````typescript
  1: import React, { useState, useMemo } from 'react';
  2: import { View, Text, ScrollView, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
  3: import { useSafeAreaInsets } from 'react-native-safe-area-context';
  4: import { useRouter } from 'expo-router';
  5: import { FlashList } from '@shopify/flash-list';
  6: import { useEvents } from '@/lib/queries/events';
  7: import { useCompanies } from '@/lib/queries/companies';
  8: import { EventCard } from '@/components/events/EventCard';
  9: import { EmptyState } from '@/components/shared/EmptyState';
 10: import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
 11: import { QueryError } from '@/components/shared/QueryError';
 12: import { formatDateRange } from '@/lib/formatters';
 13: import { STATUSES, STATUS_LABELS } from '@/constants';
 14: import type { ApplicationStatus, EventWithFinancials, CompanyWithStats } from '@/types';
 15: 
 16: const YEARS = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];
 17: 
 18: function eventsOverlap(a: EventWithFinancials, b: EventWithFinancials): boolean {
 19:   const aEnd = a.end_date ?? a.date;
 20:   const bEnd = b.end_date ?? b.date;
 21:   if (!(a.date <= bEnd && b.date <= aEnd)) return false;
 22:   // Only flag as conflict when both events share at least one unit
 23:   const aUnitIds = new Set(a.units.map((u) => u.id));
 24:   return b.units.some((u) => aUnitIds.has(u.id));
 25: }
 26: 
 27: function OverlapBanner({
 28:   a, b, companyMap,
 29: }: {
 30:   a: EventWithFinancials;
 31:   b: EventWithFinancials;
 32:   companyMap: Map<string, CompanyWithStats>;
 33: }) {
 34:   const compA = a.company_id ? companyMap.get(a.company_id) : null;
 35:   const compB = b.company_id ? companyMap.get(b.company_id) : null;
 36: 
 37:   const hasA = compA != null && compA.avgProfitMargin != null && compA.completedEventCount > 0;
 38:   const hasB = compB != null && compB.avgProfitMargin != null && compB.completedEventCount > 0;
 39: 
 40:   let recommendation = '';
 41:   if (hasA && hasB) {
 42:     const winner = compA!.avgProfitMargin! >= compB!.avgProfitMargin!
 43:       ? { event: a, comp: compA! }
 44:       : { event: b, comp: compB! };
 45:     const loser = winner.event === a ? { event: b, comp: compB! } : { event: a, comp: compA! };
 46:     recommendation = `Prioritise "${winner.event.name}" — ${winner.comp.name} avg ${winner.comp.avgProfitMargin!.toFixed(0)}% margin across ${winner.comp.completedEventCount} event${winner.comp.completedEventCount > 1 ? 's' : ''} vs ${loser.comp.avgProfitMargin!.toFixed(0)}% for ${loser.comp.name}.`;
 47:   } else if (hasA) {
 48:     recommendation = `"${a.name}" via ${compA!.name} has ${compA!.completedEventCount} past event${compA!.completedEventCount > 1 ? 's' : ''} (avg ${compA!.avgProfitMargin!.toFixed(0)}% margin). No history for "${b.name}" yet.`;
 49:   } else if (hasB) {
 50:     recommendation = `"${b.name}" via ${compB!.name} has ${compB!.completedEventCount} past event${compB!.completedEventCount > 1 ? 's' : ''} (avg ${compB!.avgProfitMargin!.toFixed(0)}% margin). No history for "${a.name}" yet.`;
 51:   }
 52: 
 53:   return (
 54:     <View style={{ backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 16, padding: 14, marginBottom: 12 }}>
 55:       <Text style={{ color: '#c2410c', fontWeight: '700', fontSize: 13, marginBottom: 4 }}>⚡ Schedule Conflict</Text>
 56:       <Text style={{ color: '#ea580c', fontSize: 12, marginBottom: 6 }}>
 57:         "{a.name}" ({formatDateRange(a.date, a.end_date)}) overlaps with "{b.name}" ({formatDateRange(b.date, b.end_date)}).
 58:       </Text>
 59:       {hasA && (
 60:         <Text style={{ color: '#9a3412', fontSize: 11, marginTop: 2 }}>
 61:           • {compA!.name}: Avg {compA!.avgProfitMargin!.toFixed(0)}% margin ({compA!.completedEventCount} event{compA!.completedEventCount > 1 ? 's' : ''})
 62:         </Text>
 63:       )}
 64:       {hasB && (
 65:         <Text style={{ color: '#9a3412', fontSize: 11, marginTop: 2 }}>
 66:           • {compB!.name}: Avg {compB!.avgProfitMargin!.toFixed(0)}% margin ({compB!.completedEventCount} event{compB!.completedEventCount > 1 ? 's' : ''})
 67:         </Text>
 68:       )}
 69:       {!hasA && !hasB && (
 70:         <Text style={{ color: '#9a3412', fontSize: 11, marginTop: 2 }}>No historical data yet to rank these events.</Text>
 71:       )}
 72:       {recommendation ? (
 73:         <Text style={{ color: '#c2410c', fontSize: 12, fontWeight: '600', marginTop: 6 }}>→ {recommendation}</Text>
 74:       ) : null}
 75:     </View>
 76:   );
 77: }
 78: 
 79: function SectionHeader({ title, count }: { title: string; count: number }) {
 80:   return (
 81:     <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 }}>
 82:       <Text style={{ fontSize: 11, fontWeight: '700', color: '#78716c', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</Text>
 83:       <Text style={{ fontSize: 11, color: '#a8a29e' }}>{count}</Text>
 84:     </View>
 85:   );
 86: }
 87: 
 88: export default function EventsScreen() {
 89:   const insets = useSafeAreaInsets();
 90:   const router = useRouter();
 91:   const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
 92:   const [yearFilter, setYearFilter] = useState<number | undefined>(undefined);
 93:   const [viewFilter, setViewFilter] = useState<'upcoming' | 'completed' | 'all'>('upcoming');
 94:   const [searchQuery, setSearchQuery] = useState('');
 95:   const [refreshing, setRefreshing] = useState(false);
 96: 
 97:   const { data: eventsRaw, isLoading, isError, error, refetch } = useEvents({ status: statusFilter, year: yearFilter });
 98:   const { data: companies } = useCompanies();
 99: 
100:   async function handleRefresh() {
101:     setRefreshing(true);
102:     await refetch();
103:     setRefreshing(false);
104:   }
105: 
106:   const today = new Date().toISOString().split('T')[0];
107: 
108:   const events = useMemo(() => {
109:     const q = searchQuery.trim().toLowerCase();
110:     const sorted = [...(eventsRaw ?? [])].sort((a, b) => a.date.localeCompare(b.date));
111:     if (!q) return sorted;
112:     return sorted.filter(
113:       (e) => e.name.toLowerCase().includes(q) || e.location.toLowerCase().includes(q),
114:     );
115:   }, [eventsRaw, searchQuery]);
116: 
117:   const upcoming = useMemo(() => events.filter((e) => (e.end_date ?? e.date) >= today), [events, today]);
118:   const completed = useMemo(() => events.filter((e) => (e.end_date ?? e.date) < today), [events, today]);
119: 
120:   const companyMap = useMemo(() => {
121:     const m = new Map<string, CompanyWithStats>();
122:     companies?.forEach((c) => m.set(c.id, c));
123:     return m;
124:   }, [companies]);
125: 
126:   const overlappingPairs = useMemo(() => {
127:     const pairs: Array<{ a: EventWithFinancials; b: EventWithFinancials }> = [];
128:     const upcomingAccepted = upcoming.filter((e) => e.status === 'accepted' || e.status === 'pending' || e.status === 'waitlisted');
129:     for (let i = 0; i < upcomingAccepted.length; i++) {
130:       for (let j = i + 1; j < upcomingAccepted.length; j++) {
131:         if (eventsOverlap(upcomingAccepted[i], upcomingAccepted[j])) {
132:           pairs.push({ a: upcomingAccepted[i], b: upcomingAccepted[j] });
133:         }
134:       }
135:     }
136:     return pairs;
137:   }, [upcoming]);
138: 
139:   const totalRevenue = events.reduce((s, e) => s + (e.event_financials?.gross_sales ?? 0), 0);
140:   const totalNet = events.reduce((s, e) => s + e.calculations.netProfit, 0);
141: 
142:   type RowItem =
143:     | { kind: 'banner'; id: string; a: EventWithFinancials; b: EventWithFinancials }
144:     | { kind: 'section'; id: string; title: string; count: number }
145:     | { kind: 'event'; id: string; event: EventWithFinancials };
146: 
147:   const rowItems = useMemo<RowItem[]>(() => {
148:     const items: RowItem[] = [];
149:     if (viewFilter !== 'completed') {
150:       overlappingPairs.forEach(({ a, b }, i) => {
151:         items.push({ kind: 'banner', id: `banner-${i}-${a.id}-${b.id}`, a, b });
152:       });
153:     }
154:     if (viewFilter !== 'completed' && upcoming.length > 0) {
155:       if (viewFilter === 'all') {
156:         items.push({ kind: 'section', id: 'sec-upcoming', title: 'Upcoming', count: upcoming.length });
157:       }
158:       upcoming.forEach((e) => items.push({ kind: 'event', id: e.id, event: e }));
159:     }
160:     if (viewFilter !== 'upcoming' && completed.length > 0) {
161:       if (viewFilter === 'all') {
162:         items.push({ kind: 'section', id: 'sec-completed', title: 'Completed', count: completed.length });
163:       }
164:       completed.forEach((e) => items.push({ kind: 'event', id: e.id, event: e }));
165:     }
166:     return items;
167:   }, [viewFilter, overlappingPairs, upcoming, completed]);
168: 
169:   return (
170:     <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
171:       {/* Header */}
172:       <View className="px-4 pt-2 pb-3 bg-white border-b border-stone-100">
173:         <View className="flex-row items-center justify-between mb-3">
174:           <Text className="text-2xl font-bold text-stone-900">Events</Text>
175:           <TouchableOpacity
176:             onPress={() => router.push('/(tabs)/events/new')}
177:             accessibilityRole="button"
178:             accessibilityLabel="Add new event"
179:             className="bg-amber-700 px-4 py-2 rounded-xl"
180:           >
181:             <Text className="text-white font-semibold text-sm">+ New</Text>
182:           </TouchableOpacity>
183:         </View>
184: 
185:         {/* Search */}
186:         <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f4', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, gap: 8 }}>
187:           <Text style={{ color: '#a8a29e', fontSize: 14 }}>🔍</Text>
188:           <TextInput
189:             value={searchQuery}
190:             onChangeText={setSearchQuery}
191:             placeholder="Search events or locations..."
192:             placeholderTextColor="#a8a29e"
193:             style={{ flex: 1, fontSize: 14, color: '#1c1917', padding: 0 }}
194:             clearButtonMode="while-editing"
195:             returnKeyType="search"
196:           />
197:         </View>
198: 
199:         {/* Upcoming / Completed / All tabs */}
200:         <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }} accessibilityRole="radiogroup">
201:           {(['upcoming', 'completed', 'all'] as const).map((v) => {
202:             const labels = { upcoming: 'Upcoming', completed: 'Completed', all: 'All' };
203:             const isActive = viewFilter === v;
204:             return (
205:               <TouchableOpacity
206:                 key={v}
207:                 onPress={() => setViewFilter(v)}
208:                 accessibilityRole="radio"
209:                 accessibilityLabel={`Show ${labels[v].toLowerCase()} events`}
210:                 accessibilityState={{ selected: isActive }}
211:                 style={{
212:                   flex: 1, paddingVertical: 7, borderRadius: 10, alignItems: 'center',
213:                   backgroundColor: isActive ? '#1c1917' : '#f5f5f4',
214:                 }}
215:               >
216:                 <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? '#ffffff' : '#57534e' }}>
217:                   {labels[v]}
218:                 </Text>
219:               </TouchableOpacity>
220:             );
221:           })}
222:         </View>
223: 
224:         {/* Status filters */}
225:         <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} accessibilityRole="radiogroup">
226:           <TouchableOpacity
227:             onPress={() => setStatusFilter('all')}
228:             accessibilityRole="radio"
229:             accessibilityLabel="Show all statuses"
230:             accessibilityState={{ selected: statusFilter === 'all' }}
231:             style={{
232:               paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1,
233:               backgroundColor: statusFilter === 'all' ? '#1c1917' : '#ffffff',
234:               borderColor: statusFilter === 'all' ? '#1c1917' : '#d6d3d1',
235:             }}
236:           >
237:             <Text style={{ fontSize: 12, fontWeight: '500', color: statusFilter === 'all' ? '#ffffff' : '#57534e' }}>All</Text>
238:           </TouchableOpacity>
239:           {STATUSES.map((s) => (
240:             <TouchableOpacity
241:               key={s}
242:               onPress={() => setStatusFilter(statusFilter === s ? 'all' : s)}
243:               accessibilityRole="radio"
244:               accessibilityLabel={`Filter by ${STATUS_LABELS[s]}`}
245:               accessibilityState={{ selected: statusFilter === s }}
246:               style={{
247:                 paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1,
248:                 backgroundColor: statusFilter === s ? '#1c1917' : '#ffffff',
249:                 borderColor: statusFilter === s ? '#1c1917' : '#d6d3d1',
250:               }}
251:             >
252:               <Text style={{ fontSize: 12, fontWeight: '500', color: statusFilter === s ? '#ffffff' : '#57534e' }}>
253:                 {STATUS_LABELS[s]}
254:               </Text>
255:             </TouchableOpacity>
256:           ))}
257:         </ScrollView>
258: 
259:         {/* Year filters */}
260:         <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 6 }} accessibilityRole="radiogroup">
261:           <TouchableOpacity
262:             onPress={() => setYearFilter(undefined)}
263:             accessibilityRole="radio"
264:             accessibilityLabel="Show events from all years"
265:             accessibilityState={{ selected: !yearFilter }}
266:             style={{
267:               paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
268:               backgroundColor: !yearFilter ? '#fef3c7' : '#ffffff',
269:               borderColor: !yearFilter ? '#fcd34d' : '#d6d3d1',
270:             }}
271:           >
272:             <Text style={{ fontSize: 12, fontWeight: '500', color: !yearFilter ? '#92400e' : '#78716c' }}>All Years</Text>
273:           </TouchableOpacity>
274:           {YEARS.map((y) => (
275:             <TouchableOpacity
276:               key={y}
277:               onPress={() => setYearFilter(yearFilter === y ? undefined : y)}
278:               accessibilityRole="radio"
279:               accessibilityLabel={`Filter by year ${y}`}
280:               accessibilityState={{ selected: yearFilter === y }}
281:               style={{
282:                 paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
283:                 backgroundColor: yearFilter === y ? '#fef3c7' : '#ffffff',
284:                 borderColor: yearFilter === y ? '#fcd34d' : '#d6d3d1',
285:               }}
286:             >
287:               <Text style={{ fontSize: 12, fontWeight: '500', color: yearFilter === y ? '#92400e' : '#78716c' }}>{y}</Text>
288:             </TouchableOpacity>
289:           ))}
290:         </ScrollView>
291:       </View>
292: 
293:       {/* Summary strip */}
294:       {events.length > 0 && (
295:         <View className="flex-row bg-white px-4 py-2 border-b border-stone-100 gap-6">
296:           <Text className="text-stone-500 text-xs">{events.length} event{events.length !== 1 ? 's' : ''}</Text>
297:           {totalRevenue > 0 && (
298:             <Text className="text-stone-500 text-xs">Sales: <Text className="text-stone-700 font-medium">£{totalRevenue.toFixed(0)}</Text></Text>
299:           )}
300:           {totalNet !== 0 && (
301:             <Text className="text-stone-500 text-xs">Net: <Text className={`font-medium ${totalNet >= 0 ? 'text-green-600' : 'text-red-500'}`}>£{totalNet.toFixed(0)}</Text></Text>
302:           )}
303:         </View>
304:       )}
305: 
306:       {isLoading ? (
307:         <LoadingSpinner message="Loading events..." />
308:       ) : isError ? (
309:         <QueryError error={error} onRetry={refetch} message="Couldn't load events" />
310:       ) : events.length === 0 ? (
311:         <ScrollView
312:           className="flex-1 px-4 pt-4"
313:           keyboardDismissMode="on-drag"
314:           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" colors={["#b45309"]} />}
315:         >
316:           <EmptyState
317:             icon="🎪"
318:             title="No events yet"
319:             description="Apply to your first event and track it here."
320:             action={{ label: '+ Add Event', onPress: () => router.push('/(tabs)/events/new') }}
321:             tip="Tip: You can import events from the Discover tab"
322:           />
323:         </ScrollView>
324:       ) : rowItems.length === 0 ? (
325:         <ScrollView
326:           className="flex-1 px-4 pt-4"
327:           keyboardDismissMode="on-drag"
328:           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" colors={["#b45309"]} />}
329:         >
330:           {viewFilter === 'upcoming' ? (
331:             <EmptyState icon="📅" title="No upcoming events" description="All events are in the past." />
332:           ) : viewFilter === 'completed' ? (
333:             <EmptyState icon="✅" title="No completed events" description="Events that have passed will appear here." />
334:           ) : null}
335:         </ScrollView>
336:       ) : (
337:         <View className="flex-1 px-4 pt-4">
338:           <FlashList
339:             data={rowItems}
340:             keyExtractor={(item) => item.id}
341:             estimatedItemSize={140}
342:             keyboardDismissMode="on-drag"
343:             getItemType={(item) => item.kind}
344:             refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" colors={["#b45309"]} />}
345:             ListFooterComponent={<View style={{ height: 32 }} />}
346:             renderItem={({ item }) => {
347:               if (item.kind === 'banner') return <OverlapBanner a={item.a} b={item.b} companyMap={companyMap} />;
348:               if (item.kind === 'section') return <SectionHeader title={item.title} count={item.count} />;
349:               return <EventCard event={item.event} />;
350:             }}
351:           />
352:         </View>
353:       )}
354:     </View>
355:   );
356: }
````

## File: app/(tabs)/events/new.tsx
````typescript
 1: import React from 'react';
 2: import { View, Text, TouchableOpacity, Alert } from 'react-native';
 3: import { useSafeAreaInsets } from 'react-native-safe-area-context';
 4: import { useRouter } from 'expo-router';
 5: import { EventForm } from '@/components/events/EventForm';
 6: import { useCreateEvent } from '@/lib/mutations/events';
 7: import { useCompanies } from '@/lib/queries/companies';
 8: import { useUnits } from '@/lib/queries/units';
 9: import { useAuth } from '@/lib/auth';
10: 
11: export default function NewEventScreen() {
12:   const insets = useSafeAreaInsets();
13:   const router = useRouter();
14:   const { user } = useAuth();
15:   const createEvent = useCreateEvent();
16:   const { data: companies = [] } = useCompanies();
17:   const { data: units = [] } = useUnits();
18: 
19:   return (
20:     <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
21:       <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-stone-100">
22:         <Text className="text-lg font-bold text-stone-900">New Event</Text>
23:         <TouchableOpacity onPress={() => router.back()}>
24:           <Text className="text-stone-500">Cancel</Text>
25:         </TouchableOpacity>
26:       </View>
27:       <EventForm
28:         companies={companies}
29:         units={units}
30:         onSubmit={async (data) => {
31:           if (!user) { Alert.alert('Not signed in', 'Please sign in to create events.'); return; }
32:           await createEvent.mutateAsync({ data, userId: user.id });
33:         }}
34:         submitLabel="Create Event"
35:       />
36:     </View>
37:   );
38: }
````

## File: app/(tabs)/fleet/[id]/edit.tsx
````typescript
 1: import React from 'react';
 2: import { View } from 'react-native';
 3: import { useSafeAreaInsets } from 'react-native-safe-area-context';
 4: import { useLocalSearchParams, useRouter } from 'expo-router';
 5: import { UnitForm } from '@/components/units/UnitForm';
 6: import { PageHeader } from '@/components/shared/PageHeader';
 7: import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
 8: import { useUnit } from '@/lib/queries/units';
 9: import { useUpdateUnit } from '@/lib/mutations/units';
10: import type { UnitFormValues } from '@/types';
11: 
12: export default function EditUnitScreen() {
13:   const insets = useSafeAreaInsets();
14:   const { id } = useLocalSearchParams<{ id: string }>();
15:   const router = useRouter();
16: 
17:   const { data: unit, isLoading } = useUnit(id);
18:   const updateUnit = useUpdateUnit();
19: 
20:   if (isLoading) return <LoadingSpinner message="Loading unit..." />;
21:   if (!unit) return null;
22: 
23:   async function handleSubmit(data: UnitFormValues) {
24:     await updateUnit.mutateAsync({ id, data });
25:     router.back();
26:   }
27: 
28:   return (
29:     <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
30:       <View className="bg-white border-b border-stone-100">
31:         <PageHeader title="Edit Unit" backButton />
32:       </View>
33:       <UnitForm
34:         defaultValues={{
35:           name: unit.name,
36:           registration: unit.registration ?? '',
37:           notes: unit.notes ?? '',
38:           status: unit.status,
39:           vehicle_type: unit.vehicle_type ?? '',
40:           height_m: unit.height_m ?? null,
41:           length_m: unit.length_m ?? null,
42:           width_m: unit.width_m ?? null,
43:           mot_date: unit.mot_date ?? '',
44:           tax_date: unit.tax_date ?? '',
45:           service_date: unit.service_date ?? '',
46:           service_interval: (unit.service_interval as '6months' | '1year') ?? '1year',
47:         }}
48:         onSubmit={handleSubmit}
49:         submitLabel="Save Changes"
50:       />
51:     </View>
52:   );
53: }
````

## File: app/(tabs)/fleet/[id]/index.tsx
````typescript
  1: import React, { useState } from 'react';
  2: import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
  3: import { useSafeAreaInsets } from 'react-native-safe-area-context';
  4: import { useLocalSearchParams, useRouter } from 'expo-router';
  5: import { useUnit, useDeleteUnit } from '@/lib/queries/units';
  6: import { useEvents } from '@/lib/queries/events';
  7: import { EventCard } from '@/components/events/EventCard';
  8: import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
  9: import { EmptyState } from '@/components/shared/EmptyState';
 10: import { formatDateRange, formatDate } from '@/lib/formatters';
 11: import { UNIT_STATUS_LABELS, UNIT_STATUS_COLORS } from '@/constants';
 12: import type { UnitStatus } from '@/types';
 13: 
 14: export default function UnitDetailScreen() {
 15:   const insets = useSafeAreaInsets();
 16:   const { id } = useLocalSearchParams<{ id: string }>();
 17:   const router = useRouter();
 18: 
 19:   const { data: unit, isLoading, refetch } = useUnit(id);
 20:   const { data: events, refetch: refetchEvents } = useEvents({ unitId: id });
 21:   const deleteUnit = useDeleteUnit();
 22: 
 23:   const [refreshing, setRefreshing] = useState(false);
 24: 
 25:   async function handleRefresh() {
 26:     setRefreshing(true);
 27:     await Promise.all([refetch(), refetchEvents()]);
 28:     setRefreshing(false);
 29:   }
 30: 
 31:   async function handleDelete() {
 32:     try {
 33:       await deleteUnit.mutateAsync(id);
 34:       router.back();
 35:     } catch (e: any) {
 36:       Alert.alert('Error', e.message);
 37:     }
 38:   }
 39: 
 40:   if (isLoading) return <LoadingSpinner message="Loading unit..." />;
 41:   if (!unit) {
 42:     return (
 43:       <View className="flex-1 items-center justify-center">
 44:         <Text className="text-stone-500">Unit not found</Text>
 45:       </View>
 46:     );
 47:   }
 48: 
 49:   const status = unit.status as UnitStatus;
 50:   const colors = UNIT_STATUS_COLORS[status];
 51:   const unitEvents = events ?? [];
 52: 
 53:   function expiryInfo(dateStr: string | null): { text: string; color: string } | null {
 54:     if (!dateStr) return null;
 55:     const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
 56:     if (days < 0) return { text: `Expired ${Math.abs(days)}d ago`, color: '#dc2626' };
 57:     if (days <= 30) return { text: `Due in ${days} day${days !== 1 ? 's' : ''}`, color: '#d97706' };
 58:     return { text: formatDate(dateStr), color: '#059669' };
 59:   }
 60: 
 61:   function serviceDueDate(serviceDate: string | null, interval: string | null): string | null {
 62:     if (!serviceDate) return null;
 63:     const d = new Date(serviceDate);
 64:     if (interval === '6months') d.setMonth(d.getMonth() + 6);
 65:     else d.setFullYear(d.getFullYear() + 1);
 66:     return d.toISOString().split('T')[0];
 67:   }
 68: 
 69:   const serviceDue = serviceDueDate(unit.service_date, unit.service_interval);
 70: 
 71:   const today = new Date().toISOString().split('T')[0];
 72:   const upcomingEvent = [...unitEvents]
 73:     .filter((e) => e.status === 'accepted' && e.date >= today)
 74:     .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
 75: 
 76:   return (
 77:     <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
 78:       {/* Header */}
 79:       <View className="bg-white border-b border-stone-100">
 80:         <View style={{ height: 4, backgroundColor: colors.dot }} />
 81:         <View className="px-4 pt-3 pb-4">
 82:           <View className="flex-row items-center justify-between mb-2">
 83:             <TouchableOpacity
 84:               onPress={() => router.back()}
 85:               accessibilityRole="button"
 86:               accessibilityLabel="Back to fleet"
 87:               className="flex-row items-center"
 88:             >
 89:               <Text className="text-amber-500 font-semibold text-sm">‹ Fleet</Text>
 90:             </TouchableOpacity>
 91:             <TouchableOpacity
 92:               onPress={() => router.push(`/(tabs)/fleet/${id}/edit`)}
 93:               accessibilityRole="button"
 94:               accessibilityLabel="Edit unit"
 95:               className="bg-stone-900 px-4 py-1.5 rounded-xl"
 96:             >
 97:               <Text className="text-white font-semibold text-sm">Edit</Text>
 98:             </TouchableOpacity>
 99:           </View>
100: 
101:           <Text className="text-xl font-bold text-stone-900 mb-1">{unit.name}</Text>
102: 
103:           <View className="flex-row items-center gap-2 flex-wrap">
104:             <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.bgHex }}>
105:               <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dot, marginRight: 5 }} />
106:               <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textHex }}>{UNIT_STATUS_LABELS[status]}</Text>
107:             </View>
108:             {unit.registration && (
109:               <Text className="text-stone-500 text-sm font-medium tracking-wide">{unit.registration}</Text>
110:             )}
111:           </View>
112:         </View>
113:       </View>
114: 
115:       <ScrollView
116:         className="flex-1 px-4 pt-4"
117:         refreshControl={
118:           <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />
119:         }
120:       >
121:         {/* Current / upcoming event highlight */}
122:         {upcomingEvent && (
123:           <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
124:             <Text className="text-amber-700 text-xs font-semibold uppercase tracking-wide mb-1">
125:               Upcoming Event
126:             </Text>
127:             <Text className="font-bold text-stone-900 text-base">{upcomingEvent.name}</Text>
128:             <Text className="text-stone-600 text-sm mt-0.5">
129:               📅 {formatDateRange(upcomingEvent.date, upcomingEvent.end_date)}
130:             </Text>
131:             <Text className="text-stone-500 text-sm mt-0.5" numberOfLines={1}>
132:               📍 {upcomingEvent.location}
133:             </Text>
134:           </View>
135:         )}
136: 
137:         {/* Dimensions */}
138:         {(unit.height_m != null || unit.length_m != null || unit.width_m != null) && (
139:           <View className="bg-white rounded-2xl p-4 border border-stone-100 mb-4">
140:             <Text className="font-bold text-stone-900 mb-3">Dimensions</Text>
141:             <View style={{ flexDirection: 'row', gap: 12 }}>
142:               {unit.height_m != null && (
143:                 <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, alignItems: 'center' }}>
144:                   <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>{unit.height_m.toFixed(1)}</Text>
145:                   <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Height (m)</Text>
146:                 </View>
147:               )}
148:               {unit.length_m != null && (
149:                 <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, alignItems: 'center' }}>
150:                   <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>{unit.length_m.toFixed(1)}</Text>
151:                   <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Length (m)</Text>
152:                 </View>
153:               )}
154:               {unit.width_m != null && (
155:                 <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, alignItems: 'center' }}>
156:                   <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>{unit.width_m.toFixed(1)}</Text>
157:                   <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Width (m)</Text>
158:                 </View>
159:               )}
160:             </View>
161:           </View>
162:         )}
163: 
164:         {/* Vehicle dates */}
165:         {(unit.mot_date || unit.tax_date || unit.service_date) && (
166:           <View className="bg-white rounded-2xl p-4 border border-stone-100 mb-4">
167:             <Text className="font-bold text-stone-900 mb-3">Compliance Dates</Text>
168:             {[
169:               { label: 'MOT Expiry', dateStr: unit.mot_date, info: expiryInfo(unit.mot_date) },
170:               { label: 'Tax (VED) Expiry', dateStr: unit.tax_date, info: expiryInfo(unit.tax_date) },
171:               { label: 'Next Service Due', dateStr: serviceDue, info: expiryInfo(serviceDue) },
172:             ].filter(row => row.dateStr).map(({ label, info }) => (
173:               <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#fafaf9' }}>
174:                 <Text style={{ fontSize: 13, color: '#78716c' }}>{label}</Text>
175:                 {info && (
176:                   <Text style={{ fontSize: 13, fontWeight: '600', color: info.color }}>{info.text}</Text>
177:                 )}
178:               </View>
179:             ))}
180:           </View>
181:         )}
182: 
183:         {/* Notes */}
184:         {unit.notes && (
185:           <View className="bg-white rounded-2xl p-4 border border-stone-100 mb-4">
186:             <Text className="font-bold text-stone-900 mb-1">Notes</Text>
187:             <Text className="text-stone-600 text-sm leading-relaxed">{unit.notes}</Text>
188:           </View>
189:         )}
190: 
191:         {/* Events list */}
192:         <Text className="font-bold text-stone-900 mb-3">Events</Text>
193:         {unitEvents.length === 0 ? (
194:           <EmptyState
195:             icon="🎪"
196:             title="No events yet"
197:             description="No events have been assigned to this unit."
198:           />
199:         ) : (
200:           unitEvents.map((event) => <EventCard key={event.id} event={event} />)
201:         )}
202: 
203:         <View className="bg-white rounded-2xl p-4 border border-stone-100 mt-4">
204:           <TouchableOpacity
205:             onPress={() =>
206:               Alert.alert(
207:                 'Delete Vehicle',
208:                 `Delete "${unit.name}"? This cannot be undone.`,
209:                 [
210:                   { text: 'Cancel', style: 'cancel' },
211:                   { text: 'Delete', style: 'destructive', onPress: handleDelete },
212:                 ],
213:               )
214:             }
215:             className="border border-red-200 py-3 rounded-xl items-center"
216:           >
217:             <Text className="text-red-500 font-medium text-sm">Delete Vehicle</Text>
218:           </TouchableOpacity>
219:         </View>
220: 
221:         <View style={{ height: 40 }} />
222:       </ScrollView>
223:     </View>
224:   );
225: }
````

## File: app/(tabs)/fleet/_layout.tsx
````typescript
1: import { Stack } from 'expo-router';
2: 
3: export default function FleetLayout() {
4:   return <Stack screenOptions={{ headerShown: false }} />;
5: }
````

## File: app/(tabs)/fleet/index.tsx
````typescript
  1: import React, { useState } from 'react';
  2: import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
  3: import { useSafeAreaInsets } from 'react-native-safe-area-context';
  4: import { useRouter } from 'expo-router';
  5: import { useDashboard } from '@/lib/queries/dashboard';
  6: import { useUnits } from '@/lib/queries/units';
  7: import { UnitCard } from '@/components/units/UnitCard';
  8: import { EmptyState } from '@/components/shared/EmptyState';
  9: import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
 10: import { QueryError } from '@/components/shared/QueryError';
 11: import type { UnitWithStatus } from '@/types';
 12: 
 13: export default function FleetScreen() {
 14:   const insets = useSafeAreaInsets();
 15:   const router = useRouter();
 16:   const [refreshing, setRefreshing] = useState(false);
 17: 
 18:   const { data: dashboardStats, isLoading: dashboardLoading, refetch: refetchDashboard } = useDashboard();
 19:   const { data: rawUnits, isLoading: unitsLoading, isError, error, refetch: refetchUnits } = useUnits();
 20: 
 21:   const isLoading = dashboardLoading && unitsLoading;
 22: 
 23:   // Prefer dashboard unitStatuses (includes currentEvent), fall back to raw units
 24:   const units: UnitWithStatus[] = dashboardStats?.unitStatuses
 25:     ?? (rawUnits?.map((u) => ({ ...u, currentEvent: null })) ?? []);
 26: 
 27:   const activeCount = units.filter((u) => u.status === 'active').length;
 28:   const maintenanceCount = units.filter((u) => u.status === 'maintenance').length;
 29: 
 30:   async function handleRefresh() {
 31:     setRefreshing(true);
 32:     await Promise.all([refetchDashboard(), refetchUnits()]);
 33:     setRefreshing(false);
 34:   }
 35: 
 36:   return (
 37:     <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
 38:       {/* Header */}
 39:       <View className="px-4 pt-2 pb-3 bg-white border-b border-stone-100">
 40:         <View className="flex-row items-center justify-between mb-2">
 41:           <Text className="text-2xl font-bold text-stone-900">Your Fleet</Text>
 42:           <TouchableOpacity
 43:             onPress={() => router.push('/(tabs)/fleet/new')}
 44:             accessibilityRole="button"
 45:             accessibilityLabel="Add new unit"
 46:             className="bg-amber-700 px-4 py-2 rounded-xl"
 47:           >
 48:             <Text className="text-white font-semibold text-sm">+ Add Unit</Text>
 49:           </TouchableOpacity>
 50:         </View>
 51: 
 52:         {units.length > 0 && (
 53:           <View className="flex-row gap-2">
 54:             {activeCount > 0 && (
 55:               <View className="bg-green-100 px-3 py-1 rounded-full">
 56:                 <Text className="text-green-800 text-xs font-semibold">{activeCount} active</Text>
 57:               </View>
 58:             )}
 59:             {maintenanceCount > 0 && (
 60:               <View className="bg-amber-100 px-3 py-1 rounded-full">
 61:                 <Text className="text-amber-800 text-xs font-semibold">{maintenanceCount} in maintenance</Text>
 62:               </View>
 63:             )}
 64:           </View>
 65:         )}
 66:       </View>
 67: 
 68:       {isLoading ? (
 69:         <LoadingSpinner message="Loading fleet..." />
 70:       ) : isError ? (
 71:         <QueryError error={error} onRetry={refetchUnits} message="Couldn't load fleet" />
 72:       ) : (
 73:         <ScrollView
 74:           className="flex-1 px-4 pt-4"
 75:           refreshControl={
 76:             <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />
 77:           }
 78:         >
 79:           {units.length === 0 ? (
 80:             <EmptyState
 81:               icon="🚐"
 82:               title="No units added yet"
 83:               description="Add your coffee trucks and vans to track where they are."
 84:               action={{ label: 'Add First Unit', onPress: () => router.push('/(tabs)/fleet/new') }}
 85:             />
 86:           ) : (
 87:             units.map((unit) => (
 88:               <UnitCard
 89:                 key={unit.id}
 90:                 unit={unit}
 91:                 currentEvent={unit.currentEvent}
 92:                 onPress={() => router.push(`/(tabs)/fleet/${unit.id}`)}
 93:               />
 94:             ))
 95:           )}
 96:           <View style={{ height: 32 }} />
 97:         </ScrollView>
 98:       )}
 99:     </View>
100:   );
101: }
````

## File: app/(tabs)/fleet/new.tsx
````typescript
 1: import React from 'react';
 2: import { View, Alert } from 'react-native';
 3: import { useSafeAreaInsets } from 'react-native-safe-area-context';
 4: import { useRouter } from 'expo-router';
 5: import { UnitForm } from '@/components/units/UnitForm';
 6: import { PageHeader } from '@/components/shared/PageHeader';
 7: import { useCreateUnit } from '@/lib/mutations/units';
 8: import { useAuth } from '@/lib/auth';
 9: import type { UnitFormValues } from '@/types';
10: 
11: export default function NewUnitScreen() {
12:   const insets = useSafeAreaInsets();
13:   const router = useRouter();
14:   const { user } = useAuth();
15:   const createUnit = useCreateUnit();
16: 
17:   async function handleSubmit(data: UnitFormValues) {
18:     if (!user) {
19:       Alert.alert('Error', 'You must be signed in to add a unit.');
20:       return;
21:     }
22:     await createUnit.mutateAsync({ data, userId: user.id });
23:     router.back();
24:   }
25: 
26:   return (
27:     <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
28:       <View className="bg-white border-b border-stone-100">
29:         <PageHeader title="Add Unit" backButton />
30:       </View>
31:       <UnitForm onSubmit={handleSubmit} submitLabel="Add Unit" />
32:     </View>
33:   );
34: }
````

## File: app/(tabs)/_layout.tsx
````typescript
 1: import React from 'react';
 2: import { Tabs } from 'expo-router';
 3: import { Ionicons } from '@expo/vector-icons';
 4: import * as Haptics from 'expo-haptics';
 5: 
 6: type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
 7: 
 8: function TabIcon({
 9:   name,
10:   focused,
11:   color,
12: }: {
13:   name: { filled: IoniconName; outline: IoniconName };
14:   focused: boolean;
15:   color: string;
16: }) {
17:   return <Ionicons name={focused ? name.filled : name.outline} size={22} color={color} />;
18: }
19: 
20: const ICONS: Record<string, { filled: IoniconName; outline: IoniconName }> = {
21:   dashboard: { filled: 'bar-chart', outline: 'bar-chart-outline' },
22:   events: { filled: 'calendar-number', outline: 'calendar-number-outline' },
23:   calendar: { filled: 'calendar', outline: 'calendar-outline' },
24:   fleet: { filled: 'car', outline: 'car-outline' },
25:   companies: { filled: 'business', outline: 'business-outline' },
26:   discover: { filled: 'compass', outline: 'compass-outline' },
27:   settings: { filled: 'settings', outline: 'settings-outline' },
28: };
29: 
30: const TAB_LISTENERS = {
31:   tabPress: () => {
32:     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
33:   },
34: };
35: 
36: export default function TabLayout() {
37:   return (
38:     <Tabs
39:       screenOptions={{
40:         headerShown: false,
41:         tabBarStyle: { backgroundColor: '#1c1917', borderTopColor: '#292524', paddingBottom: 4 },
42:         tabBarActiveTintColor: '#f59e0b',
43:         tabBarInactiveTintColor: '#78716c',
44:         tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
45:       }}
46:     >
47:       <Tabs.Screen name="dashboard" listeners={TAB_LISTENERS} options={{ title: 'Dashboard', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.dashboard} focused={focused} color={color} /> }} />
48:       <Tabs.Screen name="events" listeners={TAB_LISTENERS} options={{ title: 'Events', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.events} focused={focused} color={color} /> }} />
49:       <Tabs.Screen name="calendar" listeners={TAB_LISTENERS} options={{ title: 'Calendar', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.calendar} focused={focused} color={color} /> }} />
50:       <Tabs.Screen name="fleet" listeners={TAB_LISTENERS} options={{ title: 'Fleet', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.fleet} focused={focused} color={color} /> }} />
51:       <Tabs.Screen name="companies" listeners={TAB_LISTENERS} options={{ title: 'Companies', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.companies} focused={focused} color={color} /> }} />
52:       <Tabs.Screen name="discover" listeners={TAB_LISTENERS} options={{ title: 'Discover', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.discover} focused={focused} color={color} /> }} />
53:       <Tabs.Screen name="settings" listeners={TAB_LISTENERS} options={{ title: 'Settings', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.settings} focused={focused} color={color} /> }} />
54:       <Tabs.Screen name="reports" options={{ href: null }} />
55:     </Tabs>
56:   );
57: }
````

## File: app/(tabs)/calendar.tsx
````typescript
 1: import React, { useState } from 'react';
 2: import { View, Text, RefreshControl, ScrollView } from 'react-native';
 3: import { useSafeAreaInsets } from 'react-native-safe-area-context';
 4: import { useEvents } from '@/lib/queries/events';
 5: import { CalendarView } from '@/components/events/CalendarView';
 6: import { EmptyState } from '@/components/shared/EmptyState';
 7: import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
 8: 
 9: export default function CalendarScreen() {
10:   const insets = useSafeAreaInsets();
11:   const [refreshing, setRefreshing] = useState(false);
12: 
13:   // Show all active events (exclude rejected and withdrawn)
14:   const { data: allEvents = [], isLoading, refetch } = useEvents();
15:   const events = allEvents.filter(
16:     (e) => e.status !== 'rejected' && e.status !== 'withdrawn',
17:   );
18: 
19:   async function handleRefresh() {
20:     setRefreshing(true);
21:     await refetch();
22:     setRefreshing(false);
23:   }
24: 
25:   return (
26:     <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
27:       {/* Header */}
28:       <View className="px-4 pt-2 pb-3 bg-white border-b border-stone-100">
29:         <Text className="text-2xl font-bold text-stone-900">Calendar</Text>
30:         <Text className="text-stone-500 text-xs mt-0.5">Accepted, waitlisted &amp; pending events</Text>
31:       </View>
32: 
33:       {isLoading ? (
34:         <LoadingSpinner message="Loading calendar..." />
35:       ) : !events || events.length === 0 ? (
36:         <ScrollView
37:           className="flex-1 px-4 pt-8"
38:           refreshControl={
39:             <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />
40:           }
41:         >
42:           <EmptyState
43:             icon="📅"
44:             title="No upcoming events"
45:             description="Accepted, waitlisted and pending events will appear here automatically."
46:           />
47:         </ScrollView>
48:       ) : (
49:         <CalendarView
50:           events={events}
51:           refreshControl={
52:             <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />
53:           }
54:         />
55:       )}
56:     </View>
57:   );
58: }
````

## File: app/(tabs)/dashboard.tsx
````typescript
  1: import React, { useMemo, useState } from 'react';
  2: import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
  3: import { useSafeAreaInsets } from 'react-native-safe-area-context';
  4: import { useRouter } from 'expo-router';
  5: import { useDashboard } from '@/lib/queries/dashboard';
  6: import { formatCurrencyCompact, formatCurrency, formatPercent, formatDateRange } from '@/lib/formatters';
  7: import { StatCard } from '@/components/dashboard/StatCard';
  8: import { RevenueBarChart } from '@/components/dashboard/RevenueBarChart';
  9: import { StatusPieChart } from '@/components/dashboard/StatusPieChart';
 10: import { EventCard } from '@/components/events/EventCard';
 11: import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
 12: import { QueryError } from '@/components/shared/QueryError';
 13: import { useAuth } from '@/lib/auth';
 14: import { useProfile } from '@/lib/queries/profile';
 15: import { UNIT_STATUS_COLORS } from '@/constants';
 16: import type { UnitWithStatus } from '@/types';
 17: 
 18: const CURRENT_YEAR = new Date().getFullYear();
 19: const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];
 20: 
 21: export default function DashboardScreen() {
 22:   const insets = useSafeAreaInsets();
 23:   const router = useRouter();
 24:   const { user } = useAuth();
 25:   const { data: profile } = useProfile(user?.id);
 26:   const [year, setYear] = useState(CURRENT_YEAR);
 27:   const [refreshing, setRefreshing] = useState(false);
 28:   const [showFees, setShowFees] = useState(false);
 29:   const { data: stats, isLoading, isError, error, refetch } = useDashboard(year);
 30: 
 31:   const insights = useMemo<{ icon: string; text: string; color: string }[]>(() => {
 32:     if (!stats) return [];
 33:     const result: { icon: string; text: string; color: string }[] = [];
 34: 
 35:     const pendingCount = stats.statusBreakdown.find((s) => s.status === 'pending')?.count ?? 0;
 36:     if (pendingCount > 0) {
 37:       result.push({ icon: '📋', text: `${pendingCount} application${pendingCount > 1 ? 's' : ''} awaiting a decision`, color: '#b45309' });
 38:     }
 39: 
 40:     const bestMonth = [...stats.monthlyRevenue].sort((a, b) => b.netProfit - a.netProfit)[0];
 41:     if (bestMonth && bestMonth.netProfit > 0) {
 42:       result.push({ icon: '🏆', text: `Best month: ${bestMonth.month} (£${bestMonth.netProfit.toFixed(0)} net)`, color: '#15803d' });
 43:     }
 44: 
 45:     const today = new Date();
 46:     stats.unitStatuses.forEach((u) => {
 47:       const dates = [
 48:         { label: 'MOT', d: u.mot_date },
 49:         { label: 'Tax', d: u.tax_date },
 50:       ];
 51:       dates.forEach(({ label, d }) => {
 52:         if (!d) return;
 53:         const days = Math.ceil((new Date(d).getTime() - today.getTime()) / 86400000);
 54:         if (days < 0) result.push({ icon: '🔴', text: `${u.name} ${label} has expired`, color: '#dc2626' });
 55:         else if (days <= 30) result.push({ icon: '🟡', text: `${u.name} ${label} expires in ${days} day${days !== 1 ? 's' : ''}`, color: '#d97706' });
 56:       });
 57:     });
 58: 
 59:     if (stats.upcomingEvents.length === 0 && stats.totalEventsYtd > 0) {
 60:       result.push({ icon: '📅', text: 'No upcoming accepted events', color: '#64748b' });
 61:     }
 62:     return result;
 63:   }, [stats]);
 64: 
 65:   async function handleRefresh() {
 66:     setRefreshing(true);
 67:     await refetch();
 68:     setRefreshing(false);
 69:   }
 70: 
 71:   return (
 72:     <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
 73:       {/* Header */}
 74:       <View className="bg-white px-4 pt-2 pb-3 border-b border-stone-100">
 75:         <View className="flex-row items-center gap-2 mb-2">
 76:           <View className="w-8 h-8 bg-amber-700 rounded-lg items-center justify-center">
 77:             <Text className="text-base">☕</Text>
 78:           </View>
 79:           <View>
 80:             <Text className="font-bold text-stone-900 text-base">{profile?.business_name ?? 'My Business'}</Text>
 81:             <Text className="text-stone-400 text-xs">{user?.email}</Text>
 82:           </View>
 83:         </View>
 84: 
 85:         {/* Year selector */}
 86:         <View className="flex-row gap-2">
 87:           {YEARS.map((y) => (
 88:             <TouchableOpacity
 89:               key={y}
 90:               onPress={() => setYear(y)}
 91:               className={`px-4 py-1.5 rounded-full ${year === y ? 'bg-amber-700' : 'bg-stone-100'}`}
 92:             >
 93:               <Text className={`text-sm font-medium ${year === y ? 'text-white' : 'text-stone-600'}`}>{y}</Text>
 94:             </TouchableOpacity>
 95:           ))}
 96:         </View>
 97:       </View>
 98: 
 99:       {isLoading ? (
100:         <LoadingSpinner message="Loading dashboard..." />
101:       ) : isError ? (
102:         <QueryError error={error} onRetry={refetch} message="Couldn't load dashboard" />
103:       ) : (
104:         <ScrollView
105:           className="flex-1"
106:           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />}
107:         >
108:           <View className="px-4 pt-4 gap-4">
109:             {/* Stats grid */}
110:             <View className="flex-row gap-3">
111:               <StatCard
112:                 title="Gross Sales"
113:                 value={formatCurrencyCompact(stats?.grossSalesYtd ?? 0)}
114:                 icon="💰"
115:                 colorScheme="amber"
116:               />
117:               <StatCard
118:                 title="Net Profit"
119:                 value={formatCurrencyCompact(stats?.netProfitYtd ?? 0)}
120:                 icon="📈"
121:                 colorScheme={(stats?.netProfitYtd ?? 0) >= 0 ? 'green' : 'red'}
122:                 subtitle={(stats?.committedFees ?? 0) > 0 ? `Excl. £${(stats!.committedFees).toFixed(0)} committed` : undefined}
123:               />
124:             </View>
125: 
126:             <View className="flex-row gap-3">
127:               <StatCard
128:                 title="Events YTD"
129:                 value={String(stats?.totalEventsYtd ?? 0)}
130:                 icon="🎪"
131:               />
132:               <StatCard
133:                 title="Acceptance Rate"
134:                 value={`${(stats?.acceptanceRate ?? 0).toFixed(0)}%`}
135:                 icon="✅"
136:                 colorScheme="green"
137:               />
138:               <StatCard
139:                 title="Avg / Event"
140:                 value={formatCurrencyCompact(stats?.avgRevenuePerEvent ?? 0)}
141:                 icon="⚖️"
142:               />
143:             </View>
144: 
145:             {/* Insights strip */}
146:             {insights.length > 0 && (
147:               <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
148:                 {insights.map((ins, i) => (
149:                   <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#e7e5e4', maxWidth: 260 }}>
150:                     <Text style={{ fontSize: 14 }}>{ins.icon}</Text>
151:                     <Text style={{ fontSize: 12, fontWeight: '500', color: ins.color, flexShrink: 1 }}>{ins.text}</Text>
152:                   </View>
153:                 ))}
154:               </ScrollView>
155:             )}
156: 
157:             {/* Committed Fees — collapsible */}
158:             {stats && stats.committedFees > 0 && (
159:               <View className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
160:                 <TouchableOpacity
161:                   onPress={() => setShowFees((v) => !v)}
162:                   activeOpacity={0.7}
163:                   style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
164:                 >
165:                   <View style={{ flex: 1, marginRight: 12 }}>
166:                     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
167:                       <Text style={{ fontWeight: '700', color: '#78350f', fontSize: 14 }}>💳 Committed Fees</Text>
168:                       <View style={{ backgroundColor: '#fde68a', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
169:                         <Text style={{ color: '#78350f', fontSize: 11, fontWeight: '700' }}>
170:                           {stats.upcomingCommitments.length} event{stats.upcomingCommitments.length !== 1 ? 's' : ''}
171:                         </Text>
172:                       </View>
173:                     </View>
174:                     <Text style={{ color: '#b45309', fontSize: 11, marginTop: 2 }}>
175:                       {showFees ? 'Tap to collapse' : 'Tap to see breakdown'}
176:                     </Text>
177:                   </View>
178:                   <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
179:                     <Text style={{ fontWeight: '700', color: '#92400e', fontSize: 16 }}>{formatCurrency(stats.committedFees)}</Text>
180:                     <Text style={{ color: '#b45309', fontSize: 13 }}>{showFees ? '▲' : '▼'}</Text>
181:                   </View>
182:                 </TouchableOpacity>
183: 
184:                 {showFees && (
185:                   <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#fde68a' }}>
186:                     <Text style={{ color: '#b45309', fontSize: 11, paddingTop: 12, marginBottom: 8 }}>
187:                       Pitch + power fees paid for upcoming accepted events
188:                     </Text>
189:                     {stats.upcomingCommitments.map((c, idx) => (
190:                       <View
191:                         key={c.id}
192:                         style={{
193:                           flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
194:                           paddingVertical: 10,
195:                           borderTopWidth: idx === 0 ? 0 : 1,
196:                           borderTopColor: '#fef3c7',
197:                         }}
198:                       >
199:                         <View style={{ flex: 1, marginRight: 8 }}>
200:                           <Text style={{ color: '#78350f', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{c.name}</Text>
201:                           <Text style={{ color: '#b45309', fontSize: 11, marginTop: 1 }}>{formatDateRange(c.date, c.end_date)}</Text>
202:                         </View>
203:                         <Text style={{ color: '#92400e', fontWeight: '700', fontSize: 14 }}>{formatCurrency(c.committedFee)}</Text>
204:                       </View>
205:                     ))}
206:                   </View>
207:                 )}
208:               </View>
209:             )}
210: 
211:             {/* Fleet Overview */}
212:             {stats && stats.unitStatuses.length > 0 && (
213:               <View>
214:                 <View className="flex-row items-center justify-between mb-3">
215:                   <Text className="font-bold text-stone-900">Your Fleet</Text>
216:                   <TouchableOpacity onPress={() => router.push('/(tabs)/fleet')}>
217:                     <Text className="text-amber-600 text-sm">Manage →</Text>
218:                   </TouchableOpacity>
219:                 </View>
220:                 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
221:                   {stats.unitStatuses.map((unit: UnitWithStatus) => (
222:                     <View
223:                       key={unit.id}
224:                       className="bg-white rounded-2xl p-3 border border-slate-100 w-40 overflow-hidden"
225:                       style={{ borderLeftWidth: 3, borderLeftColor: UNIT_STATUS_COLORS[unit.status].dot }}
226:                     >
227:                       <Text className="font-bold text-slate-900 text-sm" numberOfLines={1}>{unit.name}</Text>
228:                       {unit.registration ? (
229:                         <Text className="text-xs text-slate-400 mt-0.5">{unit.registration}</Text>
230:                       ) : null}
231:                       <View className="mt-1.5">
232:                         {unit.currentEvent ? (
233:                           <Text className="text-xs text-amber-700" numberOfLines={1}>
234:                             📍 {unit.currentEvent.name}
235:                           </Text>
236:                         ) : unit.status === 'active' ? (
237:                           <Text className="text-xs text-green-600">✅ Free</Text>
238:                         ) : unit.status === 'maintenance' ? (
239:                           <Text className="text-xs text-amber-600">🔧 Maint.</Text>
240:                         ) : null}
241:                       </View>
242:                     </View>
243:                   ))}
244:                 </ScrollView>
245:               </View>
246:             )}
247: 
248:             {/* Milk Usage */}
249:             {stats && (stats.totalFreshMilkLitres > 0 || stats.totalAltMilkLitres > 0) && (
250:               <View>
251:                 <Text className="font-bold text-stone-900 mb-3">Milk Used (YTD) — {year}</Text>
252:                 <View className="flex-row gap-3">
253:                   <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100">
254:                     <Text className="text-slate-700 font-semibold text-sm">
255:                       🥛 {stats.totalFreshMilkLitres.toFixed(1)} L
256:                     </Text>
257:                     <Text className="text-slate-400 text-xs mt-0.5">Fresh Milk</Text>
258:                   </View>
259:                   <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100">
260:                     <Text className="text-slate-700 font-semibold text-sm">
261:                       🌱 {stats.totalAltMilkLitres.toFixed(1)} L
262:                     </Text>
263:                     <Text className="text-slate-400 text-xs mt-0.5">Alt Milk</Text>
264:                   </View>
265:                 </View>
266:               </View>
267:             )}
268: 
269:             {/* Revenue chart */}
270:             {stats && <RevenueBarChart data={stats.monthlyRevenue} />}
271: 
272:             {/* Status breakdown */}
273:             {stats && stats.statusBreakdown.length > 0 && (
274:               <StatusPieChart data={stats.statusBreakdown} />
275:             )}
276: 
277:             {/* Reports quick access */}
278:             <TouchableOpacity
279:               onPress={() => router.push('/(tabs)/reports')}
280:               className="bg-white rounded-2xl p-4 border border-slate-100 flex-row items-center justify-between"
281:             >
282:               <View className="flex-1 mr-3">
283:                 <Text className="font-bold text-slate-900 text-sm">📈 Reports</Text>
284:                 <Text className="text-slate-400 text-xs mt-0.5">Annual P&L, top events, export CSV</Text>
285:               </View>
286:               <Text className="text-amber-600 font-medium text-sm">View →</Text>
287:             </TouchableOpacity>
288: 
289:             {/* Upcoming events */}
290:             {stats && stats.upcomingEvents.length > 0 && (
291:               <View>
292:                 <View className="flex-row items-center justify-between mb-3">
293:                   <Text className="font-bold text-stone-900">Upcoming Accepted</Text>
294:                   <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
295:                     <Text className="text-amber-600 text-sm">View all</Text>
296:                   </TouchableOpacity>
297:                 </View>
298:                 {stats.upcomingEvents.map((event) => (
299:                   <EventCard key={event.id} event={event} />
300:                 ))}
301:               </View>
302:             )}
303: 
304:             <View style={{ height: 32 }} />
305:           </View>
306:         </ScrollView>
307:       )}
308:     </View>
309:   );
310: }
````

## File: app/(tabs)/discover.tsx
````typescript
  1: import React, { useState, useEffect, useMemo, startTransition } from 'react';
  2: import {
  3:   View, Text, ScrollView, TouchableOpacity, TextInput,
  4:   RefreshControl, Linking, Alert, ActivityIndicator,
  5: } from 'react-native';
  6: import { useSafeAreaInsets } from 'react-native-safe-area-context';
  7: import { router } from 'expo-router';
  8: import { useDiscoverEvents } from '@/lib/queries/discover';
  9: import { useCompanies } from '@/lib/queries/companies';
 10: import { useCreateEvent } from '@/lib/mutations/events';
 11: import { useAuth } from '@/lib/auth';
 12: import { supabase } from '@/lib/supabase';
 13: import type { DiscoveredEvent } from '@/types';
 14: 
 15: const REGIONS = ['All UK', 'London', 'South East', 'South West', 'East of England', 'Midlands', 'West Midlands', 'North West', 'Yorkshire', 'North East', 'Scotland', 'Wales', 'National'];
 16: 
 17: const EVENT_CATEGORIES = ['All', 'Music Festival', 'Food Festival', 'Street Food Market', 'Christmas Market', 'Garden and Lifestyle', 'Motorsport', 'Equestrian'];
 18: const COMPANY_CATEGORIES = ['All', 'Concessions Company', 'Industry Body'];
 19: 
 20: // Days since a date string
 21: function daysSince(dateStr: string | null): number | null {
 22:   if (!dateStr) return null;
 23:   const diff = Date.now() - new Date(dateStr).getTime();
 24:   return Math.floor(diff / (1000 * 60 * 60 * 24));
 25: }
 26: 
 27: function formatRelativeTime(date: Date): string {
 28:   const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
 29:   if (minutes < 1) return 'just now';
 30:   if (minutes < 60) return `${minutes} min ago`;
 31:   const hours = Math.floor(minutes / 60);
 32:   if (hours < 24) return `${hours}h ago`;
 33:   return `${Math.floor(hours / 24)}d ago`;
 34: }
 35: 
 36: // Category badge colours — using explicit style objects to avoid NativeWind dynamic class issues
 37: const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
 38:   'Music Festival':       { bg: '#f3e8ff', text: '#7e22ce' },
 39:   'Food Festival':        { bg: '#ffedd5', text: '#c2410c' },
 40:   'Street Food Market':   { bg: '#dcfce7', text: '#15803d' },
 41:   'Christmas Market':     { bg: '#fee2e2', text: '#b91c1c' },
 42:   'Garden and Lifestyle': { bg: '#d1fae5', text: '#065f46' },
 43:   'Motorsport':           { bg: '#dbeafe', text: '#1d4ed8' },
 44:   'Equestrian':           { bg: '#fef3c7', text: '#92400e' },
 45: };
 46: const DEFAULT_CATEGORY_STYLE = { bg: '#f1f5f9', text: '#475569' };
 47: 
 48: function VerifiedBadge({ lastVerifiedAt }: { lastVerifiedAt: string | null }) {
 49:   const days = daysSince(lastVerifiedAt);
 50:   if (days === null) return null;
 51:   const fresh = days <= 7;
 52:   const stale = days > 30;
 53:   const bgColor = fresh ? '#dcfce7' : stale ? '#ffedd5' : '#f1f5f9';
 54:   const textColor = fresh ? '#15803d' : stale ? '#c2410c' : '#64748b';
 55:   return (
 56:     <View style={{ backgroundColor: bgColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
 57:       <Text style={{ color: textColor, fontSize: 11, fontWeight: '500' }}>
 58:         {fresh ? `Verified ${days}d ago` : stale ? `Check needed (${days}d)` : `Verified ${days}d ago`}
 59:       </Text>
 60:     </View>
 61:   );
 62: }
 63: 
 64: function EventCard({ event, onAdd, adding }: { event: DiscoveredEvent; onAdd: (e: DiscoveredEvent) => void; adding: boolean }) {
 65:   const catStyle = CATEGORY_STYLES[event.category] ?? DEFAULT_CATEGORY_STYLE;
 66: 
 67:   return (
 68:     <View className="bg-white rounded-2xl mb-3 border border-slate-100 overflow-hidden">
 69:       <View className="h-1 bg-amber-400" />
 70:       <View className="p-4">
 71:         {event.featured && (
 72:           <View style={{ alignSelf: 'flex-start', backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12, marginBottom: 8 }}>
 73:             <Text style={{ color: '#b45309', fontSize: 12, fontWeight: '600' }}>⭐ Featured</Text>
 74:           </View>
 75:         )}
 76: 
 77:         <View className="flex-row items-start justify-between mb-2">
 78:           <Text className="font-bold text-slate-900 text-base leading-snug flex-1 mr-3" numberOfLines={2}>
 79:             {event.title}
 80:           </Text>
 81:           <View style={{ backgroundColor: catStyle.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
 82:             <Text style={{ color: catStyle.text, fontSize: 11, fontWeight: '500' }}>{event.category}</Text>
 83:           </View>
 84:         </View>
 85: 
 86:         {event.organiser && (
 87:           <Text className="text-slate-400 text-xs mb-2">Organised by {event.organiser}</Text>
 88:         )}
 89: 
 90:         <Text className="text-slate-600 text-sm leading-relaxed mb-3" numberOfLines={3}>
 91:           {event.description}
 92:         </Text>
 93: 
 94:         <View className="flex-row flex-wrap gap-1.5 mb-3">
 95:           {event.location && (
 96:             <View className="bg-slate-50 px-2.5 py-1 rounded-full">
 97:               <Text className="text-slate-500 text-xs">📍 {event.location}</Text>
 98:             </View>
 99:           )}
100:           {event.dateHint && (
101:             <View className="bg-slate-50 px-2.5 py-1 rounded-full">
102:               <Text className="text-slate-500 text-xs">📅 {event.dateHint}</Text>
103:             </View>
104:           )}
105:           {event.estimatedFootfall && (
106:             <View className="bg-slate-50 px-2.5 py-1 rounded-full">
107:               <Text className="text-slate-500 text-xs">👥 {event.estimatedFootfall}</Text>
108:             </View>
109:           )}
110:           {event.pitchFeeRange && (
111:             <View className="bg-slate-50 px-2.5 py-1 rounded-full">
112:               <Text className="text-slate-500 text-xs">💷 {event.pitchFeeRange}</Text>
113:             </View>
114:           )}
115:         </View>
116: 
117:         <View className="flex-row gap-2">
118:           <TouchableOpacity
119:             onPress={() => { if (event.url) Linking.openURL(event.url); }}
120:             className="flex-1 border border-slate-200 py-2.5 rounded-xl items-center"
121:           >
122:             <Text className="text-slate-600 font-medium text-sm">View & Apply ↗</Text>
123:           </TouchableOpacity>
124:           <TouchableOpacity
125:             onPress={() => onAdd(event)}
126:             disabled={adding}
127:             className="flex-1 bg-amber-500 py-2.5 rounded-xl items-center"
128:           >
129:             {adding ? (
130:               <ActivityIndicator color="#fff" size="small" />
131:             ) : (
132:               <Text className="text-white font-semibold text-sm">+ Track It</Text>
133:             )}
134:           </TouchableOpacity>
135:         </View>
136:       </View>
137:     </View>
138:   );
139: }
140: 
141: function CompanyCard({ company }: { company: DiscoveredEvent }) {
142:   const isIndustryBody = company.category === 'Industry Body';
143: 
144:   return (
145:     <View className="bg-white rounded-2xl mb-3 border border-slate-100 overflow-hidden">
146:       <View style={{ height: 6, backgroundColor: isIndustryBody ? '#94a3b8' : '#10b981' }} />
147:       <View className="p-4">
148:         <View className="flex-row items-start justify-between mb-1">
149:           <View className="flex-1 mr-3">
150:             <View className="flex-row items-center gap-2 flex-wrap mb-0.5">
151:               {company.featured && (
152:                 <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
153:                   <Text style={{ color: '#b45309', fontSize: 11, fontWeight: '600' }}>⭐ Major</Text>
154:                 </View>
155:               )}
156:               {company.applicationChanged && (
157:                 <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
158:                   <Text style={{ color: '#15803d', fontSize: 11, fontWeight: '600' }}>🆕 Page Updated</Text>
159:                 </View>
160:               )}
161:             </View>
162:             <Text className="font-bold text-slate-900 text-base leading-snug">{company.title}</Text>
163:           </View>
164:           <View style={{ backgroundColor: isIndustryBody ? '#f1f5f9' : '#d1fae5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
165:             <Text style={{ color: isIndustryBody ? '#475569' : '#065f46', fontSize: 11, fontWeight: '500' }}>
166:               {isIndustryBody ? 'Industry Body' : 'Concessions Co.'}
167:             </Text>
168:           </View>
169:         </View>
170: 
171:         <Text className="text-slate-600 text-sm leading-relaxed mb-3">{company.description}</Text>
172: 
173:         {company.eventsManaged && (
174:           <View className="bg-slate-50 rounded-xl p-3 mb-3">
175:             <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Events They Run</Text>
176:             <Text className="text-slate-700 text-sm leading-relaxed">{company.eventsManaged}</Text>
177:           </View>
178:         )}
179: 
180:         <View className="flex-row flex-wrap gap-2 mb-3">
181:           {company.location && (
182:             <View className="bg-slate-50 px-2.5 py-1 rounded-full">
183:               <Text className="text-slate-500 text-xs">📍 {company.location}</Text>
184:             </View>
185:           )}
186:           {company.pitchFeeRange && (
187:             <View className="bg-slate-50 px-2.5 py-1 rounded-full">
188:               <Text className="text-slate-500 text-xs">💷 {company.pitchFeeRange}</Text>
189:             </View>
190:           )}
191:           {company.contactPhone && (
192:             <TouchableOpacity
193:               onPress={() => Linking.openURL(`tel:${company.contactPhone}`)}
194:               className="bg-blue-50 px-2.5 py-1 rounded-full"
195:             >
196:               <Text className="text-blue-600 text-xs font-medium">📞 {company.contactPhone}</Text>
197:             </TouchableOpacity>
198:           )}
199:           {company.contactEmail && (
200:             <TouchableOpacity
201:               onPress={() => Linking.openURL(`mailto:${company.contactEmail}`)}
202:               className="bg-blue-50 px-2.5 py-1 rounded-full"
203:             >
204:               <Text className="text-blue-600 text-xs font-medium">✉️ {company.contactEmail}</Text>
205:             </TouchableOpacity>
206:           )}
207:         </View>
208: 
209:         <View className="flex-row items-center justify-between">
210:           <VerifiedBadge lastVerifiedAt={company.lastVerifiedAt} />
211:           <TouchableOpacity
212:             onPress={() => { if (company.url) Linking.openURL(company.url); }}
213:             className="bg-emerald-500 px-4 py-2.5 rounded-xl"
214:           >
215:             <Text className="text-white font-semibold text-sm">Apply Now ↗</Text>
216:           </TouchableOpacity>
217:         </View>
218:       </View>
219:     </View>
220:   );
221: }
222: 
223: export default function DiscoverScreen() {
224:   const insets = useSafeAreaInsets();
225:   const { user } = useAuth();
226:   const [activeTab, setActiveTab] = useState<'events' | 'apply'>('apply');
227:   const [searchText, setSearchText] = useState('');
228:   const [region, setRegion] = useState('All UK');
229:   const [category, setCategory] = useState('All');
230:   const [addingId, setAddingId] = useState<string | null>(null);
231:   const [refreshing, setRefreshing] = useState(false);
232:   const [lastSynced, setLastSynced] = useState<Date | null>(null);
233:   const [syncing, setSyncing] = useState(false);
234: 
235:   useEffect(() => {
236:     supabase
237:       .from('uk_events_directory')
238:       .select('updated_at')
239:       .order('updated_at', { ascending: false })
240:       .limit(1)
241:       .single()
242:       .then(({ data }) => {
243:         if (data?.updated_at) setLastSynced(new Date(data.updated_at));
244:       });
245:   }, []);
246: 
247:   const { data: allResults = [], isLoading, refetch, error } = useDiscoverEvents({});
248:   const { data: companies = [] } = useCompanies();
249:   const createEvent = useCreateEvent();
250: 
251:   const events = useMemo(() => allResults.filter((r) => !r.isCompany), [allResults]);
252:   const concessionsCos = useMemo(() => allResults.filter((r) => r.isCompany), [allResults]);
253: 
254:   const filteredEvents = useMemo(() => {
255:     let results = events;
256:     if (region !== 'All UK') {
257:       results = results.filter((e) =>
258:         e.region?.toLowerCase().includes(region.toLowerCase()) ||
259:         e.location?.toLowerCase().includes(region.toLowerCase())
260:       );
261:     }
262:     if (category !== 'All') {
263:       results = results.filter((e) => e.category?.toLowerCase() === category.toLowerCase());
264:     }
265:     if (searchText.trim()) {
266:       const q = searchText.trim().toLowerCase();
267:       results = results.filter((e) =>
268:         e.title?.toLowerCase().includes(q) ||
269:         e.description?.toLowerCase().includes(q) ||
270:         e.location?.toLowerCase().includes(q) ||
271:         e.organiser?.toLowerCase().includes(q)
272:       );
273:     }
274:     return results;
275:   }, [events, region, category, searchText]);
276: 
277:   const filteredCompanies = useMemo(() => {
278:     let results = concessionsCos;
279:     if (category !== 'All') {
280:       results = results.filter((c) => c.category?.toLowerCase() === category.toLowerCase());
281:     }
282:     if (searchText.trim()) {
283:       const q = searchText.trim().toLowerCase();
284:       results = results.filter((c) =>
285:         c.title?.toLowerCase().includes(q) ||
286:         c.description?.toLowerCase().includes(q) ||
287:         c.eventsManaged?.toLowerCase().includes(q) ||
288:         c.organiser?.toLowerCase().includes(q)
289:       );
290:     }
291:     // Featured first, then alphabetical
292:     return [...results].sort((a, b) => {
293:       if (a.featured && !b.featured) return -1;
294:       if (!a.featured && b.featured) return 1;
295:       return a.title.localeCompare(b.title);
296:     });
297:   }, [concessionsCos, category, searchText]);
298: 
299:   async function handleRefresh() {
300:     setRefreshing(true);
301:     await refetch();
302:     setRefreshing(false);
303:   }
304: 
305:   async function handleSync() {
306:     setSyncing(true);
307:     try {
308:       await supabase.functions.invoke('sync-directory', { body: {} });
309:       // Re-fetch data after sync
310:       await refetch();
311:       // Update last synced
312:       setLastSynced(new Date());
313:     } catch {
314:       // silently ignore - edge function may not exist in dev
315:     } finally {
316:       setSyncing(false);
317:     }
318:   }
319: 
320:   async function handleAddEvent(discovered: DiscoveredEvent) {
321:     if (!user) {
322:       Alert.alert('Not signed in', 'Please sign in to track events.');
323:       return;
324:     }
325:     setAddingId(discovered.id);
326:     try {
327:       const firstWord = discovered.organiser?.toLowerCase().split(' ')[0] ?? '';
328:       const matchedCompany = companies.find((c) =>
329:         (discovered.source && c.website?.toLowerCase().includes(discovered.source.toLowerCase())) ||
330:         (firstWord && c.name.toLowerCase().includes(firstWord))
331:       );
332:       const eventName = discovered.title.length > 80 ? discovered.title.slice(0, 80) : discovered.title;
333:       await createEvent.mutateAsync({
334:         userId: user.id,
335:         data: {
336:           name: eventName,
337:           date: new Date().toISOString().split('T')[0],
338:           location: discovered.location ?? '',
339:           status: 'pending',
340:           description: discovered.description ?? '',
341:           application_url: discovered.url ?? '',
342:           company_id: matchedCompany?.id ?? '',
343:           notes: `Discovered via Brewed Discover — ${discovered.organiser ?? discovered.source}`,
344:           // Financial defaults
345:           gross_sales: 0,
346:           zero_rated_sales: 0,
347:           standard_rated_sales: 0,
348:           concessions_commission_pct: 0,
349:           pitch_fee_refund_pct: 0,
350:           cost_of_goods: 0,
351:           pitch_fee: 0,
352:           power_fee: 0,
353:           travel_costs: 0,
354:           camping_costs: 0,
355:           equipment_costs: 0,
356:           other_costs: 0,
357:           staffing_costs: 0,
358:           fresh_milk_litres: 0,
359:           alt_milk_litres: 0,
360:           // Flags
361:           overnight_stay: false,
362:           documents_uploaded: false,
363:           // Arrays
364:           staffing_entries: [],
365:           infrastructure_items: [],
366:         },
367:       });
368:       Alert.alert(
369:         'Added!',
370:         `"${eventName.slice(0, 50)}" added to your events as Pending. Update the date and details when ready.`,
371:         [{ text: 'Done' }, { text: 'View Events', onPress: () => router.push('/(tabs)/events') }]
372:       );
373:     } catch (e: unknown) {
374:       const msg = e instanceof Error ? e.message : 'Could not add event';
375:       Alert.alert('Error', msg);
376:     } finally {
377:       setAddingId(null);
378:     }
379:   }
380: 
381:   const currentCategories = activeTab === 'events' ? EVENT_CATEGORIES : COMPANY_CATEGORIES;
382:   const currentCount = activeTab === 'events' ? filteredEvents.length : filteredCompanies.length;
383: 
384:   return (
385:     <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
386:       {/* Header */}
387:       <View className="bg-white px-4 pt-3 pb-3 border-b border-slate-100">
388:         <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
389:           <View>
390:             <Text className="text-2xl font-bold text-slate-900">Discover</Text>
391:             {lastSynced && (
392:               <Text className="text-stone-400 text-xs">
393:                 Last synced: {formatRelativeTime(lastSynced)}
394:               </Text>
395:             )}
396:           </View>
397:           <TouchableOpacity
398:             onPress={handleSync}
399:             disabled={syncing}
400:             style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f5f5f4', borderWidth: 1, borderColor: '#e7e5e4' }}
401:           >
402:             {syncing ? (
403:               <ActivityIndicator size="small" color="#78716c" />
404:             ) : (
405:               <Text style={{ color: '#57534e', fontSize: 13, fontWeight: '500' }}>↻ Refresh</Text>
406:             )}
407:           </TouchableOpacity>
408:         </View>
409: 
410:         {/* Tab switcher */}
411:         <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 12 }}>
412:           <TouchableOpacity
413:             onPress={() => startTransition(() => { setActiveTab('apply'); setCategory('All'); })}
414:             style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: activeTab === 'apply' ? '#ffffff' : 'transparent' }}
415:           >
416:             <Text style={{ fontSize: 14, fontWeight: '600', color: activeTab === 'apply' ? '#0f172a' : '#94a3b8' }}>
417:               Who to Apply To
418:             </Text>
419:             <Text style={{ fontSize: 12, color: activeTab === 'apply' ? '#10b981' : '#94a3b8' }}>
420:               {concessionsCos.length} companies
421:             </Text>
422:           </TouchableOpacity>
423:           <TouchableOpacity
424:             onPress={() => startTransition(() => { setActiveTab('events'); setCategory('All'); })}
425:             style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: activeTab === 'events' ? '#ffffff' : 'transparent' }}
426:           >
427:             <Text style={{ fontSize: 14, fontWeight: '600', color: activeTab === 'events' ? '#0f172a' : '#94a3b8' }}>
428:               Events & Festivals
429:             </Text>
430:             <Text style={{ fontSize: 12, color: activeTab === 'events' ? '#f59e0b' : '#94a3b8' }}>
431:               {events.length} events
432:             </Text>
433:           </TouchableOpacity>
434:         </View>
435: 
436:         {/* Search bar */}
437:         <View className="flex-row items-center bg-slate-100 rounded-xl px-3 py-2.5 mb-3">
438:           <Text className="text-slate-400 mr-2">🔍</Text>
439:           <TextInput
440:             className="flex-1 text-slate-900 text-sm"
441:             placeholder={activeTab === 'apply' ? 'Search concessions companies...' : 'Search festivals, markets...'}
442:             placeholderTextColor="#94a3b8"
443:             value={searchText}
444:             onChangeText={setSearchText}
445:             returnKeyType="search"
446:           />
447:           {searchText.length > 0 && (
448:             <TouchableOpacity onPress={() => setSearchText('')}>
449:               <Text className="text-slate-400 text-lg">×</Text>
450:             </TouchableOpacity>
451:           )}
452:         </View>
453: 
454:         {/* Region filter — only for events tab */}
455:         {activeTab === 'events' && (
456:           <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 6 }}>
457:             {REGIONS.map((r) => (
458:               <TouchableOpacity
459:                 key={r}
460:                 onPress={() => setRegion(r)}
461:                 style={{
462:                   paddingHorizontal: 12,
463:                   paddingVertical: 6,
464:                   borderRadius: 20,
465:                   borderWidth: 1,
466:                   backgroundColor: region === r ? '#1e293b' : '#fff',
467:                   borderColor: region === r ? '#1e293b' : '#e2e8f0',
468:                 }}
469:               >
470:                 <Text style={{ fontSize: 12, fontWeight: '500', color: region === r ? '#fff' : '#475569' }}>{r}</Text>
471:               </TouchableOpacity>
472:             ))}
473:           </ScrollView>
474:         )}
475: 
476:         {/* Category filter */}
477:         <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
478:           {currentCategories.map((c) => {
479:             const active = category === c;
480:             const activeColor = activeTab === 'apply' ? '#10b981' : '#f59e0b';
481:             return (
482:               <TouchableOpacity
483:                 key={c}
484:                 onPress={() => setCategory(c)}
485:                 style={{
486:                   paddingHorizontal: 12,
487:                   paddingVertical: 6,
488:                   borderRadius: 20,
489:                   borderWidth: 1,
490:                   backgroundColor: active ? activeColor : '#fff',
491:                   borderColor: active ? activeColor : '#e2e8f0',
492:                 }}
493:               >
494:                 <Text style={{ fontSize: 12, fontWeight: '500', color: active ? '#fff' : '#475569' }}>{c}</Text>
495:               </TouchableOpacity>
496:             );
497:           })}
498:         </ScrollView>
499:       </View>
500: 
501:       {isLoading ? (
502:         <View className="flex-1 items-center justify-center gap-3">
503:           <ActivityIndicator size="large" color="#f59e0b" />
504:           <Text className="text-slate-500 text-sm">Loading directory...</Text>
505:         </View>
506:       ) : error ? (
507:         <View className="flex-1 items-center justify-center px-8">
508:           <Text className="text-4xl mb-3">⚠️</Text>
509:           <Text className="font-semibold text-slate-700 text-center mb-2">Could not load directory</Text>
510:           <Text className="text-slate-400 text-xs text-center mb-1">
511:             {error instanceof Error ? error.message : 'Database error'}
512:           </Text>
513:           <Text className="text-slate-400 text-xs text-center mb-4">
514:             Run the Migration 003 SQL in your Supabase dashboard, then tap Retry.
515:           </Text>
516:           <TouchableOpacity onPress={() => refetch()} className="mt-2 bg-amber-500 px-6 py-3 rounded-xl">
517:             <Text className="text-white font-semibold text-sm">Retry</Text>
518:           </TouchableOpacity>
519:         </View>
520:       ) : (
521:         <ScrollView
522:           className="flex-1 px-4 pt-4"
523:           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#f59e0b" />}
524:         >
525:           <Text className="text-slate-400 text-xs mb-3">{currentCount} {activeTab === 'apply' ? 'companies' : 'events'} found</Text>
526: 
527:           {currentCount === 0 ? (
528:             <View className="items-center py-16 px-6">
529:               <Text className="text-4xl mb-3">{activeTab === 'apply' ? '🏢' : '🔍'}</Text>
530:               <Text className="font-semibold text-slate-700 text-center text-base">Nothing matches your search</Text>
531:               <TouchableOpacity
532:                 onPress={() => { setSearchText(''); setRegion('All UK'); setCategory('All'); }}
533:                 className="mt-4 border border-slate-200 px-5 py-2.5 rounded-xl"
534:               >
535:                 <Text className="text-slate-600 font-medium text-sm">Clear filters</Text>
536:               </TouchableOpacity>
537:             </View>
538:           ) : activeTab === 'apply' ? (
539:             <>
540:               <View className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-4 flex-row items-start">
541:                 <Text className="text-lg mr-2">💡</Text>
542:                 <Text className="text-emerald-800 text-xs leading-relaxed flex-1">
543:                   Tap <Text className="font-semibold">Apply Now</Text> to go straight to each company's application page. Companies with a <Text className="font-semibold">🆕 Page Updated</Text> badge have had changes to their trader portal recently.
544:                 </Text>
545:               </View>
546:               {filteredCompanies.map((company) => (
547:                 <CompanyCard key={company.id} company={company} />
548:               ))}
549:             </>
550:           ) : (
551:             filteredEvents.map((event) => (
552:               <EventCard
553:                 key={event.id}
554:                 event={event}
555:                 onAdd={handleAddEvent}
556:                 adding={addingId === event.id}
557:               />
558:             ))
559:           )}
560: 
561:           <View style={{ height: 24 }} />
562:         </ScrollView>
563:       )}
564:     </View>
565:   );
566: }
````

## File: app/(tabs)/reports.tsx
````typescript
  1: import React, { useState } from 'react';
  2: import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Share, Alert } from 'react-native';
  3: import { useSafeAreaInsets } from 'react-native-safe-area-context';
  4: import { useRouter } from 'expo-router';
  5: import { useReports } from '@/lib/queries/reports';
  6: import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
  7: import { EventStatusBadge } from '@/components/shared/EventStatusBadge';
  8: import { formatCurrency, formatPercent, formatDate } from '@/lib/formatters';
  9: 
 10: const CURRENT_YEAR = new Date().getFullYear();
 11: const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];
 12: 
 13: export default function ReportsScreen() {
 14:   const insets = useSafeAreaInsets();
 15:   const router = useRouter();
 16:   const [year, setYear] = useState(CURRENT_YEAR);
 17:   const [refreshing, setRefreshing] = useState(false);
 18:   const { data, isLoading, refetch } = useReports(year);
 19: 
 20:   async function handleRefresh() {
 21:     setRefreshing(true);
 22:     await refetch();
 23:     setRefreshing(false);
 24:   }
 25: 
 26:   async function handleExport() {
 27:     if (!data) return;
 28:     const header = 'Event,Date,End Date,Location,Company,Status,Gross Sales,Cost of Goods,Pitch Fee,Power Fee,Travel,Camping,Equipment,Other,Staffing,Net Profit,Margin%\n';
 29: 
 30:     // Export all events for the year from companyPerformance + topEvents combined, de-duped
 31:     const allReportEvents = data.topEvents;
 32:     const rows = allReportEvents.map((e) => [
 33:       `"${e.name.replace(/"/g, '""')}"`,
 34:       e.date,
 35:       e.end_date ?? '',
 36:       `"${e.location.replace(/"/g, '""')}"`,
 37:       `"${(e.concessions_companies?.name ?? '').replace(/"/g, '""')}"`,
 38:       e.status,
 39:       e.event_financials?.gross_sales ?? 0,
 40:       e.event_financials?.cost_of_goods ?? 0,
 41:       e.event_financials?.pitch_fee ?? 0,
 42:       e.event_financials?.power_fee ?? 0,
 43:       e.event_financials?.travel_costs ?? 0,
 44:       e.event_financials?.camping_costs ?? 0,
 45:       e.event_financials?.equipment_costs ?? 0,
 46:       e.event_financials?.other_costs ?? 0,
 47:       e.event_financials?.staffing_costs ?? 0,
 48:       e.calculations.netProfit.toFixed(2),
 49:       e.calculations.profitMargin.toFixed(1),
 50:     ].join(',')).join('\n');
 51: 
 52:     const csv = header + rows;
 53:     try {
 54:       await Share.share({ message: csv, title: `Brewed by Boon - ${year} Report` });
 55:     } catch {
 56:       Alert.alert('Error', 'Could not export report');
 57:     }
 58:   }
 59: 
 60:   return (
 61:     <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
 62:       <View className="bg-white px-4 pt-2 pb-3 border-b border-stone-100">
 63:         <View className="flex-row items-center justify-between mb-3">
 64:           <Text className="text-2xl font-bold text-stone-900">Reports</Text>
 65:           <TouchableOpacity
 66:             onPress={handleExport}
 67:             accessibilityRole="button"
 68:             accessibilityLabel="Export report as CSV"
 69:             className="border border-amber-300 px-3 py-1.5 rounded-xl"
 70:           >
 71:             <Text className="text-amber-700 font-medium text-sm">Export CSV</Text>
 72:           </TouchableOpacity>
 73:         </View>
 74:         <View className="flex-row gap-2" accessibilityRole="radiogroup">
 75:           {YEARS.map((y) => (
 76:             <TouchableOpacity
 77:               key={y}
 78:               onPress={() => setYear(y)}
 79:               accessibilityRole="radio"
 80:               accessibilityLabel={`Show reports for ${y}`}
 81:               accessibilityState={{ selected: year === y }}
 82:               className={`px-4 py-1.5 rounded-full ${year === y ? 'bg-amber-700' : 'bg-stone-100'}`}
 83:             >
 84:               <Text className={`text-sm font-medium ${year === y ? 'text-white' : 'text-stone-600'}`}>{y}</Text>
 85:             </TouchableOpacity>
 86:           ))}
 87:         </View>
 88:       </View>
 89: 
 90:       {isLoading ? (
 91:         <LoadingSpinner message="Loading report..." />
 92:       ) : !data || data.totalEvents === 0 ? (
 93:         <View className="flex-1 items-center justify-center">
 94:           <Text className="text-5xl mb-3">📊</Text>
 95:           <Text className="text-stone-600 font-semibold">No data for {year}</Text>
 96:         </View>
 97:       ) : (
 98:         <ScrollView
 99:           className="flex-1 px-4 pt-4"
100:           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" />}
101:         >
102:           {/* Annual summary */}
103:           <View className="flex-row flex-wrap gap-3 mb-4">
104:             {[
105:               { label: 'Total Revenue', value: formatCurrency(data.totalGross), color: 'text-amber-700' },
106:               { label: 'Total Net Profit', value: formatCurrency(data.totalNet), color: data.totalNet >= 0 ? 'text-green-700' : 'text-red-600' },
107:               { label: 'Events', value: String(data.totalEvents), color: 'text-stone-900' },
108:               { label: 'Avg Margin', value: formatPercent(data.avgMargin), color: data.avgMargin >= 0 ? 'text-green-700' : 'text-red-600' },
109:             ].map((s) => (
110:               <View key={s.label} className="bg-white rounded-xl p-3 border border-stone-100 min-w-[45%] flex-1">
111:                 <Text className={`text-lg font-bold ${s.color}`}>{s.value}</Text>
112:                 <Text className="text-stone-400 text-xs mt-0.5">{s.label}</Text>
113:               </View>
114:             ))}
115:           </View>
116: 
117:           {/* Monthly breakdown */}
118:           <View className="bg-white rounded-2xl border border-stone-100 mb-4 overflow-hidden">
119:             <Text className="font-bold text-stone-900 px-4 pt-4 pb-2">Monthly Breakdown</Text>
120:             <View className="flex-row px-4 pb-2 border-b border-stone-100">
121:               {['Month', 'Events', 'Gross', 'Net', 'Margin'].map((h) => (
122:                 <Text key={h} className="text-stone-400 text-xs font-medium flex-1 text-right first:text-left">{h}</Text>
123:               ))}
124:             </View>
125:             {data.monthly.filter((m) => m.eventCount > 0).map((m) => (
126:               <View key={m.month} className="flex-row px-4 py-2.5 border-b border-stone-50">
127:                 <Text className="text-stone-700 text-xs font-medium flex-1">{m.monthLabel}</Text>
128:                 <Text className="text-stone-600 text-xs flex-1 text-right">{m.eventCount}</Text>
129:                 <Text className="text-stone-700 text-xs flex-1 text-right font-medium">£{m.grossSales.toFixed(0)}</Text>
130:                 <Text className={`text-xs flex-1 text-right font-medium ${m.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
131:                   £{m.netProfit.toFixed(0)}
132:                 </Text>
133:                 <Text className={`text-xs flex-1 text-right ${m.profitMargin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
134:                   {m.profitMargin.toFixed(0)}%
135:                 </Text>
136:               </View>
137:             ))}
138:           </View>
139: 
140:           {/* Top events */}
141:           {data.topEvents.length > 0 && (
142:             <View className="mb-4">
143:               <Text className="font-bold text-stone-900 mb-3">Top Events by Net Profit</Text>
144:               {data.topEvents.slice(0, 5).map((event, i) => (
145:                 <TouchableOpacity
146:                   key={event.id}
147:                   onPress={() => router.push(`/(tabs)/events/${event.id}`)}
148:                   className="bg-white rounded-xl p-3.5 mb-2 border border-stone-100 flex-row items-center"
149:                   activeOpacity={0.7}
150:                 >
151:                   <Text className="text-stone-400 text-sm font-bold w-6">{i + 1}</Text>
152:                   <View className="flex-1 mx-3">
153:                     <Text className="font-medium text-stone-900 text-sm" numberOfLines={1}>{event.name}</Text>
154:                     <Text className="text-stone-400 text-xs mt-0.5">{formatDate(event.date)}</Text>
155:                   </View>
156:                   <View className="items-end">
157:                     <Text className={`font-bold text-sm ${event.calculations.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
158:                       {formatCurrency(event.calculations.netProfit)}
159:                     </Text>
160:                     <Text className="text-stone-400 text-xs">{formatCurrency(event.event_financials?.gross_sales ?? 0)} gross</Text>
161:                   </View>
162:                 </TouchableOpacity>
163:               ))}
164:             </View>
165:           )}
166: 
167:           {/* Company performance */}
168:           {data.companyPerformance.length > 0 && (
169:             <View className="mb-4">
170:               <Text className="font-bold text-stone-900 mb-3">Company Performance</Text>
171:               <View className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
172:                 {data.companyPerformance.map((cp, i) => (
173:                   <TouchableOpacity
174:                     key={cp.company.id}
175:                     onPress={() => router.push(`/(tabs)/companies/${cp.company.id}`)}
176:                     className={`px-4 py-3.5 flex-row items-center ${i < data.companyPerformance.length - 1 ? 'border-b border-stone-50' : ''}`}
177:                   >
178:                     <View className="flex-1">
179:                       <Text className="font-medium text-stone-900 text-sm">{cp.company.name}</Text>
180:                       <Text className="text-stone-400 text-xs mt-0.5">
181:                         {cp.totalEvents} events · {cp.acceptedEvents} accepted
182:                       </Text>
183:                     </View>
184:                     <View className="items-end">
185:                       <Text className="font-semibold text-stone-900 text-sm">{formatCurrency(cp.totalRevenue)}</Text>
186:                       <Text className="text-stone-400 text-xs">
187:                         {cp.acceptanceRate.toFixed(0)}% acceptance
188:                       </Text>
189:                     </View>
190:                   </TouchableOpacity>
191:                 ))}
192:               </View>
193:             </View>
194:           )}
195: 
196:           <View style={{ height: 40 }} />
197:         </ScrollView>
198:       )}
199:     </View>
200:   );
201: }
````

## File: app/(tabs)/settings.tsx
````typescript
  1: import React, { useState, useEffect } from 'react';
  2: import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch, RefreshControl } from 'react-native';
  3: import { useSafeAreaInsets } from 'react-native-safe-area-context';
  4: import Constants from 'expo-constants';
  5: import * as Haptics from 'expo-haptics';
  6: import { useAuth } from '@/lib/auth';
  7: import { useProfile, useUpdateProfile } from '@/lib/queries/profile';
  8: import type { Metric } from '@/lib/queries/profile';
  9: 
 10: const BUSINESS_TYPES = ['Coffee', 'Street Food', 'Pizza', 'Burgers', 'Desserts', 'Bakery', 'Other'];
 11: const CURRENCIES = [
 12:   { code: 'GBP', symbol: '£', label: 'GBP (£)' },
 13:   { code: 'EUR', symbol: '€', label: 'EUR (€)' },
 14:   { code: 'USD', symbol: '$', label: 'USD ($)' },
 15: ];
 16: const DEFAULT_METRICS: Metric[] = [
 17:   { id: 'revenue',  name: 'Revenue',      unit: '£',      enabled: true,  builtin: true },
 18:   { id: 'profit',   name: 'Net Profit',   unit: '£',      enabled: true,  builtin: true },
 19:   { id: 'covers',   name: 'Covers',       unit: 'covers', enabled: true,  builtin: true },
 20:   { id: 'drinks',   name: 'Drinks Sold',  unit: 'drinks', enabled: false, builtin: true },
 21: ];
 22: 
 23: const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
 24: 
 25: export default function SettingsScreen() {
 26:   const insets = useSafeAreaInsets();
 27:   const { user, signOut } = useAuth();
 28:   const { data: profile, refetch } = useProfile(user?.id);
 29:   const updateProfile = useUpdateProfile();
 30: 
 31:   const [businessName, setBusinessName] = useState('');
 32:   const [businessType, setBusinessType] = useState('Coffee');
 33:   const [currency, setCurrency] = useState('GBP');
 34:   const [metrics, setMetrics] = useState<Metric[]>(DEFAULT_METRICS);
 35:   const [newName, setNewName] = useState('');
 36:   const [newUnit, setNewUnit] = useState('');
 37:   const [saving, setSaving] = useState(false);
 38:   const [refreshing, setRefreshing] = useState(false);
 39: 
 40:   useEffect(() => {
 41:     if (profile) {
 42:       setBusinessName(profile.business_name ?? '');
 43:       setBusinessType(profile.business_type ?? 'Coffee');
 44:       setCurrency(profile.currency ?? 'GBP');
 45:       if (profile.custom_metrics?.length > 0) {
 46:         setMetrics(profile.custom_metrics);
 47:       } else {
 48:         setMetrics(DEFAULT_METRICS);
 49:       }
 50:     }
 51:   }, [profile]);
 52: 
 53:   async function handleRefresh() {
 54:     setRefreshing(true);
 55:     await refetch();
 56:     setRefreshing(false);
 57:   }
 58: 
 59:   function toggleMetric(id: string, enabled: boolean) {
 60:     setMetrics((prev) => prev.map((m) => m.id === id ? { ...m, enabled } : m));
 61:   }
 62: 
 63:   function deleteMetric(id: string) {
 64:     setMetrics((prev) => prev.filter((m) => m.id !== id));
 65:   }
 66: 
 67:   function addMetric() {
 68:     if (!newName.trim()) return;
 69:     const metric: Metric = {
 70:       id: `custom-${Date.now()}`,
 71:       name: newName.trim(),
 72:       unit: newUnit.trim() || 'units',
 73:       enabled: true,
 74:     };
 75:     setMetrics((prev) => [...prev, metric]);
 76:     setNewName('');
 77:     setNewUnit('');
 78:   }
 79: 
 80:   async function handleSave() {
 81:     if (!user) return;
 82:     setSaving(true);
 83:     try {
 84:       await updateProfile.mutateAsync({
 85:         userId: user.id,
 86:         updates: {
 87:           business_name: businessName.trim() || null,
 88:           business_type: businessType,
 89:           currency,
 90:           custom_metrics: metrics,
 91:         },
 92:       });
 93:       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
 94:       Alert.alert('Saved', 'Your settings have been updated.');
 95:     } catch {
 96:       Alert.alert('Error', 'Could not save settings. Please try again.');
 97:     } finally {
 98:       setSaving(false);
 99:     }
100:   }
101: 
102:   return (
103:     <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
104:       <View className="px-4 pt-2 pb-3 bg-white border-b border-stone-100">
105:         <Text className="text-2xl font-bold text-stone-900">Settings</Text>
106:         <Text className="text-stone-400 text-xs mt-0.5">{user?.email}</Text>
107:       </View>
108: 
109:       <ScrollView
110:         className="flex-1 px-4 pt-4"
111:         keyboardShouldPersistTaps="handled"
112:         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b45309" colors={['#b45309']} />}
113:       >
114: 
115:         {/* ── Business Profile ── */}
116:         <Text className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Business Profile</Text>
117:         <View className="bg-white rounded-2xl p-4 border border-stone-100 gap-4 mb-4">
118:           <View>
119:             <Text className="text-sm font-medium text-stone-700 mb-1.5">Business Name</Text>
120:             <TextInput
121:               value={businessName}
122:               onChangeText={setBusinessName}
123:               placeholder="e.g. Brewed by Boon"
124:               accessibilityLabel="Business name"
125:               className="border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900"
126:             />
127:           </View>
128: 
129:           <View>
130:             <Text className="text-sm font-medium text-stone-700 mb-2">Business Type</Text>
131:             <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
132:               {BUSINESS_TYPES.map((t) => (
133:                 <TouchableOpacity
134:                   key={t}
135:                   onPress={() => setBusinessType(t)}
136:                   accessibilityRole="radio"
137:                   accessibilityLabel={t}
138:                   accessibilityState={{ selected: businessType === t }}
139:                   style={{
140:                     paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1,
141:                     backgroundColor: businessType === t ? '#78350f' : '#ffffff',
142:                     borderColor: businessType === t ? '#78350f' : '#e7e5e4',
143:                   }}
144:                 >
145:                   <Text style={{ color: businessType === t ? '#ffffff' : '#57534e', fontWeight: '500', fontSize: 13 }}>{t}</Text>
146:                 </TouchableOpacity>
147:               ))}
148:             </View>
149:           </View>
150: 
151:           <View>
152:             <Text className="text-sm font-medium text-stone-700 mb-2">Currency</Text>
153:             <View className="flex-row gap-2" accessibilityRole="radiogroup">
154:               {CURRENCIES.map((c) => (
155:                 <TouchableOpacity
156:                   key={c.code}
157:                   onPress={() => setCurrency(c.code)}
158:                   accessibilityRole="radio"
159:                   accessibilityLabel={c.label}
160:                   accessibilityState={{ selected: currency === c.code }}
161:                   style={{
162:                     flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, borderWidth: 1,
163:                     backgroundColor: currency === c.code ? '#78350f' : '#ffffff',
164:                     borderColor: currency === c.code ? '#78350f' : '#e7e5e4',
165:                   }}
166:                 >
167:                   <Text style={{ fontWeight: '700', fontSize: 16, color: currency === c.code ? '#ffffff' : '#57534e' }}>{c.symbol}</Text>
168:                   <Text style={{ fontSize: 11, color: currency === c.code ? '#ffffff' : '#9ca3af' }}>{c.label}</Text>
169:                 </TouchableOpacity>
170:               ))}
171:             </View>
172:           </View>
173:         </View>
174: 
175:         {/* ── Metrics ── */}
176:         <Text className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Metrics</Text>
177:         <View className="bg-white rounded-2xl p-4 border border-stone-100 mb-4">
178:           <Text className="text-stone-500 text-xs mb-3">Choose which metrics to track across the app.</Text>
179: 
180:           {metrics.map((metric, idx) => (
181:             <View
182:               key={metric.id}
183:               style={{
184:                 flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
185:                 paddingVertical: 10,
186:                 borderBottomWidth: idx < metrics.length - 1 ? 1 : 0,
187:                 borderBottomColor: '#f5f5f4',
188:               }}
189:             >
190:               <View style={{ flex: 1 }}>
191:                 <Text style={{ fontSize: 14, fontWeight: '500', color: '#1c1917' }}>{metric.name}</Text>
192:                 <Text style={{ fontSize: 11, color: '#a8a29e', marginTop: 1 }}>{metric.unit}</Text>
193:               </View>
194:               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
195:                 {!metric.builtin && (
196:                   <TouchableOpacity
197:                     onPress={() =>
198:                       Alert.alert('Delete Metric', `Remove "${metric.name}"?`, [
199:                         { text: 'Cancel', style: 'cancel' },
200:                         { text: 'Delete', style: 'destructive', onPress: () => deleteMetric(metric.id) },
201:                       ])
202:                     }
203:                     accessibilityRole="button"
204:                     accessibilityLabel={`Delete ${metric.name} metric`}
205:                   >
206:                     <Text style={{ fontSize: 12, color: '#ef4444' }}>Delete</Text>
207:                   </TouchableOpacity>
208:                 )}
209:                 <Switch
210:                   value={metric.enabled}
211:                   onValueChange={(v) => toggleMetric(metric.id, v)}
212:                   accessibilityLabel={`${metric.enabled ? 'Disable' : 'Enable'} ${metric.name} metric`}
213:                   trackColor={{ false: '#e7e5e4', true: '#78350f' }}
214:                   thumbColor="#ffffff"
215:                 />
216:               </View>
217:             </View>
218:           ))}
219: 
220:           {/* Add custom metric */}
221:           <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f5f5f4' }}>
222:             <Text style={{ fontSize: 12, fontWeight: '600', color: '#57534e', marginBottom: 8 }}>Add Custom Metric</Text>
223:             <View style={{ flexDirection: 'row', gap: 6 }}>
224:               <TextInput
225:                 value={newName}
226:                 onChangeText={setNewName}
227:                 placeholder="Name (e.g. Coffees Sold)"
228:                 placeholderTextColor="#a8a29e"
229:                 accessibilityLabel="New metric name"
230:                 style={{
231:                   flex: 1, borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 10,
232:                   paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#1c1917',
233:                 }}
234:               />
235:               <TextInput
236:                 value={newUnit}
237:                 onChangeText={setNewUnit}
238:                 placeholder="Unit"
239:                 placeholderTextColor="#a8a29e"
240:                 accessibilityLabel="New metric unit"
241:                 style={{
242:                   width: 64, borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 10,
243:                   paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#1c1917',
244:                 }}
245:               />
246:               <TouchableOpacity
247:                 onPress={addMetric}
248:                 accessibilityRole="button"
249:                 accessibilityLabel="Add custom metric"
250:                 style={{
251:                   backgroundColor: '#1c1917', borderRadius: 10,
252:                   paddingHorizontal: 14, justifyContent: 'center',
253:                 }}
254:               >
255:                 <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>Add</Text>
256:               </TouchableOpacity>
257:             </View>
258:           </View>
259:         </View>
260: 
261:         {/* Save */}
262:         <TouchableOpacity
263:           onPress={handleSave}
264:           disabled={saving}
265:           accessibilityRole="button"
266:           accessibilityLabel="Save settings"
267:           accessibilityState={{ disabled: saving }}
268:           className="bg-amber-700 py-3.5 rounded-2xl items-center mb-4"
269:         >
270:           {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-base">Save Changes</Text>}
271:         </TouchableOpacity>
272: 
273:         <TouchableOpacity
274:           onPress={signOut}
275:           accessibilityRole="button"
276:           accessibilityLabel="Sign out"
277:           className="bg-white border border-stone-200 py-3.5 rounded-2xl items-center mb-6"
278:         >
279:           <Text className="text-stone-600 font-medium">Sign Out</Text>
280:         </TouchableOpacity>
281: 
282:         {/* App version */}
283:         <Text className="text-stone-300 text-xs text-center mb-8">Version {APP_VERSION}</Text>
284:       </ScrollView>
285:     </View>
286:   );
287: }
````

## File: app/_layout.tsx
````typescript
 1: import '../global.css';
 2: import React, { useEffect } from 'react';
 3: import { Stack, useRouter, useSegments } from 'expo-router';
 4: import { StatusBar } from 'expo-status-bar';
 5: import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 6: import { GestureHandlerRootView } from 'react-native-gesture-handler';
 7: import { SafeAreaProvider } from 'react-native-safe-area-context';
 8: import { AuthProvider, useAuth } from '@/lib/auth';
 9: import { useProfile } from '@/lib/queries/profile';
10: 
11: const queryClient = new QueryClient({
12:   defaultOptions: {
13:     queries: { staleTime: 1000 * 60, retry: 2 },
14:   },
15: });
16: 
17: function RootLayoutNav() {
18:   const { session, loading, user } = useAuth();
19:   const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
20:   const segments = useSegments();
21:   const router = useRouter();
22: 
23:   useEffect(() => {
24:     if (loading) return;
25:     if (profileLoading && session) return; // wait for profile
26:     const inAuthGroup = segments[0] === '(auth)';
27:     const inOnboarding = segments[0] === 'onboarding';
28:     if (!session && !inAuthGroup) {
29:       router.replace('/(auth)/sign-in');
30:     } else if (session && inAuthGroup) {
31:       if (!profile?.business_name) {
32:         router.replace('/onboarding');
33:       } else {
34:         router.replace('/(tabs)/dashboard');
35:       }
36:     } else if (session && !inAuthGroup && !inOnboarding && !profile?.business_name && profile !== null && !profileLoading) {
37:       router.replace('/onboarding');
38:     }
39:   }, [session, loading, segments, profile, profileLoading]);
40: 
41:   return (
42:     <Stack screenOptions={{ headerShown: false }}>
43:       <Stack.Screen name="(auth)" />
44:       <Stack.Screen name="(tabs)" />
45:       <Stack.Screen name="onboarding" />
46:     </Stack>
47:   );
48: }
49: 
50: export default function RootLayout() {
51:   return (
52:     <SafeAreaProvider>
53:       <GestureHandlerRootView style={{ flex: 1 }}>
54:         <QueryClientProvider client={queryClient}>
55:           <AuthProvider>
56:             <RootLayoutNav />
57:             <StatusBar style="dark" />
58:           </AuthProvider>
59:         </QueryClientProvider>
60:       </GestureHandlerRootView>
61:     </SafeAreaProvider>
62:   );
63: }
````

## File: app/index.tsx
````typescript
 1: import { Redirect } from 'expo-router';
 2: import { useAuth } from '@/lib/auth';
 3: import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
 4: 
 5: export default function Index() {
 6:   const { session, loading } = useAuth();
 7: 
 8:   if (loading) return <LoadingSpinner message="Loading..." />;
 9:   if (session) return <Redirect href="/(tabs)/dashboard" />;
10:   return <Redirect href="/(auth)/sign-in" />;
11: }
````

## File: app/onboarding.tsx
````typescript
 1: import React, { useState } from 'react';
 2: import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
 3: import { useRouter } from 'expo-router';
 4: import { useAuth } from '@/lib/auth';
 5: import { useUpdateProfile } from '@/lib/queries/profile';
 6: 
 7: const BUSINESS_TYPES = ['Coffee', 'Street Food', 'Pizza', 'Burgers', 'Desserts', 'Bakery', 'Other'];
 8: 
 9: export default function OnboardingScreen() {
10:   const router = useRouter();
11:   const { user } = useAuth();
12:   const updateProfile = useUpdateProfile();
13:   const [businessName, setBusinessName] = useState('');
14:   const [businessType, setBusinessType] = useState('Coffee');
15:   const [saving, setSaving] = useState(false);
16: 
17:   async function handleSave() {
18:     if (!businessName.trim()) { Alert.alert('Required', 'Please enter your business name.'); return; }
19:     if (!user) return;
20:     setSaving(true);
21:     try {
22:       await updateProfile.mutateAsync({
23:         userId: user.id,
24:         updates: { business_name: businessName.trim(), business_type: businessType, currency: 'GBP', custom_metrics: [] },
25:       });
26:       router.replace('/(tabs)/dashboard');
27:     } catch (e: unknown) {
28:       Alert.alert('Error', 'Could not save your details. Please try again.');
29:     } finally {
30:       setSaving(false);
31:     }
32:   }
33: 
34:   return (
35:     <ScrollView className="flex-1 bg-stone-50" contentContainerStyle={{ padding: 24, paddingTop: 80 }}>
36:       <View className="items-center mb-8">
37:         <View className="w-16 h-16 bg-amber-700 rounded-2xl items-center justify-center mb-4">
38:           <Text style={{ fontSize: 32 }}>☕</Text>
39:         </View>
40:         <Text className="text-2xl font-bold text-stone-900">Welcome!</Text>
41:         <Text className="text-stone-500 text-sm mt-1 text-center">Let's set up your business profile</Text>
42:       </View>
43: 
44:       <Text className="text-sm font-semibold text-stone-700 mb-2">Business Name</Text>
45:       <TextInput
46:         value={businessName}
47:         onChangeText={setBusinessName}
48:         placeholder="e.g. Brewed by Boon"
49:         className="bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-900 mb-6"
50:         autoCapitalize="words"
51:       />
52: 
53:       <Text className="text-sm font-semibold text-stone-700 mb-2">Business Type</Text>
54:       <View className="flex-row flex-wrap gap-2 mb-8">
55:         {BUSINESS_TYPES.map((t) => (
56:           <TouchableOpacity
57:             key={t}
58:             onPress={() => setBusinessType(t)}
59:             style={{
60:               paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
61:               backgroundColor: businessType === t ? '#78350f' : '#ffffff',
62:               borderColor: businessType === t ? '#78350f' : '#e7e5e4',
63:             }}
64:           >
65:             <Text style={{ color: businessType === t ? '#ffffff' : '#57534e', fontWeight: '500', fontSize: 14 }}>{t}</Text>
66:           </TouchableOpacity>
67:         ))}
68:       </View>
69: 
70:       <TouchableOpacity
71:         onPress={handleSave}
72:         disabled={saving}
73:         className="bg-amber-700 py-4 rounded-2xl items-center"
74:       >
75:         {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-base">Get Started →</Text>}
76:       </TouchableOpacity>
77:     </ScrollView>
78:   );
79: }
````

## File: components/companies/CompanyForm.tsx
````typescript
  1: import React, { useState } from 'react';
  2: import { View, ScrollView, TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
  3: import * as Haptics from 'expo-haptics';
  4: import { useForm, Controller, Resolver } from 'react-hook-form';
  5: import { zodResolver } from '@hookform/resolvers/zod';
  6: import { useRouter } from 'expo-router';
  7: import { companySchema, CompanyFormValues } from '@/lib/validations/company.schema';
  8: import { FormField } from '@/components/shared/FormField';
  9: 
 10: interface Props {
 11:   defaultValues?: Partial<CompanyFormValues>;
 12:   onSubmit: (data: CompanyFormValues) => Promise<void>;
 13:   submitLabel?: string;
 14: }
 15: 
 16: export function CompanyForm({ defaultValues, onSubmit, submitLabel = 'Save Company' }: Props) {
 17:   const [loading, setLoading] = useState(false);
 18:   const router = useRouter();
 19: 
 20:   const { control, handleSubmit, formState: { errors } } = useForm<CompanyFormValues>({
 21:     resolver: zodResolver(companySchema) as Resolver<CompanyFormValues>,
 22:     defaultValues: { name: '', contact_name: '', email: '', phone: '', website: '', notes: '', ...defaultValues },
 23:   });
 24: 
 25:   async function handleFormSubmit(data: CompanyFormValues) {
 26:     setLoading(true);
 27:     try {
 28:       await onSubmit(data);
 29:       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
 30:       router.back();
 31:     } catch (e: any) {
 32:       Alert.alert('Error', e.message ?? 'Failed to save company');
 33:     } finally {
 34:       setLoading(false);
 35:     }
 36:   }
 37: 
 38:   return (
 39:     <View className="flex-1 bg-stone-50">
 40:       <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
 41:         <View className="gap-4">
 42:           <Controller
 43:             control={control} name="name"
 44:             render={({ field }) => (
 45:               <FormField
 46:                 label="Company Name" required
 47:                 value={field.value} onChangeText={field.onChange}
 48:                 error={errors.name?.message}
 49:                 placeholder="Street Food Festivals Ltd"
 50:               />
 51:             )}
 52:           />
 53:           <Controller
 54:             control={control} name="contact_name"
 55:             render={({ field }) => (
 56:               <FormField
 57:                 label="Contact Name"
 58:                 value={field.value ?? ''} onChangeText={field.onChange}
 59:                 placeholder="John Smith"
 60:               />
 61:             )}
 62:           />
 63:           <Controller
 64:             control={control} name="email"
 65:             render={({ field }) => (
 66:               <FormField
 67:                 label="Email"
 68:                 value={field.value ?? ''} onChangeText={field.onChange}
 69:                 error={errors.email?.message}
 70:                 placeholder="hello@company.com"
 71:                 keyboardType="email-address"
 72:                 autoCapitalize="none"
 73:               />
 74:             )}
 75:           />
 76:           <Controller
 77:             control={control} name="phone"
 78:             render={({ field }) => (
 79:               <FormField
 80:                 label="Phone"
 81:                 value={field.value ?? ''} onChangeText={field.onChange}
 82:                 placeholder="+44 7700 900000"
 83:                 keyboardType="phone-pad"
 84:               />
 85:             )}
 86:           />
 87:           <Controller
 88:             control={control} name="website"
 89:             render={({ field }) => (
 90:               <FormField
 91:                 label="Website"
 92:                 value={field.value ?? ''} onChangeText={field.onChange}
 93:                 error={errors.website?.message}
 94:                 placeholder="https://company.com"
 95:                 keyboardType="url"
 96:                 autoCapitalize="none"
 97:               />
 98:             )}
 99:           />
100:           <Controller
101:             control={control} name="notes"
102:             render={({ field }) => (
103:               <FormField
104:                 label="Notes"
105:                 value={field.value ?? ''} onChangeText={field.onChange}
106:                 placeholder="Any notes about this company..."
107:                 multiline numberOfLines={4}
108:                 style={{ textAlignVertical: 'top', minHeight: 96 }}
109:               />
110:             )}
111:           />
112:         </View>
113:         <View style={{ height: 100 }} />
114:       </ScrollView>
115: 
116:       <View className="px-4 pb-6 pt-3 bg-white border-t border-stone-100">
117:         <TouchableOpacity
118:           onPress={handleSubmit(handleFormSubmit)}
119:           className="bg-amber-700 py-4 rounded-xl items-center"
120:           disabled={loading}
121:         >
122:           {loading ? <ActivityIndicator color="#fff" /> : (
123:             <Text className="text-white font-bold text-base">{submitLabel}</Text>
124:           )}
125:         </TouchableOpacity>
126:       </View>
127:     </View>
128:   );
129: }
````

## File: components/dashboard/RevenueBarChart.tsx
````typescript
 1: import React, { useState } from 'react';
 2: import { View, Text, TouchableOpacity } from 'react-native';
 3: import type { MonthlyRevenue } from '@/types';
 4: import { formatCurrencyCompact } from '@/lib/formatters';
 5: 
 6: const CHART_HEIGHT = 140;
 7: 
 8: interface Props {
 9:   data: MonthlyRevenue[];
10: }
11: 
12: export function RevenueBarChart({ data }: Props) {
13:   const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
14:   const maxValue = Math.max(...data.map((d) => Math.max(d.grossSales, d.netProfit)), 1);
15:   const hasAnyData = data.some((d) => d.grossSales > 0 || d.netProfit !== 0);
16: 
17:   const selected = selectedMonth != null ? data[selectedMonth] : null;
18: 
19:   return (
20:     <View className="bg-white rounded-2xl p-4 border border-stone-100">
21:       <Text className="font-bold text-stone-900 mb-2">Monthly Revenue {new Date().getFullYear()}</Text>
22: 
23:       {!hasAnyData ? (
24:         <View className="py-8 items-center justify-center">
25:           <Text className="text-3xl mb-2">📊</Text>
26:           <Text className="text-stone-500 text-sm text-center px-4">
27:             No revenue recorded for this year yet.
28:           </Text>
29:           <Text className="text-stone-400 text-xs text-center mt-1 px-4">
30:             Add financials to your events to see your monthly breakdown.
31:           </Text>
32:         </View>
33:       ) : (
34:         <>
35:           <View className="flex-row items-center gap-4 mb-3">
36:             <View className="flex-row items-center gap-1.5">
37:               <View className="w-3 h-3 rounded-sm bg-amber-400" />
38:               <Text className="text-stone-500 text-xs">Gross Sales</Text>
39:             </View>
40:             <View className="flex-row items-center gap-1.5">
41:               <View className="w-3 h-3 rounded-sm bg-green-500" />
42:               <Text className="text-stone-500 text-xs">Net Profit</Text>
43:             </View>
44:           </View>
45: 
46:           {/* Tooltip */}
47:           <View style={{ minHeight: 34, marginBottom: 4 }}>
48:             {selected ? (
49:               <View style={{ backgroundColor: '#fef3c7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' }}>
50:                 <Text style={{ fontSize: 11, fontWeight: '700', color: '#78350f' }}>{selected.month}</Text>
51:                 <Text style={{ fontSize: 10, color: '#92400e' }}>
52:                   Gross {formatCurrencyCompact(selected.grossSales)} · Net {formatCurrencyCompact(selected.netProfit)}
53:                 </Text>
54:               </View>
55:             ) : (
56:               <Text style={{ fontSize: 10, color: '#a8a29e' }}>Tap a bar for details</Text>
57:             )}
58:           </View>
59: 
60:           <View style={{ height: CHART_HEIGHT, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
61:             {data.map((d, i) => {
62:               const grossHeight = maxValue > 0 ? (d.grossSales / maxValue) * (CHART_HEIGHT - 20) : 0;
63:               const netHeight = maxValue > 0 ? (Math.max(d.netProfit, 0) / maxValue) * (CHART_HEIGHT - 20) : 0;
64:               const isSelected = selectedMonth === i;
65:               return (
66:                 <TouchableOpacity
67:                   key={i}
68:                   activeOpacity={0.7}
69:                   onPress={() => setSelectedMonth(isSelected ? null : i)}
70:                   accessibilityRole="button"
71:                   accessibilityLabel={`${d.month}: gross ${d.grossSales.toFixed(0)}, net ${d.netProfit.toFixed(0)}`}
72:                   style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}
73:                 >
74:                   <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: CHART_HEIGHT - 20, opacity: isSelected || selectedMonth == null ? 1 : 0.4 }}>
75:                     <View style={{ width: '45%', height: grossHeight, backgroundColor: '#fbbf24', borderRadius: 2 }} />
76:                     <View style={{ width: '45%', height: netHeight, backgroundColor: '#22c55e', borderRadius: 2 }} />
77:                   </View>
78:                   <Text style={{ fontSize: 9, color: isSelected ? '#b45309' : '#a8a29e', marginTop: 2, fontWeight: isSelected ? '700' : '500' }}>
79:                     {d.month.slice(0, 3)}
80:                   </Text>
81:                 </TouchableOpacity>
82:               );
83:             })}
84:           </View>
85:         </>
86:       )}
87:     </View>
88:   );
89: }
````

## File: components/dashboard/StatCard.tsx
````typescript
 1: import React from 'react';
 2: import { View, Text } from 'react-native';
 3: 
 4: interface Props {
 5:   title: string;
 6:   value: string;
 7:   subtext?: string;
 8:   subtitle?: string;
 9:   icon?: string;
10:   trendValue?: number;
11:   colorScheme?: 'default' | 'green' | 'amber' | 'red';
12: }
13: 
14: export function StatCard({ title, value, subtext, subtitle, icon, trendValue, colorScheme = 'default' }: Props) {
15:   const bgColors = {
16:     default: 'bg-white',
17:     green: 'bg-green-50',
18:     amber: 'bg-amber-50',
19:     red: 'bg-red-50',
20:   };
21:   const valueColors = {
22:     default: 'text-stone-900',
23:     green: 'text-green-700',
24:     amber: 'text-amber-700',
25:     red: 'text-red-600',
26:   };
27: 
28:   return (
29:     <View className={`${bgColors[colorScheme]} rounded-2xl p-4 border border-stone-100 flex-1`}>
30:       <View className="flex-row items-center justify-between mb-2">
31:         {icon && <Text className="text-xl">{icon}</Text>}
32:         {trendValue !== undefined && (
33:           <View className={`flex-row items-center px-1.5 py-0.5 rounded-full ${trendValue >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
34:             <Text className={`text-xs font-medium ${trendValue >= 0 ? 'text-green-700' : 'text-red-600'}`}>
35:               {trendValue >= 0 ? '↑' : '↓'} {Math.abs(trendValue).toFixed(0)}%
36:             </Text>
37:           </View>
38:         )}
39:       </View>
40:       <Text className={`text-xl font-bold ${valueColors[colorScheme]}`} numberOfLines={1}>{value}</Text>
41:       <Text className="text-stone-500 text-xs mt-0.5">{title}</Text>
42:       {subtext && <Text className="text-stone-400 text-xs mt-1">{subtext}</Text>}
43:       {subtitle && <Text className="text-stone-400 text-xs mt-1">{subtitle}</Text>}
44:     </View>
45:   );
46: }
````

## File: components/dashboard/StatusPieChart.tsx
````typescript
 1: import React from 'react';
 2: import { View, Text } from 'react-native';
 3: import { STATUS_PIE_COLORS, STATUS_LABELS } from '@/constants';
 4: import type { StatusCount } from '@/types';
 5: 
 6: interface Props {
 7:   data: StatusCount[];
 8: }
 9: 
10: export function StatusPieChart({ data }: Props) {
11:   if (data.length === 0) return null;
12: 
13:   const total = data.reduce((s, d) => s + d.count, 0);
14: 
15:   return (
16:     <View className="bg-white rounded-2xl p-4 border border-stone-100">
17:       <Text className="font-bold text-stone-900 mb-3">Applications Breakdown</Text>
18: 
19:       {/* Horizontal stacked bar */}
20:       <View className="flex-row rounded-full overflow-hidden h-5 mb-4">
21:         {data.map((d) => (
22:           <View
23:             key={d.status}
24:             style={{
25:               flex: d.count / total,
26:               backgroundColor: STATUS_PIE_COLORS[d.status],
27:             }}
28:           />
29:         ))}
30:       </View>
31: 
32:       {/* Legend */}
33:       <View className="flex-row flex-wrap gap-x-4 gap-y-2">
34:         {data.map((d) => (
35:           <View key={d.status} className="flex-row items-center gap-1.5">
36:             <View style={{ backgroundColor: STATUS_PIE_COLORS[d.status], width: 10, height: 10, borderRadius: 5 }} />
37:             <Text className="text-stone-600 text-xs">
38:               {STATUS_LABELS[d.status]}{' '}
39:               <Text className="font-bold text-stone-900">{d.count}</Text>
40:               <Text className="text-stone-400"> ({((d.count / total) * 100).toFixed(0)}%)</Text>
41:             </Text>
42:           </View>
43:         ))}
44:       </View>
45:     </View>
46:   );
47: }
````

## File: components/events/CalendarView.tsx
````typescript
  1: import React, { useState, useMemo, useRef, useEffect } from 'react';
  2: import {
  3:   View, Text, TouchableOpacity, ScrollView, RefreshControl, PanResponder,
  4: } from 'react-native';
  5: import { useRouter } from 'expo-router';
  6: import { STATUS_COLORS, STATUS_LABELS } from '@/constants';
  7: import { OverlapModal } from './OverlapModal';
  8: import type { EventWithFinancials, ApplicationStatus } from '@/types';
  9: 
 10: // Re-export scoring helpers so legacy imports of `scoreEvent` / `ScoreResult`
 11: // from `@/components/events/CalendarView` continue to work.
 12: export { scoreEvent } from '@/lib/scoring';
 13: export type { ScoreResult } from '@/lib/scoring';
 14: 
 15: const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
 16: const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
 17: 
 18: // ── helpers ──────────────────────────────────────────────────────────────────────────────
 19: 
 20: function isoDate(d: Date): string {
 21:   return d.toISOString().split('T')[0];
 22: }
 23: 
 24: function buildGrid(year: number, month: number): (Date | null)[][] {
 25:   const first = new Date(year, month, 1);
 26:   const last  = new Date(year, month + 1, 0);
 27:   const startDow = (first.getDay() + 6) % 7; // Mon = 0
 28:   const grid: (Date | null)[][] = [];
 29:   let row: (Date | null)[] = Array(startDow).fill(null);
 30:   for (let d = 1; d <= last.getDate(); d++) {
 31:     row.push(new Date(year, month, d));
 32:     if (row.length === 7) { grid.push(row); row = []; }
 33:   }
 34:   if (row.length > 0) {
 35:     while (row.length < 7) row.push(null);
 36:     grid.push(row);
 37:   }
 38:   return grid;
 39: }
 40: 
 41: function eventsOnDate(events: EventWithFinancials[], date: Date): EventWithFinancials[] {
 42:   const d = isoDate(date);
 43:   return events.filter((e) => {
 44:     const start = e.date;
 45:     const end = e.end_date ?? e.date;
 46:     return d >= start && d <= end;
 47:   });
 48: }
 49: 
 50: // ── main CalendarView ────────────────────────────────────────────────────────────────────────────
 51: 
 52: export function CalendarView({
 53:   events,
 54:   refreshControl,
 55: }: {
 56:   events: EventWithFinancials[];
 57:   refreshControl?: React.ReactElement<typeof RefreshControl>;
 58: }) {
 59:   const today = new Date();
 60:   const router = useRouter();
 61:   const [year, setYear]   = useState(today.getFullYear());
 62:   const [month, setMonth] = useState(today.getMonth()); // 0-based
 63:   const [selected, setSelected] = useState<{ date: string; events: EventWithFinancials[] } | null>(null);
 64: 
 65:   const grid = useMemo(() => buildGrid(year, month), [year, month]);
 66:   const todayStr = isoDate(today);
 67: 
 68:   function prevMonth() {
 69:     if (month === 0) { setMonth(11); setYear(y => y - 1); }
 70:     else setMonth(m => m - 1);
 71:   }
 72:   function nextMonth() {
 73:     if (month === 11) { setMonth(0); setYear(y => y + 1); }
 74:     else setMonth(m => m + 1);
 75:   }
 76: 
 77:   const monthHandlersRef = useRef({ prevMonth, nextMonth });
 78:   useEffect(() => {
 79:     monthHandlersRef.current = { prevMonth, nextMonth };
 80:   });
 81: 
 82:   const panResponder = useRef(
 83:     PanResponder.create({
 84:       onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy),
 85:       onPanResponderRelease: (_, g) => {
 86:         if (g.dx < -40) monthHandlersRef.current.nextMonth();
 87:         else if (g.dx > 40) monthHandlersRef.current.prevMonth();
 88:       },
 89:     }),
 90:   ).current;
 91: 
 92:   return (
 93:     <View className="flex-1" {...panResponder.panHandlers}>
 94:       <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-stone-100">
 95:         <TouchableOpacity onPress={prevMonth} className="w-9 h-9 items-center justify-center rounded-full bg-stone-100">
 96:           <Text className="text-stone-600 font-bold text-lg">‹</Text>
 97:         </TouchableOpacity>
 98:         <Text className="font-bold text-stone-900 text-base">{MONTHS[month]} {year}</Text>
 99:         <TouchableOpacity onPress={nextMonth} className="w-9 h-9 items-center justify-center rounded-full bg-stone-100">
100:           <Text className="text-stone-600 font-bold text-lg">›</Text>
101:         </TouchableOpacity>
102:       </View>
103: 
104:       <View className="flex-row bg-white border-b border-stone-100 px-1">
105:         {DOW.map((d) => (
106:           <View key={d} className="flex-1 items-center py-2">
107:             <Text className="text-stone-400 text-xs font-semibold">{d}</Text>
108:           </View>
109:         ))}
110:       </View>
111: 
112:       <ScrollView className="flex-1 bg-stone-50" refreshControl={refreshControl}>
113:         {grid.map((row, ri) => (
114:           <View key={ri} className="flex-row px-1">
115:             {row.map((date, ci) => {
116:               if (!date) return <View key={ci} className="flex-1 m-0.5 h-16" />;
117:               const dayEvents = eventsOnDate(events, date);
118:               const ds = isoDate(date);
119:               const isToday = ds === todayStr;
120:               const hasOverlap = dayEvents.length >= 2;
121:               const statusSet = [...new Set(dayEvents.map((e) => e.status))];
122: 
123:               return (
124:                 <TouchableOpacity
125:                   key={ci}
126:                   onPress={() => dayEvents.length > 0 && setSelected({ date: ds, events: dayEvents })}
127:                   activeOpacity={dayEvents.length > 0 ? 0.7 : 1}
128:                   className={`flex-1 m-0.5 h-16 rounded-xl p-1.5 ${
129:                     isToday ? 'bg-amber-50 border border-amber-300' : 'bg-white border border-stone-100'
130:                   }`}
131:                 >
132:                   <View className="flex-row items-center justify-between mb-1">
133:                     <Text className={`text-xs font-semibold ${isToday ? 'text-amber-600' : 'text-stone-700'}`}>
134:                       {date.getDate()}
135:                     </Text>
136:                     {hasOverlap && (
137:                       <View className="bg-red-100 px-1 rounded">
138:                         <Text className="text-red-600 text-xs font-bold">!</Text>
139:                       </View>
140:                     )}
141:                   </View>
142: 
143:                   <View className="flex-row flex-wrap gap-0.5">
144:                     {statusSet.slice(0, 3).map((status) => (
145:                       <View
146:                         key={status}
147:                         style={{ backgroundColor: STATUS_COLORS[status as ApplicationStatus]?.dot ?? '#94a3b8', width: 6, height: 6, borderRadius: 3 }}
148:                       />
149:                     ))}
150:                   </View>
151: 
152:                   {dayEvents.length === 1 && (
153:                     <Text className="text-stone-500 text-xs mt-0.5 leading-tight" numberOfLines={1}>
154:                       {dayEvents[0].name}
155:                     </Text>
156:                   )}
157:                   {dayEvents.length > 1 && (
158:                     <Text className="text-stone-500 text-xs mt-0.5">{dayEvents.length} events</Text>
159:                   )}
160:                 </TouchableOpacity>
161:               );
162:             })}
163:           </View>
164:         ))}
165: 
166:         <View className="mx-4 mt-3 mb-6 bg-white rounded-2xl p-3 border border-stone-100">
167:           <Text className="text-stone-400 text-xs font-bold uppercase tracking-wide mb-2">Legend</Text>
168:           <View className="flex-row flex-wrap gap-3">
169:             {(['pending', 'waitlisted', 'accepted', 'rejected'] as ApplicationStatus[]).map((s) => (
170:               <View key={s} className="flex-row items-center gap-1.5">
171:                 <View style={{ backgroundColor: STATUS_COLORS[s].dot, width: 8, height: 8, borderRadius: 4 }} />
172:                 <Text className="text-stone-500 text-xs">{STATUS_LABELS[s]}</Text>
173:               </View>
174:             ))}
175:             <View className="flex-row items-center gap-1.5">
176:               <View className="bg-red-100 px-1 rounded">
177:                 <Text className="text-red-600 text-xs font-bold">!</Text>
178:               </View>
179:               <Text className="text-stone-500 text-xs">Overlap</Text>
180:             </View>
181:           </View>
182:         </View>
183:       </ScrollView>
184: 
185:       {selected && (
186:         <OverlapModal
187:           events={selected.events}
188:           allEvents={events}
189:           date={selected.date}
190:           onClose={() => setSelected(null)}
191:           router={router}
192:         />
193:       )}
194:     </View>
195:   );
196: }
````

## File: components/events/EventCard.tsx
````typescript
  1: import React from 'react';
  2: import { View, Text, TouchableOpacity } from 'react-native';
  3: import { useRouter } from 'expo-router';
  4: import { EventStatusBadge } from '@/components/shared/EventStatusBadge';
  5: import { formatDateRange, formatCurrency } from '@/lib/formatters';
  6: import { STATUS_COLORS } from '@/constants';
  7: import type { EventWithFinancials } from '@/types';
  8: 
  9: interface Props {
 10:   event: EventWithFinancials;
 11: }
 12: 
 13: export const EventCard = React.memo(function EventCard({ event }: Props) {
 14:   const router = useRouter();
 15:   const fin = event.event_financials;
 16:   const calc = event.calculations;
 17:   const dotColor = STATUS_COLORS[event.status]?.dot ?? '#a8a29e';
 18:   const unitName = event.units?.length ? event.units.map((u) => u.name).join(' · ') : null;
 19: 
 20:   return (
 21:     <TouchableOpacity
 22:       onPress={() => router.push(`/(tabs)/events/${event.id}`)}
 23:       className="bg-white rounded-2xl mb-3 border border-slate-100 overflow-hidden"
 24:       activeOpacity={0.7}
 25:       style={{
 26:         elevation: 1,
 27:         shadowColor: '#000',
 28:         shadowOpacity: 0.04,
 29:         shadowRadius: 4,
 30:         shadowOffset: { width: 0, height: 1 },
 31:       }}
 32:     >
 33:       {/* Status colour strip on left */}
 34:       <View style={{ flexDirection: 'row' }}>
 35:         <View
 36:           style={{
 37:             width: 4,
 38:             backgroundColor: dotColor,
 39:             borderTopLeftRadius: 16,
 40:             borderBottomLeftRadius: 16,
 41:           }}
 42:         />
 43:         <View style={{ flex: 1, padding: 14 }}>
 44:           <View className="flex-row items-start justify-between mb-1.5">
 45:             <View className="flex-1 mr-3">
 46:               <Text
 47:                 className="font-bold text-slate-900 text-[15px] leading-snug"
 48:                 numberOfLines={2}
 49:               >
 50:                 {event.name}
 51:               </Text>
 52:               <Text className="text-slate-500 text-xs mt-0.5" numberOfLines={1}>
 53:                 📍 {event.location}
 54:               </Text>
 55:             </View>
 56:             <EventStatusBadge status={event.status} />
 57:           </View>
 58: 
 59:           <View className="flex-row items-center flex-wrap gap-x-3 gap-y-1 mt-1">
 60:             <Text className="text-slate-400 text-xs">
 61:               📅 {formatDateRange(event.date, event.end_date)}
 62:             </Text>
 63:             {event.concessions_companies && (
 64:               <Text className="text-slate-400 text-xs" numberOfLines={1}>
 65:                 🏢 {event.concessions_companies.name}
 66:               </Text>
 67:             )}
 68:             {unitName && (
 69:               <Text className="text-slate-400 text-xs" numberOfLines={1}>
 70:                 🚐 {unitName}
 71:               </Text>
 72:             )}
 73:             {event.url_changed && (
 74:               <View className="flex-row items-center bg-orange-100 px-2 py-0.5 rounded-full">
 75:                 <Text className="text-orange-700 text-xs font-semibold">⚡ Page changed</Text>
 76:               </View>
 77:             )}
 78:           </View>
 79: 
 80:           {fin && fin.gross_sales > 0 && (
 81:             <View className="flex-row mt-3 pt-3 border-t border-slate-50 gap-5">
 82:               <View>
 83:                 <Text className="text-slate-400 text-xs">Gross Sales</Text>
 84:                 <Text className="font-bold text-slate-900 text-sm">
 85:                   {formatCurrency(fin.gross_sales)}
 86:                 </Text>
 87:               </View>
 88:               <View>
 89:                 <Text className="text-slate-400 text-xs">Net Profit</Text>
 90:                 <Text
 91:                   className={`font-bold text-sm ${
 92:                     calc.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'
 93:                   }`}
 94:                 >
 95:                   {formatCurrency(calc.netProfit)}
 96:                 </Text>
 97:               </View>
 98:               <View>
 99:                 <Text className="text-slate-400 text-xs">Margin</Text>
100:                 <Text
101:                   className={`font-bold text-sm ${
102:                     calc.profitMargin >= 20
103:                       ? 'text-emerald-600'
104:                       : calc.profitMargin >= 0
105:                       ? 'text-amber-600'
106:                       : 'text-red-500'
107:                   }`}
108:                 >
109:                   {calc.profitMargin.toFixed(1)}%
110:                 </Text>
111:               </View>
112:             </View>
113:           )}
114:         </View>
115:       </View>
116:     </TouchableOpacity>
117:   );
118: });
````

## File: components/events/EventForm.tsx
````typescript
   1: import React, { useState, useRef, useEffect } from 'react';
   2: import {
   3:   View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Switch, Modal,
   4: } from 'react-native';
   5: import * as Haptics from 'expo-haptics';
   6: import { format, parseISO, isValid } from 'date-fns';
   7: import { useForm, Controller, useFieldArray, Control, UseFormWatch } from 'react-hook-form';
   8: import { zodResolver } from '@hookform/resolvers/zod';
   9: import { useRouter } from 'expo-router';
  10: import { eventSchema } from '@/lib/validations/event.schema';
  11: import type { EventFormValues } from '@/lib/validations/event.schema';
  12: import { FormField } from '@/components/shared/FormField';
  13: import { CurrencyInput } from '@/components/shared/CurrencyInput';
  14: import { formatCurrency } from '@/lib/formatters';
  15: import {
  16:   STATUSES, STATUS_LABELS, STATUS_COLORS,
  17:   INFRASTRUCTURE_CATEGORIES, INFRASTRUCTURE_CATEGORY_LABELS,
  18:   UNIT_STATUS_COLORS,
  19: } from '@/constants';
  20: import type { ConcessionsCompany, ApplicationStatus, InfrastructureCategory, Unit } from '@/types';
  21: 
  22: const TABS = ['Details', 'Financials', 'Staffing', 'Costs', 'Notes'] as const;
  23: 
  24: /** Convert DD/MM/YYYY → YYYY-MM-DD. Passes through ISO dates and empty strings unchanged. */
  25: function ukToIso(val: string | undefined | null): string {
  26:   if (!val) return '';
  27:   const match = val.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  28:   if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  29:   return val;
  30: }
  31: 
  32: function SectionHeader({ title }: { title: string }) {
  33:   return (
  34:     <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 mb-1">
  35:       {title}
  36:     </Text>
  37:   );
  38: }
  39: 
  40: const ITEM_HEIGHT = 48;
  41: const VISIBLE_ITEMS = 5;
  42: const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  43: 
  44: function daysInMonth(month1based: number, year: number): number {
  45:   return new Date(year, month1based, 0).getDate();
  46: }
  47: 
  48: function WheelColumn({
  49:   items,
  50:   initialIndex,
  51:   onChange,
  52: }: {
  53:   items: (string | number)[];
  54:   initialIndex: number;
  55:   onChange: (index: number) => void;
  56: }) {
  57:   const scrollRef = useRef<ScrollView>(null);
  58:   const [selectedIdx, setSelectedIdx] = useState(Math.max(0, Math.min(initialIndex, items.length - 1)));
  59: 
  60:   useEffect(() => {
  61:     const safeIdx = Math.max(0, Math.min(initialIndex, items.length - 1));
  62:     setSelectedIdx(safeIdx);
  63:     setTimeout(() => {
  64:       scrollRef.current?.scrollTo({ y: safeIdx * ITEM_HEIGHT, animated: false });
  65:     }, 200);
  66:   }, [initialIndex, items.length]);
  67: 
  68:   function handleScrollEnd(y: number) {
  69:     const idx = Math.max(0, Math.min(Math.round(y / ITEM_HEIGHT), items.length - 1));
  70:     setSelectedIdx(idx);
  71:     onChange(idx);
  72:   }
  73: 
  74:   return (
  75:     <View style={{ flex: 1, overflow: 'hidden' }}>
  76:       {/* Selection highlight band */}
  77:       <View
  78:         pointerEvents="none"
  79:         style={{
  80:           position: 'absolute', top: ITEM_HEIGHT * 2, left: 4, right: 4,
  81:           height: ITEM_HEIGHT, backgroundColor: '#f1f5f9', borderRadius: 10,
  82:         }}
  83:       />
  84:       <ScrollView
  85:         ref={scrollRef}
  86:         snapToInterval={ITEM_HEIGHT}
  87:         decelerationRate="fast"
  88:         showsVerticalScrollIndicator={false}
  89:         contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
  90:         style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
  91:         onMomentumScrollEnd={(e) => handleScrollEnd(e.nativeEvent.contentOffset.y)}
  92:         onScrollEndDrag={(e) => handleScrollEnd(e.nativeEvent.contentOffset.y)}
  93:       >
  94:         {items.map((item, index) => (
  95:           <TouchableOpacity
  96:             key={index}
  97:             style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}
  98:             onPress={() => {
  99:               setSelectedIdx(index);
 100:               onChange(index);
 101:               scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
 102:             }}
 103:             activeOpacity={0.6}
 104:           >
 105:             <Text style={{
 106:               fontSize: selectedIdx === index ? 17 : 15,
 107:               fontWeight: selectedIdx === index ? '600' : '400',
 108:               color: selectedIdx === index ? '#0f172a' : '#94a3b8',
 109:             }}>
 110:               {String(item)}
 111:             </Text>
 112:           </TouchableOpacity>
 113:         ))}
 114:       </ScrollView>
 115:     </View>
 116:   );
 117: }
 118: 
 119: function DatePickerModal({
 120:   visible, value, onConfirm, onClose,
 121: }: {
 122:   visible: boolean; value: string; onConfirm: (iso: string) => void; onClose: () => void;
 123: }) {
 124:   const now = new Date();
 125:   const currentYear = now.getFullYear();
 126:   const years = Array.from({ length: 21 }, (_, i) => currentYear - 5 + i);
 127: 
 128:   const [dayIdx, setDayIdx] = useState(now.getDate() - 1);
 129:   const [monthIdx, setMonthIdx] = useState(now.getMonth());
 130:   const [yearIdx, setYearIdx] = useState(5);
 131: 
 132:   useEffect(() => {
 133:     if (!visible) return;
 134:     const p = (() => {
 135:       if (!value) return now;
 136:       try { const d = parseISO(value); return isValid(d) ? d : now; }
 137:       catch { return now; }
 138:     })();
 139:     const yi = years.indexOf(p.getFullYear());
 140:     setDayIdx(p.getDate() - 1);
 141:     setMonthIdx(p.getMonth());
 142:     setYearIdx(yi >= 0 ? yi : 5);
 143:   }, [visible]);
 144: 
 145:   const numDays = daysInMonth(monthIdx + 1, years[yearIdx]);
 146:   const days = Array.from({ length: numDays }, (_, i) => i + 1);
 147:   const clampedDayIdx = Math.min(dayIdx, numDays - 1);
 148: 
 149:   function handleConfirm() {
 150:     const year = years[yearIdx];
 151:     const month = monthIdx + 1;
 152:     const day = Math.min(dayIdx + 1, daysInMonth(month, year));
 153:     const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
 154:     onConfirm(iso);
 155:     onClose();
 156:   }
 157: 
 158:   return (
 159:     <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
 160:       <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
 161:         <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
 162:         <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
 163:           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
 164:             <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
 165:               <Text style={{ fontSize: 16, color: '#64748b' }}>Cancel</Text>
 166:             </TouchableOpacity>
 167:             <TouchableOpacity onPress={handleConfirm} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
 168:               <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>Done</Text>
 169:             </TouchableOpacity>
 170:           </View>
 171:           <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 36 }}>
 172:             <WheelColumn
 173:               key={`day-${monthIdx}-${yearIdx}`}
 174:               items={days}
 175:               initialIndex={clampedDayIdx}
 176:               onChange={(idx) => setDayIdx(idx)}
 177:             />
 178:             <WheelColumn
 179:               key="month"
 180:               items={MONTHS_SHORT}
 181:               initialIndex={monthIdx}
 182:               onChange={(idx) => setMonthIdx(idx)}
 183:             />
 184:             <WheelColumn
 185:               key="year"
 186:               items={years}
 187:               initialIndex={yearIdx}
 188:               onChange={(idx) => setYearIdx(idx)}
 189:             />
 190:           </View>
 191:         </View>
 192:       </View>
 193:     </Modal>
 194:   );
 195: }
 196: 
 197: function DatePickerButton({
 198:   label,
 199:   value,
 200:   onChange,
 201:   required,
 202: }: {
 203:   label: string;
 204:   value: string;
 205:   onChange: (isoDate: string) => void;
 206:   required?: boolean;
 207: }) {
 208:   const [show, setShow] = useState(false);
 209:   const displayText = value
 210:     ? (() => { try { const d = parseISO(value); return isValid(d) ? format(d, 'd MMM yyyy') : value; } catch { return value; } })()
 211:     : '';
 212: 
 213:   return (
 214:     <View>
 215:       <Text className="text-slate-600 text-sm font-semibold mb-1.5">
 216:         {label}{required && <Text className="text-red-500"> *</Text>}
 217:       </Text>
 218:       <TouchableOpacity
 219:         onPress={() => setShow(true)}
 220:         style={{
 221:           flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
 222:           borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
 223:           paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#ffffff',
 224:         }}
 225:       >
 226:         <Text style={{ color: displayText ? '#0f172a' : '#94a3b8', fontSize: 15 }}>
 227:           {displayText || 'Select date'}
 228:         </Text>
 229:         <Text style={{ fontSize: 16 }}>📅</Text>
 230:       </TouchableOpacity>
 231:       <DatePickerModal
 232:         visible={show}
 233:         value={value}
 234:         onConfirm={onChange}
 235:         onClose={() => setShow(false)}
 236:       />
 237:     </View>
 238:   );
 239: }
 240: 
 241: function CalcRow({
 242:   label,
 243:   value,
 244:   highlight,
 245: }: {
 246:   label: string;
 247:   value: string;
 248:   highlight?: boolean;
 249: }) {
 250:   return (
 251:     <View className="flex-row justify-between items-center py-1">
 252:       <Text className={`text-xs ${highlight ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
 253:         {label}
 254:       </Text>
 255:       <Text className={`text-xs font-semibold ${highlight ? 'text-slate-900' : 'text-slate-600'}`}>
 256:         {value}
 257:       </Text>
 258:     </View>
 259:   );
 260: }
 261: 
 262: // ─────────────────────────────────────────────────────────────
 263: // FINANCIALS TAB SUB-COMPONENT
 264: // ─────────────────────────────────────────────────────────────
 265: function FinancialsTabContent({
 266:   control,
 267:   watch,
 268: }: {
 269:   control: Control<EventFormValues>;
 270:   watch: UseFormWatch<EventFormValues>;
 271: }) {
 272:   const zeroRated = watch('zero_rated_sales') ?? 0;
 273:   const standardRated = watch('standard_rated_sales') ?? 0;
 274:   const commissionPct = watch('concessions_commission_pct') ?? 0;
 275:   const pitchFee = watch('pitch_fee') ?? 0;
 276:   const refundPct = watch('pitch_fee_refund_pct') ?? 0;
 277:   const powerFee = watch('power_fee') ?? 0;
 278: 
 279:   const standardRatedNet = standardRated / 1.2;
 280:   const vatCollected = standardRated - standardRatedNet;
 281:   const totalNetSales = zeroRated + standardRatedNet;
 282: 
 283:   const commissionAmount = totalNetSales * (commissionPct / 100);
 284:   const pitchFeeRefundGross = pitchFee * (refundPct / 100);
 285:   const netRefund = pitchFeeRefundGross - commissionAmount;
 286:   const effectivePitchFee = pitchFee - pitchFeeRefundGross + commissionAmount + powerFee;
 287: 
 288:   return (
 289:     <View className="gap-4">
 290:       <View className="bg-amber-50 rounded-xl p-3 border border-amber-100">
 291:         <Text className="text-amber-800 text-sm font-medium mb-0.5">Recording financials</Text>
 292:         <Text className="text-amber-700 text-xs">
 293:           Fill in after the event. Profit is calculated on net (ex-VAT) sales.
 294:         </Text>
 295:       </View>
 296: 
 297:       {/* ── SALES & VAT ── */}
 298:       <SectionHeader title="Sales & VAT" />
 299:       <View className="bg-white rounded-xl p-4 border border-slate-100 gap-3">
 300:         <Controller
 301:           control={control}
 302:           name="standard_rated_sales"
 303:           render={({ field }) => (
 304:             <CurrencyInput
 305:               label="Hot drinks & food — 20% VAT"
 306:               value={field.value}
 307:               onChangeValue={field.onChange}
 308:             />
 309:           )}
 310:         />
 311:         <Controller
 312:           control={control}
 313:           name="zero_rated_sales"
 314:           render={({ field }) => (
 315:             <CurrencyInput
 316:               label="Cold drinks — 0% VAT"
 317:               value={field.value}
 318:               onChangeValue={field.onChange}
 319:             />
 320:           )}
 321:         />
 322:         {(zeroRated > 0 || standardRated > 0) && (
 323:           <View className="bg-slate-50 rounded-lg p-3 mt-1 gap-0.5">
 324:             <CalcRow label="Standard-rated ex-VAT" value={formatCurrency(standardRatedNet)} />
 325:             <CalcRow label="VAT collected (20%)" value={formatCurrency(vatCollected)} />
 326:             <CalcRow
 327:               label="Total net sales (ex-VAT)"
 328:               value={formatCurrency(totalNetSales)}
 329:               highlight
 330:             />
 331:           </View>
 332:         )}
 333:       </View>
 334: 
 335:       {/* ── CONCESSIONS COMPANY ── */}
 336:       <SectionHeader title="Concessions Company / Organiser" />
 337:       <View className="bg-white rounded-xl p-4 border border-slate-100 gap-3">
 338:         <Controller
 339:           control={control}
 340:           name="concessions_commission_pct"
 341:           render={({ field }) => (
 342:             <FormField
 343:               label="Commission % (taken on net sales ex-VAT)"
 344:               value={field.value ? String(field.value) : ''}
 345:               onChangeText={(t) => field.onChange(parseFloat(t) || 0)}
 346:               keyboardType="decimal-pad"
 347:               placeholder="0"
 348:             />
 349:           )}
 350:         />
 351:         <Controller
 352:           control={control}
 353:           name="pitch_fee"
 354:           render={({ field }) => (
 355:             <CurrencyInput
 356:               label="Pitch fee paid upfront"
 357:               value={field.value}
 358:               onChangeValue={field.onChange}
 359:             />
 360:           )}
 361:         />
 362:         <Controller
 363:           control={control}
 364:           name="pitch_fee_refund_pct"
 365:           render={({ field }) => (
 366:             <FormField
 367:               label="Pitch fee refund % (before commission deduction)"
 368:               value={field.value ? String(field.value) : ''}
 369:               onChangeText={(t) => field.onChange(parseFloat(t) || 0)}
 370:               keyboardType="decimal-pad"
 371:               placeholder="0"
 372:             />
 373:           )}
 374:         />
 375:         <Controller
 376:           control={control}
 377:           name="power_fee"
 378:           render={({ field }) => (
 379:             <CurrencyInput
 380:               label="Power / site fee"
 381:               value={field.value}
 382:               onChangeValue={field.onChange}
 383:             />
 384:           )}
 385:         />
 386:         {(pitchFee > 0 || commissionPct > 0 || powerFee > 0) && (
 387:           <View className="bg-slate-50 rounded-lg p-3 mt-1 gap-0.5">
 388:             <CalcRow
 389:               label={`Commission (${commissionPct}% × net sales)`}
 390:               value={formatCurrency(commissionAmount)}
 391:             />
 392:             <CalcRow
 393:               label={`Pitch fee refund gross (${refundPct}%)`}
 394:               value={formatCurrency(pitchFeeRefundGross)}
 395:             />
 396:             <CalcRow
 397:               label="Commission deducted from refund"
 398:               value={`-${formatCurrency(commissionAmount)}`}
 399:             />
 400:             <CalcRow
 401:               label="Net refund received"
 402:               value={formatCurrency(Math.max(0, netRefund))}
 403:             />
 404:             {netRefund < 0 && (
 405:               <CalcRow
 406:                 label="Extra commission owed"
 407:                 value={formatCurrency(Math.abs(netRefund))}
 408:               />
 409:             )}
 410:             {powerFee > 0 && (
 411:               <CalcRow
 412:                 label="Power / site fee"
 413:                 value={formatCurrency(powerFee)}
 414:               />
 415:             )}
 416:             <CalcRow
 417:               label="Total site cost"
 418:               value={formatCurrency(Math.max(0, effectivePitchFee))}
 419:               highlight
 420:             />
 421:           </View>
 422:         )}
 423:       </View>
 424: 
 425:       {/* ── YOUR OTHER COSTS ── */}
 426:       <SectionHeader title="Your Other Costs" />
 427:       <View className="bg-white rounded-xl p-4 border border-slate-100 gap-3">
 428:         <Controller
 429:           control={control}
 430:           name="cost_of_goods"
 431:           render={({ field }) => (
 432:             <CurrencyInput
 433:               label="Cost of Goods / COGS (stock, ingredients)"
 434:               value={field.value}
 435:               onChangeValue={field.onChange}
 436:             />
 437:           )}
 438:         />
 439:         <Controller
 440:           control={control}
 441:           name="staffing_costs"
 442:           render={({ field }) => (
 443:             <CurrencyInput
 444:               label="Staffing Total (or use Staffing tab)"
 445:               value={field.value}
 446:               onChangeValue={field.onChange}
 447:             />
 448:           )}
 449:         />
 450:         <Controller
 451:           control={control}
 452:           name="travel_costs"
 453:           render={({ field }) => (
 454:             <CurrencyInput
 455:               label="Travel & Fuel"
 456:               value={field.value}
 457:               onChangeValue={field.onChange}
 458:             />
 459:           )}
 460:         />
 461:         <Controller
 462:           control={control}
 463:           name="camping_costs"
 464:           render={({ field }) => (
 465:             <CurrencyInput
 466:               label="Camping Costs"
 467:               value={field.value}
 468:               onChangeValue={field.onChange}
 469:             />
 470:           )}
 471:         />
 472:         <Controller
 473:           control={control}
 474:           name="equipment_costs"
 475:           render={({ field }) => (
 476:             <CurrencyInput
 477:               label="Equipment & Hire"
 478:               value={field.value}
 479:               onChangeValue={field.onChange}
 480:             />
 481:           )}
 482:         />
 483:         <Controller
 484:           control={control}
 485:           name="other_costs"
 486:           render={({ field }) => (
 487:             <CurrencyInput
 488:               label="Other Costs"
 489:               value={field.value}
 490:               onChangeValue={field.onChange}
 491:               placeholder="packaging, ice, gas..."
 492:             />
 493:           )}
 494:         />
 495:       </View>
 496: 
 497:       {/* ── MILK & CONSUMABLES ── */}
 498:       <SectionHeader title="Milk & Consumables" />
 499:       <View className="bg-white rounded-xl p-4 border border-slate-100 gap-3">
 500:         <Controller
 501:           control={control}
 502:           name="fresh_milk_litres"
 503:           render={({ field }) => (
 504:             <FormField
 505:               label="Fresh Milk (litres)"
 506:               value={field.value ? String(field.value) : ''}
 507:               onChangeText={(t) => field.onChange(parseFloat(t) || 0)}
 508:               keyboardType="decimal-pad"
 509:               placeholder="0"
 510:             />
 511:           )}
 512:         />
 513:         <Controller
 514:           control={control}
 515:           name="alt_milk_litres"
 516:           render={({ field }) => (
 517:             <FormField
 518:               label="Alternative Milk (litres)"
 519:               value={field.value ? String(field.value) : ''}
 520:               onChangeText={(t) => field.onChange(parseFloat(t) || 0)}
 521:               keyboardType="decimal-pad"
 522:               placeholder="0"
 523:             />
 524:           )}
 525:         />
 526:         <View className="bg-blue-50 rounded-xl px-3 py-2.5">
 527:           <Text className="text-blue-700 text-xs">
 528:             💡 Milk usage is tracked on the dashboard for stock planning.
 529:           </Text>
 530:         </View>
 531:       </View>
 532:     </View>
 533:   );
 534: }
 535: 
 536: // ─────────────────────────────────────────────────────────────
 537: // PROPS & MAIN COMPONENT
 538: // ─────────────────────────────────────────────────────────────
 539: interface Props {
 540:   defaultValues?: Partial<EventFormValues>;
 541:   companies: ConcessionsCompany[];
 542:   units: Unit[];
 543:   onSubmit: (data: EventFormValues) => Promise<void>;
 544:   submitLabel?: string;
 545: }
 546: 
 547: export function EventForm({
 548:   defaultValues,
 549:   companies,
 550:   units,
 551:   onSubmit,
 552:   submitLabel = 'Save Application',
 553: }: Props) {
 554:   const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Details');
 555:   const [loading, setLoading] = useState(false);
 556:   const router = useRouter();
 557: 
 558:   const {
 559:     control,
 560:     handleSubmit,
 561:     formState: { errors },
 562:     setValue,
 563:     watch,
 564:   } = useForm<EventFormValues>({
 565:     resolver: zodResolver(eventSchema) as any,
 566:     defaultValues: {
 567:       name: '',
 568:       date: '',
 569:       end_date: '',
 570:       location: '',
 571:       description: '',
 572:       application_date: '',
 573:       status: 'pending',
 574:       notes: '',
 575:       company_id: '',
 576:       unit_ids: [],
 577:       application_url: '',
 578:       overnight_stay: false,
 579:       documents_uploaded: false,
 580:       gross_sales: 0,
 581:       zero_rated_sales: 0,
 582:       standard_rated_sales: 0,
 583:       concessions_commission_pct: 0,
 584:       pitch_fee_refund_pct: 0,
 585:       cost_of_goods: 0,
 586:       pitch_fee: 0,
 587:       power_fee: 0,
 588:       travel_costs: 0,
 589:       camping_costs: 0,
 590:       equipment_costs: 0,
 591:       other_costs: 0,
 592:       staffing_costs: 0,
 593:       fresh_milk_litres: 0,
 594:       alt_milk_litres: 0,
 595:       staffing_entries: [],
 596:       infrastructure_items: [],
 597:       ...defaultValues,
 598:     },
 599:   });
 600: 
 601:   const { fields: staffFields, append: appendStaff, remove: removeStaff } = useFieldArray({
 602:     control,
 603:     name: 'staffing_entries',
 604:   });
 605:   const { fields: infraFields, append: appendInfra, remove: removeInfra } = useFieldArray({
 606:     control,
 607:     name: 'infrastructure_items',
 608:   });
 609: 
 610:   const selectedStatus = watch('status') as ApplicationStatus;
 611:   const selectedCompanyId = watch('company_id');
 612:   const selectedUnitIds = (watch('unit_ids') ?? []) as string[];
 613: 
 614:   async function handleFormSubmit(data: EventFormValues) {
 615:     setLoading(true);
 616:     try {
 617:       const converted = {
 618:         ...data,
 619:         date: ukToIso(data.date),
 620:         end_date: data.end_date ? ukToIso(data.end_date) : data.end_date,
 621:         application_date: data.application_date
 622:           ? ukToIso(data.application_date)
 623:           : data.application_date,
 624:       };
 625:       await onSubmit(converted);
 626:       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
 627:       router.back();
 628:     } catch (e: unknown) {
 629:       const msg =
 630:         e instanceof Error
 631:           ? e.message
 632:           : typeof e === 'object' && e !== null && 'message' in e
 633:           ? String((e as { message: unknown }).message)
 634:           : 'Failed to save. Check your connection and try again.';
 635:       Alert.alert('Error', msg);
 636:     } finally {
 637:       setLoading(false);
 638:     }
 639:   }
 640: 
 641:   return (
 642:     <View className="flex-1 bg-slate-50">
 643:       {/* Tab bar */}
 644:       <View className="bg-white border-b border-slate-100">
 645:         <ScrollView
 646:           horizontal
 647:           showsHorizontalScrollIndicator={false}
 648:           contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 4 }}
 649:         >
 650:           {TABS.map((tab) => (
 651:             <TouchableOpacity
 652:               key={tab}
 653:               onPress={() => setActiveTab(tab)}
 654:               className={`px-4 py-2 rounded-full ${
 655:                 activeTab === tab ? 'bg-slate-900' : 'bg-slate-100'
 656:               }`}
 657:             >
 658:               <Text
 659:                 className={`text-sm font-semibold ${
 660:                   activeTab === tab ? 'text-white' : 'text-slate-800'
 661:                 }`}
 662:               >
 663:                 {tab}
 664:               </Text>
 665:             </TouchableOpacity>
 666:           ))}
 667:         </ScrollView>
 668:       </View>
 669: 
 670:       <ScrollView className="flex-1 px-4 pt-5" keyboardShouldPersistTaps="handled">
 671: 
 672:         {/* ══════════════════════════════════════════
 673:             DETAILS TAB
 674:         ══════════════════════════════════════════ */}
 675:         {activeTab === 'Details' && (
 676:           <View className="gap-4">
 677:             {/* Name */}
 678:             <Controller
 679:               control={control}
 680:               name="name"
 681:               render={({ field }) => (
 682:                 <FormField
 683:                   label="Event / Market Name"
 684:                   required
 685:                   value={field.value}
 686:                   onChangeText={field.onChange}
 687:                   error={errors.name?.message}
 688:                   placeholder="Brighton Food Festival 2025"
 689:                 />
 690:               )}
 691:             />
 692: 
 693:             {/* Dates — side by side */}
 694:             <View className="flex-row gap-3">
 695:               <View className="flex-1">
 696:                 <Controller
 697:                   control={control}
 698:                   name="date"
 699:                   render={({ field }) => (
 700:                     <DatePickerButton
 701:                       label="Start Date"
 702:                       required
 703:                       value={field.value ?? ''}
 704:                       onChange={field.onChange}
 705:                     />
 706:                   )}
 707:                 />
 708:               </View>
 709:               <View className="flex-1">
 710:                 <Controller
 711:                   control={control}
 712:                   name="end_date"
 713:                   render={({ field }) => (
 714:                     <DatePickerButton
 715:                       label="End Date"
 716:                       value={field.value ?? ''}
 717:                       onChange={field.onChange}
 718:                     />
 719:                   )}
 720:                 />
 721:               </View>
 722:             </View>
 723: 
 724:             {/* Location */}
 725:             <Controller
 726:               control={control}
 727:               name="location"
 728:               render={({ field }) => (
 729:                 <FormField
 730:                   label="Location"
 731:                   required
 732:                   value={field.value}
 733:                   onChangeText={field.onChange}
 734:                   error={errors.location?.message}
 735:                   placeholder="Brighton, East Sussex"
 736:                 />
 737:               )}
 738:             />
 739: 
 740:             {/* Applied On */}
 741:             <Controller
 742:               control={control}
 743:               name="application_date"
 744:               render={({ field }) => (
 745:                 <DatePickerButton
 746:                   label="Applied On"
 747:                   value={field.value ?? ''}
 748:                   onChange={field.onChange}
 749:                 />
 750:               )}
 751:             />
 752: 
 753:             {/* Application URL */}
 754:             <Controller
 755:               control={control}
 756:               name="application_url"
 757:               render={({ field }) => (
 758:                 <FormField
 759:                   label="Application Portal URL"
 760:                   value={field.value ?? ''}
 761:                   onChangeText={field.onChange}
 762:                   placeholder="https://organiser.com/apply"
 763:                   keyboardType="url"
 764:                   autoCapitalize="none"
 765:                 />
 766:               )}
 767:             />
 768:             <View className="bg-blue-50 rounded-xl px-3 py-2.5 -mt-2">
 769:               <Text className="text-blue-700 text-xs">
 770:                 💡 Save the URL and the app will alert you if the page changes — useful for spotting
 771:                 when decisions are published.
 772:               </Text>
 773:             </View>
 774: 
 775:             {/* Unit selector — multi-select */}
 776:             {units.length > 0 && (
 777:               <View>
 778:                 <Text className="text-slate-600 text-sm font-semibold mb-2">Units / Vehicles</Text>
 779:                 <Text className="text-slate-400 text-xs mb-2">Select all units attending this event</Text>
 780:                 <View className="flex-row flex-wrap gap-2">
 781:                   {units.map((u) => {
 782:                     const active = selectedUnitIds.includes(u.id);
 783:                     return (
 784:                       <TouchableOpacity
 785:                         key={u.id}
 786:                         onPress={() => {
 787:                           const current = selectedUnitIds;
 788:                           setValue(
 789:                             'unit_ids',
 790:                             active ? current.filter((id) => id !== u.id) : [...current, u.id],
 791:                           );
 792:                         }}
 793:                         style={{
 794:                           flexDirection: 'row', alignItems: 'center',
 795:                           paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
 796:                           borderWidth: 1,
 797:                           backgroundColor: active ? '#1e293b' : '#ffffff',
 798:                           borderColor: active ? '#1e293b' : '#e2e8f0',
 799:                         }}
 800:                       >
 801:                         <Text style={{ fontSize: 14, fontWeight: '500', color: active ? '#ffffff' : '#374151' }}>
 802:                           {u.name}
 803:                         </Text>
 804:                         {u.registration ? (
 805:                           <Text style={{ fontSize: 11, marginLeft: 6, color: active ? '#94a3b8' : '#9ca3af' }}>
 806:                             {u.registration}
 807:                           </Text>
 808:                         ) : null}
 809:                       </TouchableOpacity>
 810:                     );
 811:                   })}
 812:                 </View>
 813:                 {selectedUnitIds.length > 0 && (
 814:                   <TouchableOpacity onPress={() => setValue('unit_ids', [])} className="mt-2">
 815:                     <Text className="text-slate-400 text-xs">Clear selection</Text>
 816:                   </TouchableOpacity>
 817:                 )}
 818:               </View>
 819:             )}
 820: 
 821:             {/* Application Status selector */}
 822:             <View>
 823:               <Text className="text-slate-600 text-sm font-semibold mb-2">
 824:                 Application Status <Text className="text-red-500">*</Text>
 825:               </Text>
 826:               <View className="flex-row flex-wrap gap-2">
 827:                 {STATUSES.map((s) => {
 828:                   const colors = STATUS_COLORS[s];
 829:                   const active = selectedStatus === s;
 830:                   return (
 831:                     <TouchableOpacity
 832:                       key={s}
 833:                       onPress={() => setValue('status', s)}
 834:                       style={{
 835:                         flexDirection: 'row', alignItems: 'center',
 836:                         paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
 837:                         borderWidth: 1,
 838:                         backgroundColor: active ? colors.textHex : '#ffffff',
 839:                         borderColor: active ? colors.textHex : '#e2e8f0',
 840:                       }}
 841:                     >
 842:                       <View
 843:                         style={{ backgroundColor: active ? '#ffffff' : colors.dot, width: 7, height: 7, borderRadius: 4, marginRight: 6 }}
 844:                       />
 845:                       <Text style={{ fontSize: 14, fontWeight: '500', color: active ? '#ffffff' : '#4b5563' }}>
 846:                         {STATUS_LABELS[s]}
 847:                       </Text>
 848:                     </TouchableOpacity>
 849:                   );
 850:                 })}
 851:               </View>
 852:             </View>
 853: 
 854:             {/* Concessions Company selector */}
 855:             <View>
 856:               <Text className="text-slate-600 text-sm font-semibold mb-2">
 857:                 Concessions Company / Organiser
 858:               </Text>
 859:               <View className="flex-row flex-wrap gap-2">
 860:                 <TouchableOpacity
 861:                   onPress={() => setValue('company_id', '')}
 862:                   className={`px-3 py-1.5 rounded-xl border ${
 863:                     !selectedCompanyId
 864:                       ? 'bg-slate-900 border-slate-900'
 865:                       : 'bg-white border-slate-200'
 866:                   }`}
 867:                 >
 868:                   <Text
 869:                     className={`text-sm ${
 870:                       !selectedCompanyId ? 'text-white font-medium' : 'text-slate-500'
 871:                     }`}
 872:                   >
 873:                     None
 874:                   </Text>
 875:                 </TouchableOpacity>
 876:                 {companies.map((c) => (
 877:                   <TouchableOpacity
 878:                     key={c.id}
 879:                     onPress={() => setValue('company_id', c.id)}
 880:                     className={`px-3 py-1.5 rounded-xl border ${
 881:                       selectedCompanyId === c.id
 882:                         ? 'bg-slate-900 border-slate-900'
 883:                         : 'bg-white border-slate-200'
 884:                     }`}
 885:                   >
 886:                     <Text
 887:                       className={`text-sm ${
 888:                         selectedCompanyId === c.id
 889:                           ? 'text-white font-medium'
 890:                           : 'text-slate-600'
 891:                       }`}
 892:                       numberOfLines={1}
 893:                     >
 894:                       {c.name}
 895:                     </Text>
 896:                   </TouchableOpacity>
 897:                 ))}
 898:               </View>
 899:             </View>
 900: 
 901:             {/* Description */}
 902:             <Controller
 903:               control={control}
 904:               name="description"
 905:               render={({ field }) => (
 906:                 <FormField
 907:                   label="Description"
 908:                   value={field.value ?? ''}
 909:                   onChangeText={field.onChange}
 910:                   placeholder="What is the event? Expected footfall, etc."
 911:                   multiline
 912:                   numberOfLines={3}
 913:                   style={{ textAlignVertical: 'top', minHeight: 72 }}
 914:                 />
 915:               )}
 916:             />
 917: 
 918:             {/* Toggle rows */}
 919:             <View className="bg-white rounded-xl border border-slate-100 overflow-hidden">
 920:               {/* Overnight Stay */}
 921:               <Controller
 922:                 control={control}
 923:                 name="overnight_stay"
 924:                 render={({ field }) => (
 925:                   <View className="flex-row items-center justify-between px-4 py-3.5">
 926:                     <View className="flex-1 mr-3">
 927:                       <Text className="text-sm font-medium text-slate-700">
 928:                         Overnight Stay Required
 929:                       </Text>
 930:                     </View>
 931:                     <Switch
 932:                       value={field.value ?? false}
 933:                       onValueChange={field.onChange}
 934:                       trackColor={{ false: '#e2e8f0', true: '#1e293b' }}
 935:                       thumbColor="#ffffff"
 936:                     />
 937:                   </View>
 938:                 )}
 939:               />
 940:               <View className="border-t border-slate-100" />
 941:               {/* Documents Uploaded */}
 942:               <Controller
 943:                 control={control}
 944:                 name="documents_uploaded"
 945:                 render={({ field }) => (
 946:                   <View className="flex-row items-center justify-between px-4 py-3.5">
 947:                     <View className="flex-1 mr-3">
 948:                       <Text className="text-sm font-medium text-slate-700">
 949:                         Paperwork / Docs Uploaded
 950:                       </Text>
 951:                     </View>
 952:                     <Switch
 953:                       value={field.value ?? false}
 954:                       onValueChange={field.onChange}
 955:                       trackColor={{ false: '#e2e8f0', true: '#1e293b' }}
 956:                       thumbColor="#ffffff"
 957:                     />
 958:                   </View>
 959:                 )}
 960:               />
 961:             </View>
 962:           </View>
 963:         )}
 964: 
 965:         {/* ══════════════════════════════════════════
 966:             FINANCIALS TAB
 967:         ══════════════════════════════════════════ */}
 968:         {activeTab === 'Financials' && (
 969:           <FinancialsTabContent control={control} watch={watch} />
 970:         )}
 971: 
 972:         {/* ══════════════════════════════════════════
 973:             STAFFING TAB
 974:         ══════════════════════════════════════════ */}
 975:         {activeTab === 'Staffing' && (
 976:           <View className="gap-4">
 977:             <View className="bg-blue-50 rounded-xl p-3 border border-blue-100">
 978:               <Text className="text-blue-800 text-xs">
 979:                 Add individual staff members. Their total cost will override the staffing figure in
 980:                 Financials.
 981:               </Text>
 982:             </View>
 983:             {staffFields.map((field, i) => (
 984:               <View key={field.id} className="bg-white rounded-xl p-4 border border-slate-100 gap-3">
 985:                 <View className="flex-row justify-between items-center">
 986:                   <Text className="font-semibold text-slate-700 text-sm">
 987:                     Staff Member {i + 1}
 988:                   </Text>
 989:                   <TouchableOpacity onPress={() => removeStaff(i)}>
 990:                     <Text className="text-red-400 text-sm font-medium">Remove</Text>
 991:                   </TouchableOpacity>
 992:                 </View>
 993:                 <Controller
 994:                   control={control}
 995:                   name={`staffing_entries.${i}.staff_name`}
 996:                   render={({ field: f }) => (
 997:                     <FormField
 998:                       label="Name"
 999:                       value={f.value}
1000:                       onChangeText={f.onChange}
1001:                       placeholder="Jane Smith"
1002:                       error={errors.staffing_entries?.[i]?.staff_name?.message}
1003:                     />
1004:                   )}
1005:                 />
1006:                 <View className="flex-row gap-3">
1007:                   <View className="flex-1">
1008:                     <Controller
1009:                       control={control}
1010:                       name={`staffing_entries.${i}.hours_worked`}
1011:                       render={({ field: f }) => (
1012:                         <FormField
1013:                           label="Hours"
1014:                           value={String(f.value || '')}
1015:                           onChangeText={(t) => f.onChange(parseFloat(t) || 0)}
1016:                           keyboardType="decimal-pad"
1017:                           placeholder="8"
1018:                         />
1019:                       )}
1020:                     />
1021:                   </View>
1022:                   <View className="flex-1">
1023:                     <Controller
1024:                       control={control}
1025:                       name={`staffing_entries.${i}.hourly_rate`}
1026:                       render={({ field: f }) => (
1027:                         <CurrencyInput
1028:                           label="Hourly Rate"
1029:                           value={f.value}
1030:                           onChangeValue={f.onChange}
1031:                         />
1032:                       )}
1033:                     />
1034:                   </View>
1035:                 </View>
1036:               </View>
1037:             ))}
1038:             <TouchableOpacity
1039:               onPress={() => appendStaff({ staff_name: '', hours_worked: 0, hourly_rate: 0 })}
1040:               className="border-2 border-dashed border-slate-300 rounded-xl py-4 items-center"
1041:             >
1042:               <Text className="text-slate-500 font-medium">+ Add Staff Member</Text>
1043:             </TouchableOpacity>
1044:           </View>
1045:         )}
1046: 
1047:         {/* ══════════════════════════════════════════
1048:             COSTS TAB
1049:         ══════════════════════════════════════════ */}
1050:         {activeTab === 'Costs' && (
1051:           <View className="gap-4">
1052:             {infraFields.map((field, i) => (
1053:               <View key={field.id} className="bg-white rounded-xl p-4 border border-slate-100 gap-3">
1054:                 <View className="flex-row justify-between items-center">
1055:                   <Text className="font-semibold text-slate-700 text-sm">Cost Item {i + 1}</Text>
1056:                   <TouchableOpacity onPress={() => removeInfra(i)}>
1057:                     <Text className="text-red-400 text-sm font-medium">Remove</Text>
1058:                   </TouchableOpacity>
1059:                 </View>
1060:                 <Controller
1061:                   control={control}
1062:                   name={`infrastructure_items.${i}.description`}
1063:                   render={({ field: f }) => (
1064:                     <FormField
1065:                       label="Description"
1066:                       value={f.value}
1067:                       onChangeText={f.onChange}
1068:                       placeholder="Generator hire"
1069:                       error={errors.infrastructure_items?.[i]?.description?.message}
1070:                     />
1071:                   )}
1072:                 />
1073:                 <View>
1074:                   <Text className="text-slate-600 text-sm font-medium mb-2">Category</Text>
1075:                   <View className="flex-row flex-wrap gap-2">
1076:                     {INFRASTRUCTURE_CATEGORIES.map((cat) => {
1077:                       const current = watch(
1078:                         `infrastructure_items.${i}.category`,
1079:                       ) as InfrastructureCategory;
1080:                       return (
1081:                         <TouchableOpacity
1082:                           key={cat}
1083:                           onPress={() =>
1084:                             setValue(`infrastructure_items.${i}.category`, cat)
1085:                           }
1086:                           className={`px-3 py-1 rounded-full border ${
1087:                             current === cat
1088:                               ? 'bg-slate-900 border-slate-900'
1089:                               : 'bg-white border-slate-200'
1090:                           }`}
1091:                         >
1092:                           <Text
1093:                             className={`text-xs font-medium ${
1094:                               current === cat ? 'text-white' : 'text-slate-600'
1095:                             }`}
1096:                           >
1097:                             {INFRASTRUCTURE_CATEGORY_LABELS[cat]}
1098:                           </Text>
1099:                         </TouchableOpacity>
1100:                       );
1101:                     })}
1102:                   </View>
1103:                 </View>
1104:                 <Controller
1105:                   control={control}
1106:                   name={`infrastructure_items.${i}.cost`}
1107:                   render={({ field: f }) => (
1108:                     <CurrencyInput label="Cost" value={f.value} onChangeValue={f.onChange} />
1109:                   )}
1110:                 />
1111:               </View>
1112:             ))}
1113:             <TouchableOpacity
1114:               onPress={() => appendInfra({ description: '', category: 'other', cost: 0 })}
1115:               className="border-2 border-dashed border-slate-300 rounded-xl py-4 items-center"
1116:             >
1117:               <Text className="text-slate-500 font-medium">+ Add Cost Item</Text>
1118:             </TouchableOpacity>
1119:           </View>
1120:         )}
1121: 
1122:         {/* ══════════════════════════════════════════
1123:             NOTES TAB
1124:         ══════════════════════════════════════════ */}
1125:         {activeTab === 'Notes' && (
1126:           <Controller
1127:             control={control}
1128:             name="notes"
1129:             render={({ field }) => (
1130:               <FormField
1131:                 label="Notes & Observations"
1132:                 value={field.value ?? ''}
1133:                 onChangeText={field.onChange}
1134:                 placeholder="Footfall, parking, setup notes, what sold well..."
1135:                 multiline
1136:                 numberOfLines={12}
1137:                 style={{ textAlignVertical: 'top', minHeight: 240 }}
1138:               />
1139:             )}
1140:           />
1141:         )}
1142: 
1143:         <View style={{ height: 100 }} />
1144:       </ScrollView>
1145: 
1146:       {/* Submit button */}
1147:       <View className="px-4 pb-8 pt-3 bg-white border-t border-slate-100">
1148:         <TouchableOpacity
1149:           onPress={handleSubmit(handleFormSubmit)}
1150:           className="bg-amber-500 py-4 rounded-2xl items-center"
1151:           disabled={loading}
1152:         >
1153:           {loading ? (
1154:             <ActivityIndicator color="#fff" />
1155:           ) : (
1156:             <Text className="text-white font-bold text-base">{submitLabel}</Text>
1157:           )}
1158:         </TouchableOpacity>
1159:       </View>
1160:     </View>
1161:   );
1162: }
````

## File: components/events/FinancialsCard.tsx
````typescript
  1: import React from 'react';
  2: import { View, Text } from 'react-native';
  3: import { formatCurrency, formatPercent } from '@/lib/formatters';
  4: import type { EventFinancials, EventCalculations } from '@/types';
  5: 
  6: interface Props {
  7:   financials: EventFinancials;
  8:   calculations: EventCalculations;
  9: }
 10: 
 11: function Row({
 12:   label,
 13:   value,
 14:   bold,
 15:   color,
 16:   indent,
 17: }: {
 18:   label: string;
 19:   value: string;
 20:   bold?: boolean;
 21:   color?: string;
 22:   indent?: boolean;
 23: }) {
 24:   return (
 25:     <View className="flex-row justify-between items-center py-1.5">
 26:       <Text
 27:         className={`text-sm ${
 28:           indent
 29:             ? 'pl-3 text-stone-500'
 30:             : bold
 31:             ? 'font-semibold text-stone-900'
 32:             : 'text-stone-600'
 33:         }`}
 34:       >
 35:         {label}
 36:       </Text>
 37:       <Text
 38:         className={`text-sm ${bold ? 'font-bold' : 'font-medium'} ${
 39:           color ?? (bold ? 'text-stone-900' : 'text-stone-600')
 40:         }`}
 41:       >
 42:         {value}
 43:       </Text>
 44:     </View>
 45:   );
 46: }
 47: 
 48: function Divider() {
 49:   return <View className="border-t border-stone-100 my-1.5" />;
 50: }
 51: 
 52: function SectionLabel({ title }: { title: string }) {
 53:   return (
 54:     <Text className="text-xs font-bold text-stone-400 uppercase tracking-wide mt-3 mb-0.5">
 55:       {title}
 56:     </Text>
 57:   );
 58: }
 59: 
 60: export function FinancialsCard({ financials: f, calculations: c }: Props) {
 61:   const hasVatBreakdown =
 62:     (f.zero_rated_sales ?? 0) > 0 || (f.standard_rated_sales ?? 0) > 0;
 63:   const hasCommission =
 64:     (f.concessions_commission_pct ?? 0) > 0 || (f.pitch_fee_refund_pct ?? 0) > 0;
 65:   const hasPowerFee = (f.power_fee ?? 0) > 0;
 66:   const hasSiteCostSection = hasCommission || hasPowerFee;
 67:   const hasMilk =
 68:     (f.fresh_milk_litres ?? 0) > 0 || (f.alt_milk_litres ?? 0) > 0;
 69: 
 70:   return (
 71:     <View className="bg-white rounded-2xl p-4 border border-stone-100">
 72:       <Text className="font-bold text-stone-900 mb-2 text-base">Financials</Text>
 73: 
 74:       {/* ── SALES ── */}
 75:       <SectionLabel title="Sales" />
 76:       {hasVatBreakdown ? (
 77:         <>
 78:           <Row
 79:             label="Hot drinks & food (20% VAT, incl. VAT)"
 80:             value={formatCurrency(f.standard_rated_sales ?? 0)}
 81:           />
 82:           <Row label="  Ex-VAT net" value={formatCurrency(c.standardRatedNet)} indent />
 83:           <Row label="  VAT collected" value={formatCurrency(c.vatCollected)} indent />
 84:           <Row
 85:             label="Cold drinks (0% VAT)"
 86:             value={formatCurrency(f.zero_rated_sales ?? 0)}
 87:           />
 88:           <Divider />
 89:           <Row label="Total Net Sales (ex-VAT)" value={formatCurrency(c.totalNetSales)} bold />
 90:         </>
 91:       ) : (
 92:         <Row label="Gross Sales" value={formatCurrency(f.gross_sales)} bold />
 93:       )}
 94: 
 95:       {/* ── PITCH FEE & COMMISSION ── */}
 96:       {hasSiteCostSection && (
 97:         <>
 98:           <SectionLabel title="Pitch Fee & Commission" />
 99:           {(f.pitch_fee ?? 0) > 0 && (
100:             <Row label="Pitch fee paid" value={formatCurrency(f.pitch_fee)} />
101:           )}
102:           {hasCommission && (
103:             <>
104:               <Row
105:                 label={`Pitch fee refund (${f.pitch_fee_refund_pct ?? 0}%)`}
106:                 value={formatCurrency(c.pitchFeeRefundGross)}
107:                 indent
108:               />
109:               <Row
110:                 label={`Commission (${f.concessions_commission_pct ?? 0}% of net sales)`}
111:                 value={`-${formatCurrency(c.commissionAmount)}`}
112:                 indent
113:               />
114:               <Row
115:                 label="Net refund received"
116:                 value={formatCurrency(Math.max(0, c.netRefund))}
117:                 indent
118:                 color={c.netRefund >= 0 ? 'text-green-600' : 'text-red-500'}
119:               />
120:             </>
121:           )}
122:           {hasPowerFee && (
123:             <Row label="Power / site fee" value={formatCurrency(f.power_fee ?? 0)} />
124:           )}
125:           <Row
126:             label="Total site cost"
127:             value={formatCurrency(c.effectivePitchFee + (f.power_fee ?? 0))}
128:             bold
129:           />
130:         </>
131:       )}
132: 
133:       {/* ── YOUR COSTS ── */}
134:       <SectionLabel title="Your Costs" />
135:       <Row label="Cost of Goods" value={formatCurrency(f.cost_of_goods)} />
136:       {!hasSiteCostSection && (f.pitch_fee ?? 0) > 0 && (
137:         <Row label="Pitch Fee" value={formatCurrency(f.pitch_fee)} />
138:       )}
139:       <Row label="Staffing" value={formatCurrency(f.staffing_costs)} />
140:       <Row label="Travel" value={formatCurrency(f.travel_costs)} />
141:       {(f.camping_costs ?? 0) > 0 && (
142:         <Row label="Camping" value={formatCurrency(f.camping_costs ?? 0)} />
143:       )}
144:       <Row label="Equipment" value={formatCurrency(f.equipment_costs)} />
145:       {(f.other_costs ?? 0) > 0 && (
146:         <Row label="Other" value={formatCurrency(f.other_costs ?? 0)} />
147:       )}
148: 
149:       {/* ── MILK USED ── */}
150:       {hasMilk && (
151:         <>
152:           <SectionLabel title="Milk Used" />
153:           {(f.fresh_milk_litres ?? 0) > 0 && (
154:             <Row
155:               label="Fresh Milk"
156:               value={`${(f.fresh_milk_litres ?? 0).toFixed(1)} L`}
157:             />
158:           )}
159:           {(f.alt_milk_litres ?? 0) > 0 && (
160:             <Row
161:               label="Alt Milk"
162:               value={`${(f.alt_milk_litres ?? 0).toFixed(1)} L`}
163:             />
164:           )}
165:         </>
166:       )}
167: 
168:       <Divider />
169:       <Row label="Total Costs" value={formatCurrency(c.totalCosts)} bold />
170:       <Divider />
171: 
172:       <Row
173:         label="Net Profit"
174:         value={formatCurrency(c.netProfit)}
175:         bold
176:         color={c.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}
177:       />
178:       <Row
179:         label="Profit Margin"
180:         value={formatPercent(c.profitMargin)}
181:         bold
182:         color={c.profitMargin >= 0 ? 'text-green-600' : 'text-red-500'}
183:       />
184:     </View>
185:   );
186: }
````

## File: components/events/InfrastructureList.tsx
````typescript
 1: import React from 'react';
 2: import { View, Text } from 'react-native';
 3: import { formatCurrency } from '@/lib/formatters';
 4: import { INFRASTRUCTURE_CATEGORY_LABELS } from '@/constants';
 5: import type { InfrastructureItem } from '@/types';
 6: 
 7: interface Props {
 8:   items: InfrastructureItem[];
 9: }
10: 
11: export function InfrastructureList({ items }: Props) {
12:   if (items.length === 0) return null;
13: 
14:   return (
15:     <View className="bg-white rounded-2xl p-4 border border-stone-100">
16:       <Text className="font-bold text-stone-900 mb-3">Infrastructure Items</Text>
17:       {items.map((item) => (
18:         <View key={item.id} className="flex-row justify-between items-center py-2 border-b border-stone-50">
19:           <View className="flex-1 mr-3">
20:             <Text className="font-medium text-stone-900 text-sm">{item.description}</Text>
21:             <Text className="text-stone-400 text-xs mt-0.5">
22:               {INFRASTRUCTURE_CATEGORY_LABELS[item.category]}
23:             </Text>
24:           </View>
25:           <Text className="font-semibold text-stone-700 text-sm">{formatCurrency(item.cost)}</Text>
26:         </View>
27:       ))}
28:       <View className="flex-row justify-between mt-2 pt-2 border-t border-stone-200">
29:         <Text className="font-semibold text-stone-700 text-sm">Total</Text>
30:         <Text className="font-bold text-stone-900 text-sm">
31:           {formatCurrency(items.reduce((s, i) => s + i.cost, 0))}
32:         </Text>
33:       </View>
34:     </View>
35:   );
36: }
````

## File: components/events/OverlapModal.tsx
````typescript
  1: import React, { useMemo } from 'react';
  2: import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
  3: import { useRouter } from 'expo-router';
  4: import { STATUS_COLORS, STATUS_LABELS } from '@/constants';
  5: import { formatCurrency, formatPercent } from '@/lib/formatters';
  6: import { scoreEvent } from '@/lib/scoring';
  7: import type { EventWithFinancials } from '@/types';
  8: 
  9: interface Props {
 10:   events: EventWithFinancials[];
 11:   allEvents: EventWithFinancials[];
 12:   date: string;
 13:   onClose: () => void;
 14:   router: ReturnType<typeof useRouter>;
 15: }
 16: 
 17: export function OverlapModal({ events, allEvents, date, onClose, router }: Props) {
 18:   const isOverlap = events.length >= 2;
 19:   const scores = useMemo(
 20:     () => events.map((e) => ({ event: e, result: scoreEvent(e, allEvents) })),
 21:     [events, allEvents],
 22:   );
 23:   const winner = isOverlap
 24:     ? scores.reduce((best, s) => (s.result.score > best.result.score ? s : best))
 25:     : null;
 26: 
 27:   return (
 28:     <Modal visible animationType="slide" transparent onRequestClose={onClose}>
 29:       <View className="flex-1 justify-end bg-black/40">
 30:         <View className="bg-white rounded-t-3xl px-4 pt-5 pb-8 max-h-4/5">
 31:           <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-4" />
 32: 
 33:           <View className="flex-row items-center justify-between mb-4">
 34:             <View>
 35:               <Text className="font-bold text-slate-900 text-lg">
 36:                 {isOverlap ? '⚠️ Events Overlap' : '📅 Events on this day'}
 37:               </Text>
 38:               <Text className="text-slate-400 text-xs">{date}</Text>
 39:             </View>
 40:             <TouchableOpacity
 41:               onPress={onClose}
 42:               accessibilityRole="button"
 43:               accessibilityLabel="Close"
 44:               className="bg-slate-100 px-3 py-1.5 rounded-xl"
 45:             >
 46:               <Text className="text-slate-600 text-sm font-medium">Close</Text>
 47:             </TouchableOpacity>
 48:           </View>
 49: 
 50:           {isOverlap && winner && (
 51:             <View className="bg-green-50 border border-green-200 rounded-2xl p-3 mb-4">
 52:               <Text className="text-green-800 font-semibold text-sm">
 53:                 Recommendation: <Text className="font-bold">{winner.event.name}</Text>
 54:               </Text>
 55:               <Text className="text-green-700 text-xs mt-0.5">
 56:                 Score {winner.result.score}/100 — {winner.result.label}
 57:               </Text>
 58:             </View>
 59:           )}
 60: 
 61:           <ScrollView showsVerticalScrollIndicator={false}>
 62:             {scores.map(({ event, result }) => {
 63:               const colors = STATUS_COLORS[event.status];
 64:               const isWinner = winner?.event.id === event.id;
 65:               return (
 66:                 <View
 67:                   key={event.id}
 68:                   className={`mb-3 rounded-2xl border overflow-hidden ${isWinner && isOverlap ? 'border-green-300' : 'border-slate-100'}`}
 69:                 >
 70:                   <View style={{ height: 3, backgroundColor: colors.dot }} />
 71:                   <View className="p-3">
 72:                     <View className="flex-row items-start justify-between mb-1">
 73:                       <Text className="font-bold text-slate-900 flex-1 mr-2" numberOfLines={2}>
 74:                         {event.name}
 75:                       </Text>
 76:                       {isOverlap && (
 77:                         <View className="items-end">
 78:                           <Text className={`text-xl font-black ${result.color}`}>{result.score}</Text>
 79:                           <Text className="text-slate-400 text-xs">/ 100</Text>
 80:                         </View>
 81:                       )}
 82:                     </View>
 83: 
 84:                     <View className="flex-row items-center gap-2 mb-2">
 85:                       <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.bgHex }}>
 86:                         <Text style={{ fontSize: 11, fontWeight: '500', color: colors.textHex }}>{STATUS_LABELS[event.status]}</Text>
 87:                       </View>
 88:                       {isOverlap && (
 89:                         <View className="px-2 py-0.5 rounded-full bg-slate-100">
 90:                           <Text className={`text-xs font-semibold ${result.color}`}>{result.label}</Text>
 91:                         </View>
 92:                       )}
 93:                     </View>
 94: 
 95:                     <Text className="text-slate-500 text-xs mb-2">
 96:                       📍 {event.location}
 97:                       {event.end_date && event.end_date !== event.date ? `  ·  ${event.date} → ${event.end_date}` : `  ·  ${event.date}`}
 98:                     </Text>
 99: 
100:                     {event.calculations.netProfit !== 0 && (
101:                       <Text className="text-slate-500 text-xs mb-2">
102:                         Net: <Text className={`font-semibold ${event.calculations.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
103:                           {formatCurrency(event.calculations.netProfit)}
104:                         </Text>
105:                         {event.calculations.profitMargin !== 0 && (
106:                           <Text className="text-slate-400"> ({formatPercent(event.calculations.profitMargin)} margin)</Text>
107:                         )}
108:                       </Text>
109:                     )}
110: 
111:                     {isOverlap && result.reasons.length > 0 && (
112:                       <View className="bg-slate-50 rounded-xl p-2 mb-2">
113:                         {result.reasons.map((r, i) => (
114:                           <Text key={i} className="text-slate-600 text-xs leading-relaxed">· {r}</Text>
115:                         ))}
116:                       </View>
117:                     )}
118: 
119:                     <TouchableOpacity
120:                       onPress={() => { onClose(); router.push(`/(tabs)/events/${event.id}`); }}
121:                       accessibilityRole="button"
122:                       accessibilityLabel={`Open ${event.name}`}
123:                       className="bg-slate-900 py-2 rounded-xl items-center"
124:                     >
125:                       <Text className="text-white text-xs font-semibold">Open Event →</Text>
126:                     </TouchableOpacity>
127:                   </View>
128:                 </View>
129:               );
130:             })}
131:           </ScrollView>
132:         </View>
133:       </View>
134:     </Modal>
135:   );
136: }
````

## File: components/events/StaffingList.tsx
````typescript
 1: import React from 'react';
 2: import { View, Text } from 'react-native';
 3: import { formatCurrency } from '@/lib/formatters';
 4: import type { StaffingEntry } from '@/types';
 5: 
 6: interface Props {
 7:   entries: StaffingEntry[];
 8: }
 9: 
10: export function StaffingList({ entries }: Props) {
11:   if (entries.length === 0) return null;
12: 
13:   return (
14:     <View className="bg-white rounded-2xl p-4 border border-stone-100">
15:       <Text className="font-bold text-stone-900 mb-3">Staffing</Text>
16:       {entries.map((entry) => (
17:         <View key={entry.id} className="flex-row justify-between items-center py-2 border-b border-stone-50 last:border-0">
18:           <View>
19:             <Text className="font-medium text-stone-900 text-sm">{entry.staff_name}</Text>
20:             <Text className="text-stone-400 text-xs mt-0.5">
21:               {entry.hours_worked}h @ {formatCurrency(entry.hourly_rate)}/hr
22:             </Text>
23:           </View>
24:           <Text className="font-semibold text-stone-700 text-sm">
25:             {formatCurrency(entry.hours_worked * entry.hourly_rate)}
26:           </Text>
27:         </View>
28:       ))}
29:       <View className="flex-row justify-between mt-2 pt-2 border-t border-stone-200">
30:         <Text className="font-semibold text-stone-700 text-sm">Total</Text>
31:         <Text className="font-bold text-stone-900 text-sm">
32:           {formatCurrency(entries.reduce((s, e) => s + e.hours_worked * e.hourly_rate, 0))}
33:         </Text>
34:       </View>
35:     </View>
36:   );
37: }
````

## File: components/events/WeatherCard.tsx
````typescript
  1: import React, { useEffect, useState } from 'react';
  2: import { View, Text, ActivityIndicator } from 'react-native';
  3: import { differenceInDays, parseISO, eachDayOfInterval } from 'date-fns';
  4: 
  5: interface OMDay {
  6:   date: string;
  7:   maxTemp: number;
  8:   minTemp: number;
  9:   weatherCode: number;
 10:   precipitation: number;
 11: }
 12: 
 13: interface STDay {
 14:   date: string;
 15:   tempC: number;
 16:   weather: string;
 17: }
 18: 
 19: interface DualDay {
 20:   date: string;
 21:   om: OMDay | null;
 22:   st: STDay | null;
 23: }
 24: 
 25: function omEmoji(code: number): string {
 26:   if (code === 0) return '☀️';
 27:   if (code <= 2) return '⛅';
 28:   if (code <= 49) return '🌫️';
 29:   if (code <= 67) return '🌧️';
 30:   if (code <= 77) return '❄️';
 31:   if (code <= 82) return '🌦️';
 32:   return '⛈️';
 33: }
 34: 
 35: function stEmoji(w: string): string {
 36:   if (w.includes('clear')) return '☀️';
 37:   if (w.includes('pcloudy')) return '⛅';
 38:   if (w.includes('mcloudy') || w.includes('cloudy')) return '☁️';
 39:   if (w.includes('humid')) return '🌫️';
 40:   if (w.includes('lightrain') || w.includes('oshower') || w.includes('ishower')) return '🌦️';
 41:   if (w.includes('rain')) return '🌧️';
 42:   if (w.includes('snow')) return '❄️';
 43:   if (w.includes('ts')) return '⛈️';
 44:   return '🌤️';
 45: }
 46: 
 47: function forecastsAgree(om: OMDay, st: STDay): boolean {
 48:   const omWet = om.weatherCode >= 50;
 49:   const stWet = st.weather.includes('rain') || st.weather.includes('snow') || st.weather.includes('ts');
 50:   if (omWet !== stWet) return false;
 51:   const omAvg = (om.maxTemp + om.minTemp) / 2;
 52:   return Math.abs(omAvg - st.tempC) <= 5;
 53: }
 54: 
 55: function hotIcedSplit(avgTemp: number): { hot: number; iced: number } {
 56:   if (avgTemp < 12) return { hot: 80, iced: 20 };
 57:   if (avgTemp < 18) return { hot: 60, iced: 40 };
 58:   if (avgTemp < 23) return { hot: 40, iced: 60 };
 59:   return { hot: 20, iced: 80 };
 60: }
 61: 
 62: async function fetchSevenTimer(lat: number, lon: number): Promise<STDay[]> {
 63:   const res = await global.fetch(
 64:     `https://www.7timer.info/bin/api.pl?lon=${lon}&lat=${lat}&product=civil&output=json`,
 65:   );
 66:   const data = await res.json();
 67:   const initStr: string = data.init; // "2025061606"
 68:   const initDate = new Date(
 69:     `${initStr.slice(0, 4)}-${initStr.slice(4, 6)}-${initStr.slice(6, 8)}T${initStr.slice(8, 10)}:00:00Z`,
 70:   );
 71:   const byDate = new Map<string, { temps: number[]; weathers: string[] }>();
 72:   for (const ds of data.dataseries ?? []) {
 73:     const d = new Date(initDate.getTime() + ds.timepoint * 3_600_000);
 74:     const key = d.toISOString().split('T')[0];
 75:     if (!byDate.has(key)) byDate.set(key, { temps: [], weathers: [] });
 76:     const entry = byDate.get(key)!;
 77:     entry.temps.push(ds.temp2m);
 78:     entry.weathers.push(ds.weather);
 79:   }
 80:   const days: STDay[] = [];
 81:   byDate.forEach((val, date) => {
 82:     const avg = val.temps.reduce((a, b) => a + b, 0) / val.temps.length;
 83:     const counts: Record<string, number> = {};
 84:     val.weathers.forEach((w) => { counts[w] = (counts[w] ?? 0) + 1; });
 85:     const weather = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'clear';
 86:     days.push({ date, tempC: Math.round(avg), weather });
 87:   });
 88:   return days.sort((a, b) => a.date.localeCompare(b.date));
 89: }
 90: 
 91: export function WeatherCard({
 92:   location,
 93:   startDate,
 94:   endDate,
 95: }: {
 96:   location: string;
 97:   startDate: string;
 98:   endDate?: string | null;
 99: }) {
100:   const [days, setDays] = useState<DualDay[] | null>(null);
101:   const [avgTemp, setAvgTemp] = useState(15);
102:   const [loading, setLoading] = useState(true);
103:   const [outOfRange, setOutOfRange] = useState(false);
104: 
105:   useEffect(() => {
106:     async function load() {
107:       try {
108:         const daysUntil = differenceInDays(parseISO(startDate), new Date());
109:         if (daysUntil > 14) { setOutOfRange(true); setLoading(false); return; }
110:         if (daysUntil < -14) { setLoading(false); return; }
111: 
112:         // Geocode
113:         const geoRes = await global.fetch(
114:           `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`,
115:         );
116:         const geoData = await geoRes.json();
117:         if (!geoData.results?.length) { setLoading(false); return; }
118:         const { latitude, longitude } = geoData.results[0];
119: 
120:         const end = endDate ?? startDate;
121: 
122:         // Parallel fetch
123:         const [omRes, stDaysRaw] = await Promise.allSettled([
124:           global.fetch(
125:             `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&start_date=${startDate}&end_date=${end}&timezone=auto`,
126:           ).then((r) => r.json()),
127:           fetchSevenTimer(latitude, longitude),
128:         ]);
129: 
130:         const omDays: OMDay[] = omRes.status === 'fulfilled'
131:           ? (omRes.value.daily?.time ?? []).map((d: string, i: number) => ({
132:               date: d,
133:               maxTemp: omRes.value.daily.temperature_2m_max[i],
134:               minTemp: omRes.value.daily.temperature_2m_min[i],
135:               weatherCode: omRes.value.daily.weathercode[i],
136:               precipitation: omRes.value.daily.precipitation_sum?.[i] ?? 0,
137:             }))
138:           : [];
139: 
140:         const stDays: STDay[] = stDaysRaw.status === 'fulfilled' ? stDaysRaw.value : [];
141: 
142:         // Build event date range
143:         const eventDates = eachDayOfInterval({
144:           start: parseISO(startDate),
145:           end: parseISO(end),
146:         }).map((d) => d.toISOString().split('T')[0]);
147: 
148:         const omMap = new Map(omDays.map((d) => [d.date, d]));
149:         const stMap = new Map(stDays.map((d) => [d.date, d]));
150: 
151:         const dual: DualDay[] = eventDates.map((date) => ({
152:           date,
153:           om: omMap.get(date) ?? null,
154:           st: stMap.get(date) ?? null,
155:         }));
156: 
157:         const temps = omDays.map((d) => (d.maxTemp + d.minTemp) / 2);
158:         const avg = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 15;
159: 
160:         setDays(dual);
161:         setAvgTemp(avg);
162:       } catch { /* silently fail */ }
163:       finally { setLoading(false); }
164:     }
165:     load();
166:   }, [location, startDate, endDate]);
167: 
168:   if (loading) return (
169:     <View className="bg-white rounded-2xl p-4 border border-stone-100 items-center">
170:       <ActivityIndicator size="small" color="#b45309" />
171:       <Text className="text-stone-400 text-xs mt-2">Fetching forecast…</Text>
172:     </View>
173:   );
174: 
175:   if (outOfRange) return (
176:     <View className="bg-white rounded-2xl p-4 border border-stone-100">
177:       <Text className="font-bold text-stone-900 text-sm mb-1">🌤️ Weather Forecast</Text>
178:       <Text className="text-stone-400 text-xs">Forecast available within 14 days of event.</Text>
179:     </View>
180:   );
181: 
182:   if (!days || days.length === 0) return null;
183: 
184:   const { hot, iced } = hotIcedSplit(avgTemp);
185:   const hasOM = days.some((d) => d.om !== null);
186:   const hasST = days.some((d) => d.st !== null);
187: 
188:   return (
189:     <View className="bg-white rounded-2xl p-4 border border-stone-100">
190:       <Text className="font-bold text-stone-900 text-base mb-1">🌤️ Weather Forecast</Text>
191:       {hasOM && hasST && (
192:         <Text className="text-stone-400 text-xs mb-3">Two independent sources — ✅ agree · ⚠️ differ</Text>
193:       )}
194: 
195:       {/* Per-day dual grid */}
196:       <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
197:         {days.map((d) => {
198:           const agree = d.om && d.st ? forecastsAgree(d.om, d.st) : null;
199:           const dayLabel = d.date.slice(5).replace('-', '/');
200:           return (
201:             <View
202:               key={d.date}
203:               style={{
204:                 flex: 1, alignItems: 'center', borderRadius: 12, overflow: 'hidden',
205:                 borderWidth: 1, borderColor: agree === false ? '#fde68a' : '#f5f5f4',
206:               }}
207:             >
208:               <Text style={{ fontSize: 10, color: '#78716c', paddingTop: 5, fontWeight: '500' }}>{dayLabel}</Text>
209: 
210:               {/* Open-Meteo row */}
211:               {d.om ? (
212:                 <View style={{ alignItems: 'center', paddingVertical: 5, paddingHorizontal: 4, width: '100%', backgroundColor: '#fafaf9' }}>
213:                   <Text style={{ fontSize: 16 }}>{omEmoji(d.om.weatherCode)}</Text>
214:                   <Text style={{ fontSize: 11, fontWeight: '700', color: '#1c1917' }}>{d.om.maxTemp.toFixed(0)}°</Text>
215:                   <Text style={{ fontSize: 10, color: '#a8a29e' }}>{d.om.minTemp.toFixed(0)}°</Text>
216:                   {d.om.precipitation > 0 && (
217:                     <Text style={{ fontSize: 9, color: '#3b82f6', marginTop: 1 }}>
218:                       💧{d.om.precipitation.toFixed(1)}
219:                     </Text>
220:                   )}
221:                 </View>
222:               ) : (
223:                 <View style={{ paddingVertical: 5, alignItems: 'center', backgroundColor: '#fafaf9', width: '100%' }}>
224:                   <Text style={{ fontSize: 10, color: '#d6d3d1' }}>—</Text>
225:                 </View>
226:               )}
227: 
228:               {/* 7Timer row */}
229:               {hasST && (
230:                 d.st ? (
231:                   <View style={{ alignItems: 'center', paddingVertical: 5, paddingHorizontal: 4, width: '100%', backgroundColor: '#f0f9ff' }}>
232:                     <Text style={{ fontSize: 16 }}>{stEmoji(d.st.weather)}</Text>
233:                     <Text style={{ fontSize: 11, fontWeight: '700', color: '#1c1917' }}>{d.st.tempC}°</Text>
234:                     <Text style={{ fontSize: 9, color: '#7dd3fc' }}>7T</Text>
235:                   </View>
236:                 ) : (
237:                   <View style={{ paddingVertical: 5, alignItems: 'center', backgroundColor: '#f0f9ff', width: '100%' }}>
238:                     <Text style={{ fontSize: 10, color: '#bae6fd' }}>—</Text>
239:                   </View>
240:                 )
241:               )}
242: 
243:               {/* Agree indicator */}
244:               {agree !== null && (
245:                 <Text style={{ fontSize: 10, paddingBottom: 4 }}>{agree ? '✅' : '⚠️'}</Text>
246:               )}
247:             </View>
248:           );
249:         })}
250:       </View>
251: 
252:       {hasOM && hasST && (
253:         <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
254:           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
255:             <View style={{ width: 10, height: 10, backgroundColor: '#fafaf9', borderRadius: 2, borderWidth: 1, borderColor: '#e7e5e4' }} />
256:             <Text style={{ fontSize: 10, color: '#78716c' }}>Open-Meteo</Text>
257:           </View>
258:           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
259:             <View style={{ width: 10, height: 10, backgroundColor: '#f0f9ff', borderRadius: 2, borderWidth: 1, borderColor: '#bae6fd' }} />
260:             <Text style={{ fontSize: 10, color: '#78716c' }}>7Timer</Text>
261:           </View>
262:         </View>
263:       )}
264: 
265:       {/* Hot vs Iced split */}
266:       <Text style={{ fontSize: 12, color: '#57534e', fontWeight: '600', marginBottom: 6 }}>
267:         Prepare: {hot}% Hot / {iced}% Iced
268:       </Text>
269:       <View style={{ flexDirection: 'row', borderRadius: 999, overflow: 'hidden', height: 14 }}>
270:         <View style={{ flex: hot, backgroundColor: '#78350f' }} />
271:         <View style={{ flex: iced, backgroundColor: '#bae6fd' }} />
272:       </View>
273:       <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
274:         <Text style={{ fontSize: 11, color: '#92400e' }}>☕ {hot}% Hot</Text>
275:         <Text style={{ fontSize: 11, color: '#0284c7' }}>🧊 {iced}% Iced</Text>
276:       </View>
277:     </View>
278:   );
279: }
````

## File: components/shared/ConfirmSheet.tsx
````typescript
 1: import React from 'react';
 2: import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
 3: 
 4: interface Props {
 5:   visible: boolean;
 6:   title: string;
 7:   message: string;
 8:   confirmLabel?: string;
 9:   cancelLabel?: string;
10:   destructive?: boolean;
11:   onConfirm: () => void;
12:   onCancel: () => void;
13: }
14: 
15: export function ConfirmSheet({
16:   visible, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
17:   destructive = false, onConfirm, onCancel,
18: }: Props) {
19:   return (
20:     <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
21:       <Pressable className="flex-1 bg-black/50 justify-end" onPress={onCancel}>
22:         <Pressable>
23:           <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
24:             <View className="w-12 h-1 bg-stone-300 rounded-full self-center mb-6" />
25:             <Text className="text-lg font-bold text-stone-900 mb-2">{title}</Text>
26:             <Text className="text-stone-600 mb-6">{message}</Text>
27:             <View className="gap-3">
28:               <TouchableOpacity
29:                 className={`py-4 rounded-xl items-center ${destructive ? 'bg-red-600' : 'bg-amber-700'}`}
30:                 onPress={onConfirm}
31:               >
32:                 <Text className="text-white font-semibold">{confirmLabel}</Text>
33:               </TouchableOpacity>
34:               <TouchableOpacity
35:                 className="py-4 rounded-xl items-center bg-stone-100"
36:                 onPress={onCancel}
37:               >
38:                 <Text className="text-stone-700 font-semibold">{cancelLabel}</Text>
39:               </TouchableOpacity>
40:             </View>
41:           </View>
42:         </Pressable>
43:       </Pressable>
44:     </Modal>
45:   );
46: }
````

## File: components/shared/CurrencyInput.tsx
````typescript
 1: import React, { useState } from 'react';
 2: import { View, Text, TextInput, TextInputProps } from 'react-native';
 3: 
 4: interface Props extends Omit<TextInputProps, 'value' | 'onChangeText'> {
 5:   value: number;
 6:   onChangeValue: (value: number) => void;
 7:   label?: string;
 8:   error?: string;
 9:   currencySymbol?: string;
10: }
11: 
12: export function CurrencyInput({
13:   value,
14:   onChangeValue,
15:   label,
16:   error,
17:   currencySymbol = '£',
18:   ...props
19: }: Props) {
20:   const [displayValue, setDisplayValue] = useState(value > 0 ? value.toString() : '');
21: 
22:   function handleChangeText(text: string) {
23:     const cleaned = text.replace(/[^0-9.]/g, '');
24:     setDisplayValue(cleaned);
25:     const parsed = parseFloat(cleaned);
26:     onChangeValue(isNaN(parsed) ? 0 : parsed);
27:   }
28: 
29:   function handleBlur() {
30:     if (value > 0) {
31:       setDisplayValue(value.toFixed(2));
32:     } else {
33:       setDisplayValue('');
34:     }
35:   }
36: 
37:   function handleFocus() {
38:     if (value === 0) setDisplayValue('');
39:   }
40: 
41:   return (
42:     <View>
43:       {label && <Text className="text-stone-600 text-sm font-medium mb-1">{label}</Text>}
44:       <View className={`flex-row items-center bg-stone-50 border rounded-xl px-3 py-3 ${error ? 'border-red-400' : 'border-stone-200'}`}>
45:         <Text className="text-stone-500 mr-1 text-base">{currencySymbol}</Text>
46:         <TextInput
47:           className="flex-1 text-stone-900 text-base"
48:           value={displayValue}
49:           onChangeText={handleChangeText}
50:           onBlur={handleBlur}
51:           onFocus={handleFocus}
52:           keyboardType="decimal-pad"
53:           placeholder="0.00"
54:           placeholderTextColor="#a8a29e"
55:           {...props}
56:         />
57:       </View>
58:       {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
59:     </View>
60:   );
61: }
62: 
63: export function currencySymbolFor(code: string | null | undefined): string {
64:   switch ((code ?? 'GBP').toUpperCase()) {
65:     case 'EUR':
66:       return '€';
67:     case 'USD':
68:       return '$';
69:     case 'GBP':
70:     default:
71:       return '£';
72:   }
73: }
````

## File: components/shared/EmptyState.tsx
````typescript
 1: import React, { useEffect, useRef } from 'react';
 2: import { View, Text, TouchableOpacity, Animated } from 'react-native';
 3: 
 4: interface ActionProp {
 5:   label: string;
 6:   onPress: () => void;
 7: }
 8: 
 9: interface Props {
10:   icon?: string;
11:   title: string;
12:   description?: string;
13:   action?: ActionProp;
14:   secondaryAction?: ActionProp;
15:   tip?: string;
16: }
17: 
18: export function EmptyState({ icon = '📋', title, description, action, secondaryAction, tip }: Props) {
19:   const opacity = useRef(new Animated.Value(0)).current;
20: 
21:   useEffect(() => {
22:     Animated.timing(opacity, {
23:       toValue: 1,
24:       duration: 400,
25:       useNativeDriver: true,
26:     }).start();
27:   }, [opacity]);
28: 
29:   return (
30:     <Animated.View className="flex-1 items-center justify-center px-8 py-16" style={{ opacity }}>
31:       <Text className="text-6xl mb-4">{icon}</Text>
32:       <Text className="text-lg font-semibold text-stone-700 text-center">{title}</Text>
33:       {description && (
34:         <Text className="text-stone-500 text-center mt-2">{description}</Text>
35:       )}
36:       {tip && (
37:         <View className="mt-4 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-xl">
38:           <Text className="text-amber-800 text-xs text-center">💡 {tip}</Text>
39:         </View>
40:       )}
41:       {action && (
42:         <TouchableOpacity
43:           onPress={action.onPress}
44:           accessibilityRole="button"
45:           accessibilityLabel={action.label}
46:           className="mt-6 bg-amber-700 px-6 py-3 rounded-xl"
47:         >
48:           <Text className="text-white font-semibold">{action.label}</Text>
49:         </TouchableOpacity>
50:       )}
51:       {secondaryAction && (
52:         <TouchableOpacity
53:           onPress={secondaryAction.onPress}
54:           accessibilityRole="button"
55:           accessibilityLabel={secondaryAction.label}
56:           className="mt-3 px-6 py-3"
57:         >
58:           <Text className="text-amber-700 font-medium">{secondaryAction.label}</Text>
59:         </TouchableOpacity>
60:       )}
61:     </Animated.View>
62:   );
63: }
````

## File: components/shared/EventStatusBadge.tsx
````typescript
 1: import React from 'react';
 2: import { View, Text } from 'react-native';
 3: import { STATUS_COLORS, STATUS_LABELS } from '@/constants';
 4: import type { ApplicationStatus } from '@/types';
 5: 
 6: interface Props {
 7:   status: ApplicationStatus;
 8:   size?: 'sm' | 'md';
 9: }
10: 
11: export function EventStatusBadge({ status, size = 'md' }: Props) {
12:   const colors = STATUS_COLORS[status];
13:   const label = STATUS_LABELS[status];
14:   const isSmall = size === 'sm';
15: 
16:   return (
17:     <View
18:       style={{ backgroundColor: colors.bgHex, paddingVertical: isSmall ? 2 : 4, paddingHorizontal: 10, borderRadius: 999, flexDirection: 'row', alignItems: 'center' }}
19:     >
20:       <View
21:         style={{ backgroundColor: colors.dot, width: isSmall ? 5 : 6, height: isSmall ? 5 : 6, borderRadius: 3, marginRight: 6 }}
22:       />
23:       <Text style={{ color: colors.textHex, fontWeight: '500', fontSize: 12 }}>
24:         {label}
25:       </Text>
26:     </View>
27:   );
28: }
````

## File: components/shared/FormField.tsx
````typescript
 1: import React from 'react';
 2: import { View, Text, TextInput, TextInputProps } from 'react-native';
 3: 
 4: interface Props extends TextInputProps {
 5:   label?: string;
 6:   error?: string;
 7:   required?: boolean;
 8: }
 9: 
10: export function FormField({ label, error, required, ...props }: Props) {
11:   return (
12:     <View>
13:       {label && (
14:         <Text className="text-stone-600 text-sm font-medium mb-1">
15:           {label}
16:           {required && <Text className="text-red-500"> *</Text>}
17:         </Text>
18:       )}
19:       <TextInput
20:         className={`bg-stone-50 border rounded-xl px-4 py-3 text-stone-900 text-base ${
21:           error ? 'border-red-400' : 'border-stone-200'
22:         }`}
23:         placeholderTextColor="#a8a29e"
24:         {...props}
25:       />
26:       {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
27:     </View>
28:   );
29: }
````

## File: components/shared/LoadingSpinner.tsx
````typescript
 1: import React from 'react';
 2: import { View, ActivityIndicator, Text } from 'react-native';
 3: 
 4: interface Props {
 5:   message?: string;
 6: }
 7: 
 8: export function LoadingSpinner({ message }: Props) {
 9:   return (
10:     <View className="flex-1 items-center justify-center gap-3">
11:       <ActivityIndicator size="large" color="#b45309" />
12:       {message && <Text className="text-stone-500 text-sm">{message}</Text>}
13:     </View>
14:   );
15: }
````

## File: components/shared/PageHeader.tsx
````typescript
 1: import React from 'react';
 2: import { View, Text, TouchableOpacity } from 'react-native';
 3: import { Ionicons } from '@expo/vector-icons';
 4: import { useRouter } from 'expo-router';
 5: 
 6: interface Props {
 7:   title: string;
 8:   subtitle?: string;
 9:   backButton?: boolean;
10:   rightAction?: { label: string; onPress: () => void };
11: }
12: 
13: export function PageHeader({ title, subtitle, backButton, rightAction }: Props) {
14:   const router = useRouter();
15: 
16:   return (
17:     <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
18:       <View className="flex-row items-center flex-1">
19:         {backButton && (
20:           <TouchableOpacity
21:             onPress={() => router.back()}
22:             accessibilityRole="button"
23:             accessibilityLabel="Go back"
24:             hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
25:             style={{
26:               width: 44,
27:               height: 44,
28:               alignItems: 'center',
29:               justifyContent: 'center',
30:               marginLeft: -10,
31:               marginRight: 4,
32:             }}
33:           >
34:             <Ionicons name="chevron-back" size={26} color="#b45309" />
35:           </TouchableOpacity>
36:         )}
37:         <View className="flex-1">
38:           <Text className="text-xl font-bold text-stone-900" numberOfLines={1}>{title}</Text>
39:           {subtitle && <Text className="text-stone-500 text-sm mt-0.5">{subtitle}</Text>}
40:         </View>
41:       </View>
42:       {rightAction && (
43:         <TouchableOpacity
44:           onPress={rightAction.onPress}
45:           accessibilityRole="button"
46:           accessibilityLabel={rightAction.label}
47:           hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
48:           className="ml-3"
49:         >
50:           <Text className="text-amber-600 font-semibold text-sm">{rightAction.label}</Text>
51:         </TouchableOpacity>
52:       )}
53:     </View>
54:   );
55: }
````

## File: components/shared/QueryError.tsx
````typescript
 1: import React from 'react';
 2: import { View, Text, TouchableOpacity } from 'react-native';
 3: 
 4: interface Props {
 5:   error: Error | null | unknown;
 6:   onRetry: () => void;
 7:   message?: string;
 8: }
 9: 
10: export function QueryError({ error, onRetry, message }: Props) {
11:   if (!error) return null;
12:   const errMessage = error instanceof Error ? error.message : String(error);
13:   return (
14:     <View className="flex-1 items-center justify-center px-6 py-12">
15:       <Text className="text-4xl mb-4">⚠️</Text>
16:       <Text className="text-stone-700 font-semibold text-center mb-2">
17:         {message ?? 'Something went wrong'}
18:       </Text>
19:       <Text className="text-stone-400 text-xs text-center mb-6" numberOfLines={3}>
20:         {errMessage}
21:       </Text>
22:       <TouchableOpacity
23:         onPress={onRetry}
24:         accessibilityLabel="Retry"
25:         accessibilityRole="button"
26:         className="bg-amber-700 px-6 py-3 rounded-xl"
27:       >
28:         <Text className="text-white font-semibold">Try Again</Text>
29:       </TouchableOpacity>
30:     </View>
31:   );
32: }
````

## File: components/units/UnitCard.tsx
````typescript
  1: import React from 'react';
  2: import { View, Text, TouchableOpacity } from 'react-native';
  3: import { UNIT_STATUS_LABELS, UNIT_STATUS_COLORS } from '@/constants';
  4: import type { Unit, EventWithFinancials } from '@/types';
  5: import type { UnitStatus } from '@/types';
  6: 
  7: function daysUntil(dateStr: string | null): number | null {
  8:   if (!dateStr) return null;
  9:   const diff = new Date(dateStr).getTime() - Date.now();
 10:   return Math.ceil(diff / 86400000);
 11: }
 12: 
 13: function ExpiryPill({ label, dateStr }: { label: string; dateStr: string | null }) {
 14:   if (!dateStr) return null;
 15:   const days = daysUntil(dateStr);
 16:   if (days === null) return null;
 17:   const expired = days < 0;
 18:   const soon = days >= 0 && days <= 30;
 19:   if (!expired && !soon) return null;
 20:   return (
 21:     <View style={{
 22:       flexDirection: 'row', alignItems: 'center', gap: 3,
 23:       paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999,
 24:       backgroundColor: expired ? '#fee2e2' : '#fef3c7',
 25:     }}>
 26:       <Text style={{ fontSize: 10 }}>{expired ? '🔴' : '🟡'}</Text>
 27:       <Text style={{ fontSize: 10, fontWeight: '600', color: expired ? '#991b1b' : '#92400e' }}>
 28:         {label}{expired ? ' expired' : ` due ${days === 0 ? 'today' : `in ${days}d`}`}
 29:       </Text>
 30:     </View>
 31:   );
 32: }
 33: 
 34: interface Props {
 35:   unit: Unit;
 36:   currentEvent?: EventWithFinancials | null;
 37:   onPress: () => void;
 38: }
 39: 
 40: export function UnitCard({ unit, currentEvent, onPress }: Props) {
 41:   const status = unit.status as UnitStatus;
 42:   const colors = UNIT_STATUS_COLORS[status];
 43: 
 44:   return (
 45:     <TouchableOpacity
 46:       onPress={onPress}
 47:       activeOpacity={0.7}
 48:       className="bg-white rounded-2xl mb-3 border border-stone-100 overflow-hidden"
 49:       style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}
 50:     >
 51:       <View style={{ flexDirection: 'row' }}>
 52:         <View style={{ width: 4, backgroundColor: colors.dot, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }} />
 53:         <View style={{ flex: 1, padding: 14 }}>
 54:           <View className="flex-row items-start justify-between">
 55:             <View className="flex-1 mr-3">
 56:               <Text className="font-bold text-stone-900 text-base">{unit.name}</Text>
 57:               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
 58:                 {unit.registration ? (
 59:                   <Text className="text-slate-500 text-xs font-medium tracking-wide">{unit.registration}</Text>
 60:                 ) : null}
 61:                 {unit.vehicle_type ? (
 62:                   <View style={{ backgroundColor: '#f5f5f4', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
 63:                     <Text style={{ fontSize: 10, fontWeight: '600', color: '#57534e' }}>{unit.vehicle_type}</Text>
 64:                   </View>
 65:                 ) : null}
 66:               </View>
 67:               {(unit.height_m != null || unit.length_m != null || unit.width_m != null) ? (
 68:                 <Text style={{ fontSize: 10, color: '#a8a29e', marginTop: 2 }}>
 69:                   {[
 70:                     unit.height_m != null && `H ${unit.height_m.toFixed(1)}m`,
 71:                     unit.length_m != null && `L ${unit.length_m.toFixed(1)}m`,
 72:                     unit.width_m  != null && `W ${unit.width_m.toFixed(1)}m`,
 73:                   ].filter(Boolean).join(' · ')}
 74:                 </Text>
 75:               ) : null}
 76:             </View>
 77:             <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.bgHex, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
 78:               <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dot }} />
 79:               <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textHex }}>
 80:                 {UNIT_STATUS_LABELS[status]}
 81:               </Text>
 82:             </View>
 83:           </View>
 84: 
 85:           {/* Expiry warnings */}
 86:           <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
 87:             <ExpiryPill label="MOT" dateStr={unit.mot_date} />
 88:             <ExpiryPill label="Tax" dateStr={unit.tax_date} />
 89:             <ExpiryPill label="Service" dateStr={unit.service_date} />
 90:           </View>
 91: 
 92:           <View className="mt-2">
 93:             {currentEvent ? (
 94:               <Text className="text-amber-600 text-xs font-medium" numberOfLines={1}>
 95:                 📍 Currently at: {currentEvent.name}
 96:               </Text>
 97:             ) : status === 'active' ? (
 98:               <Text className="text-green-600 text-xs font-medium">✅ Available</Text>
 99:             ) : null}
100:           </View>
101:         </View>
102:       </View>
103:     </TouchableOpacity>
104:   );
105: }
````

## File: components/units/UnitForm.tsx
````typescript
  1: import React, { useState, useRef, useEffect } from 'react';
  2: import {
  3:   View, ScrollView, TouchableOpacity, Text, Alert, ActivityIndicator, Modal,
  4: } from 'react-native';
  5: import * as Haptics from 'expo-haptics';
  6: import { useForm, Controller, Resolver } from 'react-hook-form';
  7: import { zodResolver } from '@hookform/resolvers/zod';
  8: import { useRouter } from 'expo-router';
  9: import { format, parseISO, isValid } from 'date-fns';
 10: import { unitSchema } from '@/lib/validations/unit.schema';
 11: import { FormField } from '@/components/shared/FormField';
 12: import { UNIT_STATUSES, UNIT_STATUS_LABELS, UNIT_STATUS_COLORS } from '@/constants';
 13: import type { UnitFormValues } from '@/lib/validations/unit.schema';
 14: import type { UnitStatus } from '@/types';
 15: 
 16: const VEHICLE_TYPES = ['Van', 'Truck', 'Trailer', 'Fridge Van', 'Transport Unit'];
 17: const SERVICE_INTERVALS = [
 18:   { value: '6months', label: 'Every 6 months' },
 19:   { value: '1year',   label: 'Every year' },
 20: ] as const;
 21: 
 22: const ITEM_HEIGHT = 48;
 23: const VISIBLE_ITEMS = 5;
 24: const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 25: 
 26: function daysInMonth(month1based: number, year: number): number {
 27:   return new Date(year, month1based, 0).getDate();
 28: }
 29: 
 30: function WheelColumn({
 31:   items, initialIndex, onChange,
 32: }: {
 33:   items: (string | number)[];
 34:   initialIndex: number;
 35:   onChange: (index: number) => void;
 36: }) {
 37:   const scrollRef = useRef<ScrollView>(null);
 38:   const [selectedIdx, setSelectedIdx] = useState(Math.max(0, Math.min(initialIndex, items.length - 1)));
 39:   const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 40:   const lastReportedIdx = useRef<number>(selectedIdx);
 41: 
 42:   useEffect(() => {
 43:     const safeIdx = Math.max(0, Math.min(initialIndex, items.length - 1));
 44:     setSelectedIdx(safeIdx);
 45:     lastReportedIdx.current = safeIdx;
 46:     setTimeout(() => {
 47:       scrollRef.current?.scrollTo({ y: safeIdx * ITEM_HEIGHT, animated: false });
 48:     }, 200);
 49:   }, [initialIndex, items.length]);
 50: 
 51:   useEffect(() => () => {
 52:     if (debounceTimer.current) clearTimeout(debounceTimer.current);
 53:   }, []);
 54: 
 55:   function handleScrollEnd(y: number) {
 56:     if (debounceTimer.current) clearTimeout(debounceTimer.current);
 57:     debounceTimer.current = setTimeout(() => {
 58:       const idx = Math.max(0, Math.min(Math.round(y / ITEM_HEIGHT), items.length - 1));
 59:       if (idx === lastReportedIdx.current) return;
 60:       lastReportedIdx.current = idx;
 61:       setSelectedIdx(idx);
 62:       onChange(idx);
 63:     }, 50);
 64:   }
 65: 
 66:   return (
 67:     <View style={{ flex: 1, overflow: 'hidden' }}>
 68:       <View
 69:         pointerEvents="none"
 70:         style={{
 71:           position: 'absolute', top: ITEM_HEIGHT * 2, left: 4, right: 4,
 72:           height: ITEM_HEIGHT, backgroundColor: '#f1f5f9', borderRadius: 10,
 73:         }}
 74:       />
 75:       <ScrollView
 76:         ref={scrollRef}
 77:         snapToInterval={ITEM_HEIGHT}
 78:         decelerationRate="fast"
 79:         showsVerticalScrollIndicator={false}
 80:         contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
 81:         style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
 82:         onMomentumScrollEnd={(e) => handleScrollEnd(e.nativeEvent.contentOffset.y)}
 83:         onScrollEndDrag={(e) => handleScrollEnd(e.nativeEvent.contentOffset.y)}
 84:       >
 85:         {items.map((item, index) => (
 86:           <TouchableOpacity
 87:             key={index}
 88:             style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}
 89:             onPress={() => {
 90:               setSelectedIdx(index);
 91:               onChange(index);
 92:               scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
 93:             }}
 94:             activeOpacity={0.6}
 95:           >
 96:             <Text style={{
 97:               fontSize: selectedIdx === index ? 17 : 15,
 98:               fontWeight: selectedIdx === index ? '600' : '400',
 99:               color: selectedIdx === index ? '#0f172a' : '#94a3b8',
100:             }}>
101:               {String(item)}
102:             </Text>
103:           </TouchableOpacity>
104:         ))}
105:       </ScrollView>
106:     </View>
107:   );
108: }
109: 
110: function DatePickerModal({
111:   visible, value, onConfirm, onClose,
112: }: {
113:   visible: boolean; value: string; onConfirm: (iso: string) => void; onClose: () => void;
114: }) {
115:   const now = new Date();
116:   const currentYear = now.getFullYear();
117:   const years = Array.from({ length: 16 }, (_, i) => currentYear - 2 + i);
118: 
119:   const [dayIdx, setDayIdx] = useState(now.getDate() - 1);
120:   const [monthIdx, setMonthIdx] = useState(now.getMonth());
121:   const [yearIdx, setYearIdx] = useState(2);
122: 
123:   useEffect(() => {
124:     if (!visible) return;
125:     const p = (() => {
126:       if (!value) return now;
127:       try { const d = parseISO(value); return isValid(d) ? d : now; }
128:       catch { return now; }
129:     })();
130:     const yi = years.indexOf(p.getFullYear());
131:     setDayIdx(p.getDate() - 1);
132:     setMonthIdx(p.getMonth());
133:     setYearIdx(yi >= 0 ? yi : 2);
134:   }, [visible]);
135: 
136:   const numDays = daysInMonth(monthIdx + 1, years[yearIdx]);
137:   const days = Array.from({ length: numDays }, (_, i) => i + 1);
138:   const clampedDayIdx = Math.min(dayIdx, numDays - 1);
139: 
140:   function handleConfirm() {
141:     const year = years[yearIdx];
142:     const month = monthIdx + 1;
143:     const day = Math.min(dayIdx + 1, daysInMonth(month, year));
144:     const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
145:     onConfirm(iso);
146:     onClose();
147:   }
148: 
149:   return (
150:     <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
151:       <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
152:         <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
153:         <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
154:           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
155:             <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
156:               <Text style={{ fontSize: 16, color: '#64748b' }}>Cancel</Text>
157:             </TouchableOpacity>
158:             <TouchableOpacity onPress={handleConfirm} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
159:               <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>Done</Text>
160:             </TouchableOpacity>
161:           </View>
162:           <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 36 }}>
163:             <WheelColumn
164:               key={`day-${monthIdx}-${yearIdx}`}
165:               items={days}
166:               initialIndex={clampedDayIdx}
167:               onChange={(idx) => setDayIdx(idx)}
168:             />
169:             <WheelColumn
170:               key="month"
171:               items={MONTHS_SHORT}
172:               initialIndex={monthIdx}
173:               onChange={(idx) => setMonthIdx(idx)}
174:             />
175:             <WheelColumn
176:               key="year"
177:               items={years}
178:               initialIndex={yearIdx}
179:               onChange={(idx) => setYearIdx(idx)}
180:             />
181:           </View>
182:         </View>
183:       </View>
184:     </Modal>
185:   );
186: }
187: 
188: // Build an array of metric values: start, end, step (all × 10 to avoid float precision)
189: function metricValues(startTenths: number, endTenths: number): string[] {
190:   const result: string[] = [];
191:   for (let i = startTenths; i <= endTenths; i++) {
192:     result.push((i / 10).toFixed(1));
193:   }
194:   return result;
195: }
196: 
197: const HEIGHT_VALUES = metricValues(5, 50);  // 0.5m–5.0m
198: const LENGTH_VALUES = metricValues(10, 200); // 1.0m–20.0m
199: const WIDTH_VALUES  = metricValues(10, 45);  // 1.0m–4.5m
200: 
201: function MetricPickerModal({
202:   visible, value, values, unit, onConfirm, onClose,
203: }: {
204:   visible: boolean; value: number | null; values: string[]; unit: string;
205:   onConfirm: (v: number) => void; onClose: () => void;
206: }) {
207:   const defaultIdx = value != null
208:     ? Math.max(0, values.indexOf(value.toFixed(1)))
209:     : Math.floor(values.length / 2);
210:   const [idx, setIdx] = useState(defaultIdx);
211: 
212:   useEffect(() => {
213:     if (!visible) return;
214:     const i = value != null ? values.indexOf(value.toFixed(1)) : Math.floor(values.length / 2);
215:     setIdx(Math.max(0, i));
216:   }, [visible]);
217: 
218:   return (
219:     <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
220:       <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
221:         <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
222:         <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
223:           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
224:             <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
225:               <Text style={{ fontSize: 16, color: '#64748b' }}>Cancel</Text>
226:             </TouchableOpacity>
227:             <Text style={{ fontSize: 15, fontWeight: '600', color: '#334155' }}>{unit}</Text>
228:             <TouchableOpacity onPress={() => { onConfirm(parseFloat(values[idx])); onClose(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
229:               <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>Done</Text>
230:             </TouchableOpacity>
231:           </View>
232:           <View style={{ flexDirection: 'row', paddingHorizontal: 60, paddingBottom: 36 }}>
233:             <WheelColumn items={values} initialIndex={Math.max(0, idx)} onChange={setIdx} />
234:           </View>
235:         </View>
236:       </View>
237:     </Modal>
238:   );
239: }
240: 
241: function MetricPickerButton({
242:   label, value, values, unit, onChange,
243: }: {
244:   label: string; value: number | null; values: string[]; unit: string;
245:   onChange: (v: number | null) => void;
246: }) {
247:   const [show, setShow] = useState(false);
248:   return (
249:     <View>
250:       <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600', marginBottom: 6 }}>{label}</Text>
251:       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
252:         <TouchableOpacity
253:           onPress={() => setShow(true)}
254:           style={{
255:             flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
256:             borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
257:             paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#ffffff',
258:           }}
259:         >
260:           <Text style={{ color: value != null ? '#0f172a' : '#94a3b8', fontSize: 15 }}>
261:             {value != null ? `${value.toFixed(1)} m` : 'Not set'}
262:           </Text>
263:           <Text style={{ color: '#94a3b8', fontSize: 13 }}>▾</Text>
264:         </TouchableOpacity>
265:         {value != null && (
266:           <TouchableOpacity onPress={() => onChange(null)} style={{ padding: 10 }}>
267:             <Text style={{ color: '#94a3b8', fontSize: 16 }}>✕</Text>
268:           </TouchableOpacity>
269:         )}
270:       </View>
271:       {show && (
272:         <MetricPickerModal
273:           visible={show}
274:           value={value}
275:           values={values}
276:           unit={unit}
277:           onConfirm={onChange}
278:           onClose={() => setShow(false)}
279:         />
280:       )}
281:     </View>
282:   );
283: }
284: 
285: function DatePickerButton({
286:   label, value, onChange, required,
287: }: {
288:   label: string; value: string; onChange: (iso: string) => void; required?: boolean;
289: }) {
290:   const [show, setShow] = useState(false);
291:   const displayText = value
292:     ? (() => { try { const d = parseISO(value); return isValid(d) ? format(d, 'd MMM yyyy') : value; } catch { return value; } })()
293:     : '';
294: 
295:   return (
296:     <View>
297:       <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600', marginBottom: 6 }}>
298:         {label}{required && <Text style={{ color: '#ef4444' }}> *</Text>}
299:       </Text>
300:       <TouchableOpacity
301:         onPress={() => setShow(true)}
302:         style={{
303:           flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
304:           borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
305:           paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#ffffff',
306:         }}
307:       >
308:         <Text style={{ color: displayText ? '#0f172a' : '#94a3b8', fontSize: 15 }}>
309:           {displayText || 'Select date'}
310:         </Text>
311:         <Text style={{ fontSize: 16 }}>📅</Text>
312:       </TouchableOpacity>
313:       {show && (
314:         <DatePickerModal
315:           visible={show}
316:           value={value}
317:           onConfirm={onChange}
318:           onClose={() => setShow(false)}
319:         />
320:       )}
321:     </View>
322:   );
323: }
324: 
325: interface Props {
326:   defaultValues?: Partial<UnitFormValues>;
327:   onSubmit: (data: UnitFormValues) => Promise<void>;
328:   submitLabel?: string;
329: }
330: 
331: export function UnitForm({ defaultValues, onSubmit, submitLabel = 'Save Unit' }: Props) {
332:   const [loading, setLoading] = useState(false);
333:   const router = useRouter();
334: 
335:   const { control, handleSubmit, formState: { errors } } = useForm<UnitFormValues>({
336:     resolver: zodResolver(unitSchema) as Resolver<UnitFormValues>,
337:     defaultValues: {
338:       name: '',
339:       registration: '',
340:       notes: '',
341:       status: 'active',
342:       vehicle_type: '',
343:       height_m: null,
344:       length_m: null,
345:       width_m: null,
346:       mot_date: '',
347:       tax_date: '',
348:       service_date: '',
349:       service_interval: '1year',
350:       ...defaultValues,
351:     },
352:   });
353: 
354:   async function handleFormSubmit(data: UnitFormValues) {
355:     setLoading(true);
356:     try {
357:       await onSubmit(data);
358:       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
359:       router.back();
360:     } catch (e: any) {
361:       Alert.alert('Error', e.message ?? 'Failed to save unit');
362:     } finally {
363:       setLoading(false);
364:     }
365:   }
366: 
367:   return (
368:     <View style={{ flex: 1, backgroundColor: '#fafaf9' }}>
369:       <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }} keyboardShouldPersistTaps="handled">
370:         <View style={{ gap: 16 }}>
371: 
372:           {/* Name */}
373:           <Controller
374:             control={control}
375:             name="name"
376:             render={({ field }) => (
377:               <FormField
378:                 label="Unit Name"
379:                 required
380:                 value={field.value}
381:                 onChangeText={field.onChange}
382:                 error={errors.name?.message}
383:                 placeholder="e.g. The Bean Machine"
384:               />
385:             )}
386:           />
387: 
388:           {/* Registration */}
389:           <Controller
390:             control={control}
391:             name="registration"
392:             render={({ field }) => (
393:               <FormField
394:                 label="Registration / Plate Number"
395:                 value={field.value ?? ''}
396:                 onChangeText={(text) => field.onChange(text.toUpperCase())}
397:                 error={errors.registration?.message}
398:                 placeholder="e.g. AB12 CDE"
399:                 autoCapitalize="characters"
400:               />
401:             )}
402:           />
403: 
404:           {/* Vehicle type */}
405:           <Controller
406:             control={control}
407:             name="vehicle_type"
408:             render={({ field }) => (
409:               <View>
410:                 <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Vehicle Type</Text>
411:                 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
412:                   {VEHICLE_TYPES.map((vt) => {
413:                     const isSelected = field.value === vt;
414:                     return (
415:                       <TouchableOpacity
416:                         key={vt}
417:                         onPress={() => field.onChange(isSelected ? '' : vt)}
418:                         style={{
419:                           paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1,
420:                           backgroundColor: isSelected ? '#1c1917' : '#ffffff',
421:                           borderColor: isSelected ? '#1c1917' : '#e7e5e4',
422:                         }}
423:                         activeOpacity={0.7}
424:                       >
425:                         <Text style={{ fontSize: 13, fontWeight: '500', color: isSelected ? '#ffffff' : '#57534e' }}>
426:                           {vt}
427:                         </Text>
428:                       </TouchableOpacity>
429:                     );
430:                   })}
431:                 </View>
432:               </View>
433:             )}
434:           />
435: 
436:           {/* Dimensions */}
437:           <View>
438:             <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Dimensions</Text>
439:             <View style={{ gap: 10 }}>
440:               <Controller
441:                 control={control}
442:                 name="height_m"
443:                 render={({ field }) => (
444:                   <MetricPickerButton
445:                     label="Height"
446:                     value={field.value ?? null}
447:                     values={HEIGHT_VALUES}
448:                     unit="metres"
449:                     onChange={field.onChange}
450:                   />
451:                 )}
452:               />
453:               <Controller
454:                 control={control}
455:                 name="length_m"
456:                 render={({ field }) => (
457:                   <MetricPickerButton
458:                     label="Length"
459:                     value={field.value ?? null}
460:                     values={LENGTH_VALUES}
461:                     unit="metres"
462:                     onChange={field.onChange}
463:                   />
464:                 )}
465:               />
466:               <Controller
467:                 control={control}
468:                 name="width_m"
469:                 render={({ field }) => (
470:                   <MetricPickerButton
471:                     label="Width"
472:                     value={field.value ?? null}
473:                     values={WIDTH_VALUES}
474:                     unit="metres"
475:                     onChange={field.onChange}
476:                   />
477:                 )}
478:               />
479:             </View>
480:           </View>
481: 
482:           {/* Status */}
483:           <Controller
484:             control={control}
485:             name="status"
486:             render={({ field }) => (
487:               <View>
488:                 <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Status</Text>
489:                 <View style={{ flexDirection: 'row', gap: 8 }}>
490:                   {UNIT_STATUSES.map((s) => {
491:                     const colors = UNIT_STATUS_COLORS[s as UnitStatus];
492:                     const isSelected = field.value === s;
493:                     return (
494:                       <TouchableOpacity
495:                         key={s}
496:                         onPress={() => field.onChange(s)}
497:                         style={{
498:                           flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
499:                           paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
500:                           backgroundColor: isSelected ? colors.bgHex : '#ffffff',
501:                           borderColor: isSelected ? 'transparent' : '#e7e5e4',
502:                         }}
503:                         activeOpacity={0.7}
504:                       >
505:                         <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dot, marginRight: 6 }} />
506:                         <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? colors.textHex : '#78716c' }} numberOfLines={1}>
507:                           {UNIT_STATUS_LABELS[s as UnitStatus]}
508:                         </Text>
509:                       </TouchableOpacity>
510:                     );
511:                   })}
512:                 </View>
513:               </View>
514:             )}
515:           />
516: 
517:           {/* MOT date */}
518:           <Controller
519:             control={control}
520:             name="mot_date"
521:             render={({ field }) => (
522:               <DatePickerButton
523:                 label="MOT Expiry Date"
524:                 value={field.value ?? ''}
525:                 onChange={field.onChange}
526:               />
527:             )}
528:           />
529: 
530:           {/* Tax date */}
531:           <Controller
532:             control={control}
533:             name="tax_date"
534:             render={({ field }) => (
535:               <DatePickerButton
536:                 label="Tax (VED) Expiry Date"
537:                 value={field.value ?? ''}
538:                 onChange={field.onChange}
539:               />
540:             )}
541:           />
542: 
543:           {/* Service date */}
544:           <Controller
545:             control={control}
546:             name="service_date"
547:             render={({ field }) => (
548:               <DatePickerButton
549:                 label="Last Service Date"
550:                 value={field.value ?? ''}
551:                 onChange={field.onChange}
552:               />
553:             )}
554:           />
555: 
556:           {/* Service interval */}
557:           <Controller
558:             control={control}
559:             name="service_interval"
560:             render={({ field }) => (
561:               <View>
562:                 <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Service Interval</Text>
563:                 <View style={{ flexDirection: 'row', gap: 8 }}>
564:                   {SERVICE_INTERVALS.map(({ value, label }) => {
565:                     const isSelected = field.value === value;
566:                     return (
567:                       <TouchableOpacity
568:                         key={value}
569:                         onPress={() => field.onChange(value)}
570:                         style={{
571:                           flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center',
572:                           backgroundColor: isSelected ? '#1c1917' : '#ffffff',
573:                           borderColor: isSelected ? '#1c1917' : '#e7e5e4',
574:                         }}
575:                         activeOpacity={0.7}
576:                       >
577:                         <Text style={{ fontSize: 13, fontWeight: '500', color: isSelected ? '#ffffff' : '#57534e' }}>
578:                           {label}
579:                         </Text>
580:                       </TouchableOpacity>
581:                     );
582:                   })}
583:                 </View>
584:               </View>
585:             )}
586:           />
587: 
588:           {/* Notes */}
589:           <Controller
590:             control={control}
591:             name="notes"
592:             render={({ field }) => (
593:               <FormField
594:                 label="Notes"
595:                 value={field.value ?? ''}
596:                 onChangeText={field.onChange}
597:                 placeholder="Any notes about this unit..."
598:                 multiline
599:                 numberOfLines={4}
600:                 style={{ textAlignVertical: 'top', minHeight: 96 }}
601:               />
602:             )}
603:           />
604:         </View>
605:         <View style={{ height: 100 }} />
606:       </ScrollView>
607: 
608:       <View style={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 12, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f5f5f4' }}>
609:         <TouchableOpacity
610:           onPress={handleSubmit(handleFormSubmit)}
611:           style={{ backgroundColor: '#b45309', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }}
612:           disabled={loading}
613:         >
614:           {loading ? (
615:             <ActivityIndicator color="#fff" />
616:           ) : (
617:             <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>{submitLabel}</Text>
618:           )}
619:         </TouchableOpacity>
620:       </View>
621:     </View>
622:   );
623: }
````

## File: constants/index.ts
````typescript
 1: import type { ApplicationStatus, InfrastructureCategory, UnitStatus } from '@/types';
 2: 
 3: export const STATUS_LABELS: Record<ApplicationStatus, string> = {
 4:   pending: 'Pending',
 5:   accepted: 'Accepted',
 6:   rejected: 'Rejected',
 7:   waitlisted: 'Waitlisted',
 8:   withdrawn: 'Withdrawn',
 9: };
10: 
11: export const STATUS_COLORS: Record<ApplicationStatus, { bg: string; text: string; dot: string; bgHex: string; textHex: string }> = {
12:   pending:    { bg: 'bg-amber-100',  text: 'text-amber-800',  dot: '#f59e0b', bgHex: '#fef3c7', textHex: '#92400e' },
13:   accepted:   { bg: 'bg-green-100',  text: 'text-green-800',  dot: '#22c55e', bgHex: '#dcfce7', textHex: '#166534' },
14:   rejected:   { bg: 'bg-red-100',    text: 'text-red-800',    dot: '#ef4444', bgHex: '#fee2e2', textHex: '#991b1b' },
15:   waitlisted: { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: '#3b82f6', bgHex: '#dbeafe', textHex: '#1e40af' },
16:   withdrawn:  { bg: 'bg-stone-100',  text: 'text-stone-700',  dot: '#a8a29e', bgHex: '#f5f5f4', textHex: '#1c1917' },
17: };
18: 
19: export const STATUS_PIE_COLORS: Record<ApplicationStatus, string> = {
20:   accepted:   '#22c55e',
21:   pending:    '#f59e0b',
22:   rejected:   '#ef4444',
23:   waitlisted: '#3b82f6',
24:   withdrawn:  '#a8a29e',
25: };
26: 
27: export const INFRASTRUCTURE_CATEGORY_LABELS: Record<InfrastructureCategory, string> = {
28:   pitch_fee: 'Pitch Fee',
29:   travel:    'Travel',
30:   equipment: 'Equipment',
31:   supplies:  'Supplies',
32:   other:     'Other',
33: };
34: 
35: export const STATUSES: ApplicationStatus[] = [
36:   'pending', 'accepted', 'rejected', 'waitlisted', 'withdrawn',
37: ];
38: 
39: export const INFRASTRUCTURE_CATEGORIES: InfrastructureCategory[] = [
40:   'pitch_fee', 'travel', 'equipment', 'supplies', 'other',
41: ];
42: 
43: export const UNIT_STATUSES: UnitStatus[] = ['active', 'maintenance', 'retired'];
44: 
45: export const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
46:   active:      'Active',
47:   maintenance: 'In Maintenance',
48:   retired:     'Retired',
49: };
50: 
51: export const UNIT_STATUS_COLORS: Record<UnitStatus, { bg: string; text: string; dot: string; bgHex: string; textHex: string }> = {
52:   active:      { bg: 'bg-green-100',  text: 'text-green-800',  dot: '#22c55e', bgHex: '#dcfce7', textHex: '#166534' },
53:   maintenance: { bg: 'bg-amber-100',  text: 'text-amber-800',  dot: '#f59e0b', bgHex: '#fef3c7', textHex: '#92400e' },
54:   retired:     { bg: 'bg-stone-100',  text: 'text-stone-600',  dot: '#a8a29e', bgHex: '#f5f5f4', textHex: '#57534e' },
55: };
56: 
57: export const BRAND = {
58:   primary:   '#6b3a2a',
59:   secondary: '#c9813a',
60:   dark:      '#1c1917',
61:   light:     '#fdf8f0',
62: };
````

## File: lib/mutations/companies.ts
````typescript
 1: import { useMutation, useQueryClient } from '@tanstack/react-query';
 2: import { supabase } from '@/lib/supabase';
 3: import type { CompanyFormValues } from '@/lib/validations/company.schema';
 4: 
 5: export function useCreateCompany() {
 6:   const qc = useQueryClient();
 7:   return useMutation({
 8:     mutationFn: async ({ data, userId }: { data: CompanyFormValues; userId: string }) => {
 9:       const { data: company, error } = await supabase
10:         .from('concessions_companies')
11:         .insert({
12:           user_id: userId,
13:           name: data.name,
14:           contact_name: data.contact_name || null,
15:           email: data.email || null,
16:           phone: data.phone || null,
17:           website: data.website || null,
18:           notes: data.notes || null,
19:         })
20:         .select()
21:         .single();
22:       if (error) throw error;
23:       return company;
24:     },
25:     onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
26:   });
27: }
28: 
29: export function useUpdateCompany() {
30:   const qc = useQueryClient();
31:   return useMutation({
32:     mutationFn: async ({ id, data }: { id: string; data: CompanyFormValues }) => {
33:       const { error } = await supabase
34:         .from('concessions_companies')
35:         .update({
36:           name: data.name,
37:           contact_name: data.contact_name || null,
38:           email: data.email || null,
39:           phone: data.phone || null,
40:           website: data.website || null,
41:           notes: data.notes || null,
42:         })
43:         .eq('id', id);
44:       if (error) throw error;
45:     },
46:     onSuccess: (_, { id }) => {
47:       qc.invalidateQueries({ queryKey: ['companies'] });
48:       qc.invalidateQueries({ queryKey: ['companies', id] });
49:     },
50:   });
51: }
````

## File: lib/mutations/events.ts
````typescript
  1: import { useMutation, useQueryClient } from '@tanstack/react-query';
  2: import { supabase } from '@/lib/supabase';
  3: import { calcStaffingTotal } from '@/lib/calculations';
  4: import type { EventFormValues } from '@/lib/validations/event.schema';
  5: 
  6: export function useCreateEvent() {
  7:   const qc = useQueryClient();
  8:   return useMutation({
  9:     mutationFn: async ({ data, userId }: { data: EventFormValues; userId: string }) => {
 10:       // 1. Create the event
 11:       const { data: event, error: eventError } = await supabase
 12:         .from('events')
 13:         .insert({
 14:           user_id: userId,
 15:           name: data.name,
 16:           date: data.date,
 17:           end_date: data.end_date || null,
 18:           location: data.location,
 19:           description: data.description || null,
 20:           application_date: data.application_date || null,
 21:           status: data.status,
 22:           notes: data.notes || null,
 23:           company_id: data.company_id || null,
 24:           overnight_stay: data.overnight_stay ?? false,
 25:           documents_uploaded: data.documents_uploaded ?? false,
 26:           application_url: data.application_url || null,
 27:         })
 28:         .select()
 29:         .single();
 30:       if (eventError) throw eventError;
 31: 
 32:       // 2. Calculate staffing total from entries if provided
 33:       const staffingTotal =
 34:         data.staffing_entries.length > 0
 35:           ? calcStaffingTotal(data.staffing_entries.map((e) => ({ ...e, id: '', event_id: event.id, created_at: '', updated_at: '' })))
 36:           : data.staffing_costs;
 37: 
 38:       // 3. Create financials
 39:       const zeroRated = data.zero_rated_sales ?? 0;
 40:       const standardRated = data.standard_rated_sales ?? 0;
 41:       const { error: finError } = await supabase.from('event_financials').insert({
 42:         event_id: event.id,
 43:         gross_sales: (zeroRated + standardRated) || data.gross_sales || 0,
 44:         zero_rated_sales: zeroRated,
 45:         standard_rated_sales: standardRated,
 46:         concessions_commission_pct: data.concessions_commission_pct ?? 0,
 47:         pitch_fee_refund_pct: data.pitch_fee_refund_pct ?? 0,
 48:         cost_of_goods: data.cost_of_goods,
 49:         pitch_fee: data.pitch_fee,
 50:         power_fee: data.power_fee ?? 0,
 51:         travel_costs: data.travel_costs,
 52:         camping_costs: data.camping_costs ?? 0,
 53:         equipment_costs: data.equipment_costs,
 54:         other_costs: data.other_costs,
 55:         staffing_costs: staffingTotal,
 56:         fresh_milk_litres: data.fresh_milk_litres ?? 0,
 57:         alt_milk_litres: data.alt_milk_litres ?? 0,
 58:       });
 59:       if (finError) throw finError;
 60: 
 61:       // 4. Create unit assignments
 62:       if (data.unit_ids.length > 0) {
 63:         const { error: unitError } = await supabase.from('event_units').insert(
 64:           data.unit_ids.map((uid) => ({ event_id: event.id, unit_id: uid }))
 65:         );
 66:         if (unitError) throw unitError;
 67:       }
 68: 
 69:       // 5. Create staffing entries
 70:       if (data.staffing_entries.length > 0) {
 71:         const { error: staffError } = await supabase.from('staffing_entries').insert(
 72:           data.staffing_entries.map((e) => ({
 73:             event_id: event.id,
 74:             staff_name: e.staff_name,
 75:             hours_worked: e.hours_worked,
 76:             hourly_rate: e.hourly_rate,
 77:           }))
 78:         );
 79:         if (staffError) throw staffError;
 80:       }
 81: 
 82:       // 6. Create infrastructure items
 83:       if (data.infrastructure_items.length > 0) {
 84:         const { error: infraError } = await supabase.from('infrastructure_items').insert(
 85:           data.infrastructure_items.map((item) => ({
 86:             event_id: event.id,
 87:             description: item.description,
 88:             category: item.category,
 89:             cost: item.cost,
 90:           }))
 91:         );
 92:         if (infraError) throw infraError;
 93:       }
 94: 
 95:       return event;
 96:     },
 97:     onSuccess: () => {
 98:       qc.invalidateQueries({ queryKey: ['events'] });
 99:       qc.invalidateQueries({ queryKey: ['dashboard'] });
100:       qc.invalidateQueries({ queryKey: ['reports'] });
101:       qc.invalidateQueries({ queryKey: ['companies'] });
102:       qc.invalidateQueries({ queryKey: ['units'] });
103:     },
104:   });
105: }
106: 
107: // Fields on the event row itself that are safe to optimistically merge into
108: // cached lists without recomputing derived data.
109: const EVENT_ROW_FIELDS = [
110:   'name', 'date', 'end_date', 'location', 'description', 'application_date',
111:   'status', 'notes', 'company_id', 'overnight_stay', 'documents_uploaded', 'application_url',
112: ] as const;
113: 
114: function pickEventRowFields(data: EventFormValues): Record<string, unknown> {
115:   const out: Record<string, unknown> = {};
116:   for (const key of EVENT_ROW_FIELDS) {
117:     if (key in data) out[key] = (data as any)[key];
118:   }
119:   return out;
120: }
121: 
122: export function useUpdateEvent() {
123:   const qc = useQueryClient();
124:   return useMutation({
125:     onMutate: async ({ id, data }: { id: string; data: EventFormValues }) => {
126:       await qc.cancelQueries({ queryKey: ['events'] });
127:       const patch = pickEventRowFields(data);
128:       const snapshots = qc.getQueriesData<any>({ queryKey: ['events'] });
129:       snapshots.forEach(([key, value]) => {
130:         if (Array.isArray(value)) {
131:           qc.setQueryData(key, value.map((e: any) => (e?.id === id ? { ...e, ...patch } : e)));
132:         } else if (value && typeof value === 'object' && value.id === id) {
133:           qc.setQueryData(key, { ...value, ...patch });
134:         }
135:       });
136:       return { snapshots };
137:     },
138:     onError: (_err, _vars, context) => {
139:       context?.snapshots?.forEach(([key, value]) => {
140:         qc.setQueryData(key, value);
141:       });
142:     },
143:     mutationFn: async ({ id, data }: { id: string; data: EventFormValues }) => {
144:       // 1. Update event
145:       const { error: eventError } = await supabase
146:         .from('events')
147:         .update({
148:           name: data.name,
149:           date: data.date,
150:           end_date: data.end_date || null,
151:           location: data.location,
152:           description: data.description || null,
153:           application_date: data.application_date || null,
154:           status: data.status,
155:           notes: data.notes || null,
156:           company_id: data.company_id || null,
157:           overnight_stay: data.overnight_stay ?? false,
158:           documents_uploaded: data.documents_uploaded ?? false,
159:           application_url: data.application_url || null,
160:           url_changed: false,
161:         })
162:         .eq('id', id);
163:       if (eventError) throw eventError;
164: 
165:       const staffingTotal =
166:         data.staffing_entries.length > 0
167:           ? calcStaffingTotal(data.staffing_entries.map((e) => ({ ...e, id: e.id ?? '', event_id: id, created_at: '', updated_at: '' })))
168:           : data.staffing_costs;
169: 
170:       const zeroRated = data.zero_rated_sales ?? 0;
171:       const standardRated = data.standard_rated_sales ?? 0;
172: 
173:       // 2. Upsert financials
174:       const { error: finError } = await supabase
175:         .from('event_financials')
176:         .upsert({
177:           event_id: id,
178:           gross_sales: (zeroRated + standardRated) || data.gross_sales || 0,
179:           zero_rated_sales: zeroRated,
180:           standard_rated_sales: standardRated,
181:           concessions_commission_pct: data.concessions_commission_pct ?? 0,
182:           pitch_fee_refund_pct: data.pitch_fee_refund_pct ?? 0,
183:           cost_of_goods: data.cost_of_goods,
184:           pitch_fee: data.pitch_fee,
185:           power_fee: data.power_fee ?? 0,
186:           travel_costs: data.travel_costs,
187:           camping_costs: data.camping_costs ?? 0,
188:           equipment_costs: data.equipment_costs,
189:           other_costs: data.other_costs,
190:           staffing_costs: staffingTotal,
191:           fresh_milk_litres: data.fresh_milk_litres ?? 0,
192:           alt_milk_litres: data.alt_milk_litres ?? 0,
193:         }, { onConflict: 'event_id' });
194:       if (finError) throw finError;
195: 
196:       // 3. Replace unit assignments
197:       await supabase.from('event_units').delete().eq('event_id', id);
198:       if (data.unit_ids.length > 0) {
199:         const { error: unitError } = await supabase.from('event_units').insert(
200:           data.unit_ids.map((uid) => ({ event_id: id, unit_id: uid }))
201:         );
202:         if (unitError) throw unitError;
203:       }
204: 
205:       // 4. Replace staffing entries
206:       await supabase.from('staffing_entries').delete().eq('event_id', id);
207:       if (data.staffing_entries.length > 0) {
208:         const { error: staffError } = await supabase.from('staffing_entries').insert(
209:           data.staffing_entries.map((e) => ({
210:             event_id: id, staff_name: e.staff_name, hours_worked: e.hours_worked, hourly_rate: e.hourly_rate,
211:           }))
212:         );
213:         if (staffError) throw staffError;
214:       }
215: 
216:       // 5. Replace infrastructure items
217:       await supabase.from('infrastructure_items').delete().eq('event_id', id);
218:       if (data.infrastructure_items.length > 0) {
219:         const { error: infraError } = await supabase.from('infrastructure_items').insert(
220:           data.infrastructure_items.map((item) => ({
221:             event_id: id, description: item.description, category: item.category, cost: item.cost,
222:           }))
223:         );
224:         if (infraError) throw infraError;
225:       }
226:     },
227:     onSuccess: (_, { id }) => {
228:       qc.invalidateQueries({ queryKey: ['events'] });
229:       qc.invalidateQueries({ queryKey: ['events', id] });
230:       qc.invalidateQueries({ queryKey: ['dashboard'] });
231:       qc.invalidateQueries({ queryKey: ['reports'] });
232:       qc.invalidateQueries({ queryKey: ['companies'] });
233:       qc.invalidateQueries({ queryKey: ['units'] });
234:     },
235:   });
236: }
````

## File: lib/mutations/units.ts
````typescript
 1: import { useMutation, useQueryClient } from '@tanstack/react-query';
 2: import { supabase } from '@/lib/supabase';
 3: import type { UnitFormValues } from '@/lib/validations/unit.schema';
 4: 
 5: export function useCreateUnit() {
 6:   const qc = useQueryClient();
 7:   return useMutation({
 8:     mutationFn: async ({ data, userId }: { data: UnitFormValues; userId: string }) => {
 9:       const { data: unit, error } = await supabase
10:         .from('units')
11:         .insert({
12:           user_id: userId,
13:           name: data.name,
14:           registration: data.registration || null,
15:           notes: data.notes || null,
16:           status: data.status ?? 'active',
17:           vehicle_type: data.vehicle_type || null,
18:           height_m: data.height_m ?? null,
19:           length_m: data.length_m ?? null,
20:           width_m: data.width_m ?? null,
21:           mot_date: data.mot_date || null,
22:           tax_date: data.tax_date || null,
23:           service_date: data.service_date || null,
24:           service_interval: data.service_interval || '1year',
25:         })
26:         .select()
27:         .single();
28:       if (error) throw error;
29:       return unit;
30:     },
31:     onSuccess: () => {
32:       qc.invalidateQueries({ queryKey: ['units'] });
33:       qc.invalidateQueries({ queryKey: ['dashboard'] });
34:     },
35:   });
36: }
37: 
38: export function useUpdateUnit() {
39:   const qc = useQueryClient();
40:   return useMutation({
41:     mutationFn: async ({ id, data }: { id: string; data: UnitFormValues }) => {
42:       const { error } = await supabase
43:         .from('units')
44:         .update({
45:           name: data.name,
46:           registration: data.registration || null,
47:           notes: data.notes || null,
48:           status: data.status,
49:           vehicle_type: data.vehicle_type || null,
50:           height_m: data.height_m ?? null,
51:           length_m: data.length_m ?? null,
52:           width_m: data.width_m ?? null,
53:           mot_date: data.mot_date || null,
54:           tax_date: data.tax_date || null,
55:           service_date: data.service_date || null,
56:           service_interval: data.service_interval || '1year',
57:         })
58:         .eq('id', id);
59:       if (error) throw error;
60:     },
61:     onSuccess: (_, { id }) => {
62:       qc.invalidateQueries({ queryKey: ['units'] });
63:       qc.invalidateQueries({ queryKey: ['units', id] });
64:       qc.invalidateQueries({ queryKey: ['dashboard'] });
65:     },
66:   });
67: }
````

## File: lib/queries/companies.ts
````typescript
 1: import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 2: import { supabase } from '@/lib/supabase';
 3: import { calcEventFinancials } from '@/lib/calculations';
 4: import type { CompanyWithStats, ConcessionsCompany } from '@/types';
 5: 
 6: export function useCompanies() {
 7:   return useQuery({
 8:     queryKey: ['companies'],
 9:     queryFn: async () => {
10:       const { data: companies, error } = await supabase
11:         .from('concessions_companies')
12:         .select('*, events(id, status, date, end_date, company_id, event_financials(*))')
13:         .order('name');
14:       if (error) throw error;
15: 
16:       const mapped = (companies ?? []).map((company: any) => {
17:         const companyEvents = (company.events ?? []) as any[];
18:         const acceptedEvents = companyEvents.filter((e) => e.status === 'accepted');
19:         const totalRevenue = companyEvents.reduce(
20:           (sum, e) => sum + (e.event_financials?.gross_sales ?? 0),
21:           0
22:         );
23:         const totalNetProfit = companyEvents.reduce((sum, e) => {
24:           if (!e.event_financials) return sum;
25:           return sum + calcEventFinancials(e.event_financials).netProfit;
26:         }, 0);
27:         const sortedDates = companyEvents.map((e) => e.date).sort().reverse();
28: 
29:         const today = new Date().toISOString().split('T')[0];
30:         const completedAccepted = companyEvents.filter((e) => {
31:           const eventEnd = e.end_date ?? e.date;
32:           return e.status === 'accepted' && eventEnd <= today && e.event_financials;
33:         });
34:         const margins = completedAccepted.map((e) => {
35:           const calc = calcEventFinancials(e.event_financials!);
36:           return calc.totalNetSales > 0 ? (calc.netProfit / calc.totalNetSales) * 100 : 0;
37:         });
38:         const avgProfitMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : null;
39:         const completedEventCount = completedAccepted.length;
40: 
41:         // Strip embedded events from the returned object to keep CompanyWithStats clean
42:         const { events: _embedded, ...companyBase } = company;
43:         return {
44:           ...companyBase,
45:           totalEvents: companyEvents.length,
46:           acceptedEvents: acceptedEvents.length,
47:           totalRevenue,
48:           totalNetProfit,
49:           lastEventDate: sortedDates[0] ?? null,
50:           avgProfitMargin,
51:           completedEventCount,
52:         } as CompanyWithStats;
53:       });
54: 
55:       return mapped.sort((a, b) => {
56:         if (a.avgProfitMargin !== null && b.avgProfitMargin !== null) {
57:           return b.avgProfitMargin - a.avgProfitMargin;
58:         }
59:         if (a.avgProfitMargin !== null) return -1;
60:         if (b.avgProfitMargin !== null) return 1;
61:         return 0;
62:       });
63:     },
64:   });
65: }
66: 
67: export function useCompany(id: string) {
68:   return useQuery({
69:     queryKey: ['companies', id],
70:     queryFn: async () => {
71:       const { data, error } = await supabase
72:         .from('concessions_companies')
73:         .select('*')
74:         .eq('id', id)
75:         .single();
76:       if (error) throw error;
77:       return data as ConcessionsCompany;
78:     },
79:     enabled: !!id,
80:   });
81: }
82: 
83: export function useDeleteCompany() {
84:   const qc = useQueryClient();
85:   return useMutation({
86:     mutationFn: async (id: string) => {
87:       const { error } = await supabase.from('concessions_companies').delete().eq('id', id);
88:       if (error) throw error;
89:     },
90:     onSuccess: () => {
91:       qc.invalidateQueries({ queryKey: ['companies'] });
92:       qc.invalidateQueries({ queryKey: ['events'] });
93:     },
94:   });
95: }
````

## File: lib/queries/dashboard.ts
````typescript
  1: import { useQuery } from '@tanstack/react-query';
  2: import { supabase } from '@/lib/supabase';
  3: import { calcEventFinancials } from '@/lib/calculations';
  4: import { formatMonthLabel } from '@/lib/formatters';
  5: import { EMPTY_CALCULATIONS } from '@/types';
  6: import type { DashboardStats, MonthlyRevenue, StatusCount, ApplicationStatus, UnitWithStatus, EventWithFinancials } from '@/types';
  7: 
  8: export function useDashboard(year?: number) {
  9:   const targetYear = year ?? new Date().getFullYear();
 10:   return useQuery({
 11:     queryKey: ['dashboard', targetYear],
 12:     queryFn: async (): Promise<DashboardStats> => {
 13:       const [eventsRes, unitsRes] = await Promise.all([
 14:         supabase.from('events').select('*, event_financials(*), concessions_companies(*), event_units(units(*))').order('date', { ascending: false }),
 15:         supabase.from('units').select('*').order('name'),
 16:       ]);
 17:       if (eventsRes.error) throw eventsRes.error;
 18: 
 19:       const allEventsRaw = eventsRes.data ?? [];
 20:       const allUnits = unitsRes.data ?? [];
 21: 
 22:       // Normalise: events↔units is many-to-many via event_units
 23:       const allEvents = allEventsRaw.map((e: any) => ({
 24:         ...e,
 25:         units: (e.event_units ?? []).map((eu: any) => eu.units).filter(Boolean),
 26:       }));
 27: 
 28:       const ytdEvents = allEvents.filter((e) => e.date.startsWith(`${targetYear}`));
 29: 
 30:       const grossSalesYtd = ytdEvents.reduce((sum, e) => {
 31:         const calc = e.event_financials ? calcEventFinancials(e.event_financials) : null;
 32:         return sum + (calc?.totalNetSales ?? e.event_financials?.gross_sales ?? 0);
 33:       }, 0);
 34: 
 35:       const netProfitYtd = ytdEvents.reduce((sum, e) => {
 36:         if (!e.event_financials) return sum;
 37:         return sum + calcEventFinancials(e.event_financials).netProfit;
 38:       }, 0);
 39: 
 40:       const acceptedYtd = ytdEvents.filter((e) => e.status === 'accepted').length;
 41:       const decidedYtd = ytdEvents.filter((e) => e.status === 'accepted' || e.status === 'rejected').length;
 42:       const acceptanceRate = decidedYtd > 0 ? (acceptedYtd / decidedYtd) * 100 : 0;
 43:       const eventsWithSales = ytdEvents.filter((e) => (e.event_financials?.gross_sales ?? 0) > 0);
 44:       const avgRevenuePerEvent = eventsWithSales.length > 0 ? grossSalesYtd / eventsWithSales.length : 0;
 45: 
 46:       // Milk totals YTD (accepted events only)
 47:       const acceptedYtdEvents = ytdEvents.filter((e) => e.status === 'accepted');
 48:       const totalFreshMilkLitres = acceptedYtdEvents.reduce((sum, e) => sum + (e.event_financials?.fresh_milk_litres ?? 0), 0);
 49:       const totalAltMilkLitres = acceptedYtdEvents.reduce((sum, e) => sum + (e.event_financials?.alt_milk_litres ?? 0), 0);
 50: 
 51:       // Upcoming events
 52:       const today = new Date().toISOString().split('T')[0];
 53:       const upcomingEvents = (allEvents
 54:         .filter((e) => e.date >= today && e.status === 'accepted')
 55:         .sort((a, b) => a.date.localeCompare(b.date))
 56:         .slice(0, 5)
 57:         .map((e) => ({
 58:           ...e,
 59:           calculations: e.event_financials ? calcEventFinancials(e.event_financials) : EMPTY_CALCULATIONS,
 60:         })) as any) as EventWithFinancials[];
 61: 
 62:       // Monthly revenue
 63:       const monthlyMap = new Map<number, MonthlyRevenue>();
 64:       for (let m = 1; m <= 12; m++) {
 65:         monthlyMap.set(m, { month: formatMonthLabel(m, targetYear), grossSales: 0, netProfit: 0 });
 66:       }
 67:       ytdEvents.forEach((e) => {
 68:         const month = parseInt(e.date.split('-')[1], 10);
 69:         const entry = monthlyMap.get(month)!;
 70:         if (e.event_financials) {
 71:           const calc = calcEventFinancials(e.event_financials);
 72:           entry.grossSales += calc.totalNetSales;
 73:           entry.netProfit += calc.netProfit;
 74:         }
 75:       });
 76: 
 77:       // Status breakdown
 78:       const statusMap = new Map<ApplicationStatus, number>();
 79:       allEvents.forEach((e) => {
 80:         statusMap.set(e.status as ApplicationStatus, (statusMap.get(e.status as ApplicationStatus) ?? 0) + 1);
 81:       });
 82:       const statusBreakdown: StatusCount[] = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));
 83: 
 84:       // Unit statuses — map each unit to its current/next accepted event.
 85:       // events↔units is many-to-many via event_units, so filter by membership, not a direct FK.
 86:       const unitStatuses: UnitWithStatus[] = allUnits.map((unit) => {
 87:         const unitEvent = allEvents
 88:           .filter((e) =>
 89:             e.status === 'accepted' &&
 90:             e.date >= today &&
 91:             (e.units as any[]).some((u: any) => u?.id === unit.id),
 92:           )
 93:           .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
 94:         return {
 95:           ...unit,
 96:           currentEvent: unitEvent
 97:             ? ({ ...unitEvent, calculations: unitEvent.event_financials ? calcEventFinancials(unitEvent.event_financials) : EMPTY_CALCULATIONS } as any as EventWithFinancials)
 98:             : null,
 99:         };
100:       });
101: 
102:       // Committed fees: accepted upcoming events with pitch/power fees already paid
103:       const todayStr = new Date().toISOString().split('T')[0];
104:       const committedFeeEvents = allEvents.filter((e) => {
105:         const eventEnd = e.end_date ?? e.date;
106:         return e.status === 'accepted' && eventEnd > todayStr && (e.event_financials?.pitch_fee ?? 0) + (e.event_financials?.power_fee ?? 0) > 0;
107:       });
108:       const committedFees = committedFeeEvents.reduce((sum, e) => {
109:         return sum + (e.event_financials?.pitch_fee ?? 0) + (e.event_financials?.power_fee ?? 0);
110:       }, 0);
111:       const upcomingCommitments = committedFeeEvents
112:         .sort((a, b) => a.date.localeCompare(b.date))
113:         .map((e) => ({
114:           id: e.id,
115:           name: e.name,
116:           date: e.date,
117:           end_date: e.end_date,
118:           location: e.location,
119:           committedFee: (e.event_financials?.pitch_fee ?? 0) + (e.event_financials?.power_fee ?? 0),
120:         }));
121: 
122:       return {
123:         totalEventsYtd: ytdEvents.length,
124:         grossSalesYtd,
125:         netProfitYtd,
126:         acceptanceRate,
127:         avgRevenuePerEvent,
128:         upcomingEvents,
129:         monthlyRevenue: Array.from(monthlyMap.values()),
130:         statusBreakdown,
131:         totalFreshMilkLitres,
132:         totalAltMilkLitres,
133:         unitStatuses,
134:         committedFees,
135:         upcomingCommitments,
136:       };
137:     },
138:   });
139: }
````

## File: lib/queries/discover.ts
````typescript
 1: import { useQuery } from '@tanstack/react-query';
 2: import { supabase } from '@/lib/supabase';
 3: import type { DiscoveredEvent } from '@/types';
 4: 
 5: export interface DiscoverFilters {
 6:   query?: string;
 7:   region?: string;
 8:   category?: string;
 9: }
10: 
11: const COMPANY_CATEGORIES = ['Concessions Company', 'Industry Body'];
12: 
13: export function useDiscoverEvents(filters: DiscoverFilters) {
14:   return useQuery({
15:     queryKey: ['discover', filters],
16:     queryFn: async (): Promise<DiscoveredEvent[]> => {
17:       let query = supabase
18:         .from('uk_events_directory')
19:         .select('*')
20:         .order('featured', { ascending: false })
21:         .order('created_at', { ascending: true });
22: 
23:       if (filters.region && filters.region !== 'All UK') {
24:         query = query.eq('region', filters.region);
25:       }
26:       if (filters.category && filters.category !== 'All') {
27:         query = query.eq('category', filters.category);
28:       }
29:       if (filters.query) {
30:         query = query.or(
31:           `name.ilike.%${filters.query}%,description.ilike.%${filters.query}%,organiser.ilike.%${filters.query}%,location.ilike.%${filters.query}%`
32:         );
33:       }
34: 
35:       const { data, error } = await query;
36:       if (error) throw error;
37: 
38:       return (data ?? []).map((row) => ({
39:         id: row.id,
40:         title: row.name,
41:         description: row.description ?? '',
42:         url: row.application_url ?? row.website ?? '',
43:         source: row.organiser ?? row.source ?? 'UK Events Directory',
44:         location: row.location,
45:         dateHint: row.typical_dates ?? (row.next_date ?? null),
46:         category: row.category ?? 'Event',
47:         region: row.region,
48:         organiser: row.organiser,
49:         estimatedFootfall: row.estimated_footfall,
50:         pitchFeeRange: row.pitch_fee_range,
51:         featured: row.featured ?? false,
52:         eventsManaged: row.events_managed ?? null,
53:         contactPhone: row.contact_phone ?? null,
54:         contactEmail: row.contact_email ?? null,
55:         lastVerifiedAt: row.last_verified_at ?? null,
56:         applicationChanged: row.application_changed ?? false,
57:         isCompany: COMPANY_CATEGORIES.includes(row.category ?? ''),
58:       }));
59:     },
60:     staleTime: 1000 * 60 * 5, // 5 minutes
61:   });
62: }
````

## File: lib/queries/events.ts
````typescript
 1: import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 2: import { supabase } from '@/lib/supabase';
 3: import { calcEventFinancials } from '@/lib/calculations';
 4: import { EMPTY_CALCULATIONS } from '@/types';
 5: import type { EventWithFinancials, EventDetail, ApplicationStatus } from '@/types';
 6: 
 7: export interface EventFilters {
 8:   status?: ApplicationStatus | 'all';
 9:   year?: number;
10:   companyId?: string;
11:   unitId?: string;
12: }
13: 
14: export function useEvents(filters?: EventFilters) {
15:   return useQuery({
16:     queryKey: ['events', filters],
17:     queryFn: async () => {
18:       let query = supabase
19:         .from('events')
20:         .select('*, event_financials(*), concessions_companies(*), event_units(units(*))')
21:         .order('date', { ascending: false });
22: 
23:       if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
24:       if (filters?.year) query = query.gte('date', `${filters.year}-01-01`).lte('date', `${filters.year}-12-31`);
25:       if (filters?.companyId) query = query.eq('company_id', filters.companyId);
26: 
27:       const { data, error } = await query;
28:       if (error) throw error;
29: 
30:       let mapped = (data ?? []).map((event) => ({
31:         ...event,
32:         units: (event.event_units ?? []).map((eu: any) => eu.units).filter(Boolean),
33:         calculations: event.event_financials
34:           ? calcEventFinancials(event.event_financials)
35:           : EMPTY_CALCULATIONS,
36:       })) as EventWithFinancials[];
37: 
38:       // events↔units is many-to-many via event_units; filter client-side after mapping
39:       if (filters?.unitId) {
40:         mapped = mapped.filter((e) => e.units.some((u: any) => u.id === filters.unitId));
41:       }
42: 
43:       return mapped;
44:     },
45:   });
46: }
47: 
48: export function useEvent(id: string) {
49:   return useQuery({
50:     queryKey: ['events', id],
51:     queryFn: async () => {
52:       const { data, error } = await supabase
53:         .from('events')
54:         .select('*, event_financials(*), concessions_companies(*), event_units(units(*)), staffing_entries(*), infrastructure_items(*)')
55:         .eq('id', id)
56:         .single();
57: 
58:       if (error) throw error;
59: 
60:       const staffing = data.staffing_entries ?? [];
61:       return {
62:         ...data,
63:         units: (data.event_units ?? []).map((eu: any) => eu.units).filter(Boolean),
64:         calculations: data.event_financials
65:           ? calcEventFinancials(data.event_financials, staffing)
66:           : EMPTY_CALCULATIONS,
67:       } as EventDetail;
68:     },
69:     enabled: !!id,
70:   });
71: }
72: 
73: export function useDeleteEvent() {
74:   const qc = useQueryClient();
75:   return useMutation({
76:     mutationFn: async (id: string) => {
77:       const { error } = await supabase.from('events').delete().eq('id', id);
78:       if (error) throw error;
79:     },
80:     onSuccess: () => {
81:       qc.invalidateQueries({ queryKey: ['events'] });
82:       qc.invalidateQueries({ queryKey: ['dashboard'] });
83:       qc.invalidateQueries({ queryKey: ['reports'] });
84:       qc.invalidateQueries({ queryKey: ['units'] });
85:     },
86:   });
87: }
````

## File: lib/queries/profile.ts
````typescript
 1: import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 2: import { supabase } from '@/lib/supabase';
 3: 
 4: export interface Metric {
 5:   id: string;
 6:   name: string;
 7:   unit: string;
 8:   enabled: boolean;
 9:   builtin?: boolean;
10: }
11: 
12: export interface UserProfile {
13:   id: string;
14:   business_name: string | null;
15:   business_type: string;
16:   currency: string;
17:   custom_metrics: Metric[];
18: }
19: 
20: export function useProfile(userId: string | undefined) {
21:   return useQuery({
22:     queryKey: ['profile', userId],
23:     queryFn: async (): Promise<UserProfile | null> => {
24:       if (!userId) return null;
25:       const { data, error } = await supabase
26:         .from('profiles')
27:         .select('id, business_name, business_type, currency, custom_metrics')
28:         .eq('id', userId)
29:         .single();
30:       if (error) return null;
31:       return {
32:         ...data,
33:         business_type: data.business_type ?? 'Coffee',
34:         currency: data.currency ?? 'GBP',
35:         custom_metrics: data.custom_metrics ?? [],
36:       };
37:     },
38:     enabled: !!userId,
39:   });
40: }
41: 
42: export function useUpdateProfile() {
43:   const qc = useQueryClient();
44:   return useMutation({
45:     mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<Omit<UserProfile, 'id'>> }) => {
46:       const { error } = await supabase.from('profiles').upsert({ id: userId, ...updates });
47:       if (error) throw error;
48:     },
49:     onSuccess: (_, { userId }) => {
50:       qc.invalidateQueries({ queryKey: ['profile', userId] });
51:     },
52:   });
53: }
````

## File: lib/queries/reports.ts
````typescript
  1: import { useQuery } from '@tanstack/react-query';
  2: import { supabase } from '@/lib/supabase';
  3: import { calcEventFinancials } from '@/lib/calculations';
  4: import { formatMonthLabel } from '@/lib/formatters';
  5: import { EMPTY_CALCULATIONS } from '@/types';
  6: import type { ReportData, MonthlyBreakdown, CompanyPerformance, ApplicationStatus } from '@/types';
  7: 
  8: export function useReports(year: number) {
  9:   return useQuery({
 10:     queryKey: ['reports', year],
 11:     queryFn: async (): Promise<ReportData> => {
 12:       const { data: events, error } = await supabase
 13:         .from('events')
 14:         .select('*, event_financials(*), concessions_companies(*)')
 15:         .gte('date', `${year}-01-01`)
 16:         .lte('date', `${year}-12-31`)
 17:         .order('date');
 18:       if (error) throw error;
 19: 
 20:       const { data: companies, error: cError } = await supabase
 21:         .from('concessions_companies')
 22:         .select('*');
 23:       if (cError) throw cError;
 24: 
 25:       const allEvents = events ?? [];
 26:       const allCompanies = companies ?? [];
 27: 
 28:       const totalGross = allEvents.reduce((s, e) => s + (e.event_financials?.gross_sales ?? 0), 0);
 29:       const totalNet = allEvents.reduce((s, e) => {
 30:         if (!e.event_financials) return s;
 31:         return s + calcEventFinancials(e.event_financials).netProfit;
 32:       }, 0);
 33:       const avgMargin = totalGross > 0 ? (totalNet / totalGross) * 100 : 0;
 34: 
 35:       const monthlyMap = new Map<number, MonthlyBreakdown>();
 36:       for (let m = 1; m <= 12; m++) {
 37:         monthlyMap.set(m, {
 38:           month: m,
 39:           monthLabel: formatMonthLabel(m, year),
 40:           eventCount: 0,
 41:           grossSales: 0,
 42:           totalCosts: 0,
 43:           netProfit: 0,
 44:           profitMargin: 0,
 45:         });
 46:       }
 47:       allEvents.forEach((e) => {
 48:         const month = parseInt(e.date.split('-')[1], 10);
 49:         const entry = monthlyMap.get(month)!;
 50:         entry.eventCount += 1;
 51:         entry.grossSales += e.event_financials?.gross_sales ?? 0;
 52:         if (e.event_financials) {
 53:           const calc = calcEventFinancials(e.event_financials);
 54:           entry.totalCosts += calc.totalCosts;
 55:           entry.netProfit += calc.netProfit;
 56:         }
 57:       });
 58:       monthlyMap.forEach((entry) => {
 59:         entry.profitMargin = entry.grossSales > 0 ? (entry.netProfit / entry.grossSales) * 100 : 0;
 60:       });
 61: 
 62:       const totalFreshMilkLitres = allEvents.reduce((s, e) => s + (e.event_financials?.fresh_milk_litres ?? 0), 0);
 63:       const totalAltMilkLitres = allEvents.reduce((s, e) => s + (e.event_financials?.alt_milk_litres ?? 0), 0);
 64: 
 65:       const topEvents = [...allEvents]
 66:         .filter((e) => e.event_financials)
 67:         .sort(
 68:           (a, b) =>
 69:             calcEventFinancials(b.event_financials!).netProfit -
 70:             calcEventFinancials(a.event_financials!).netProfit
 71:         )
 72:         .slice(0, 10)
 73:         .map((e) => ({
 74:           ...e,
 75:           calculations: calcEventFinancials(e.event_financials!),
 76:         }));
 77: 
 78:       const companyPerformance: CompanyPerformance[] = allCompanies.map((company) => {
 79:         const companyEvents = allEvents.filter((e) => e.company_id === company.id);
 80:         const accepted = companyEvents.filter((e) => e.status === 'accepted').length;
 81:         const decided = companyEvents.filter(
 82:           (e) => e.status === 'accepted' || e.status === 'rejected'
 83:         ).length;
 84:         return {
 85:           company,
 86:           totalEvents: companyEvents.length,
 87:           acceptedEvents: accepted,
 88:           totalRevenue: companyEvents.reduce((s, e) => s + (e.event_financials?.gross_sales ?? 0), 0),
 89:           acceptanceRate: decided > 0 ? (accepted / decided) * 100 : 0,
 90:         };
 91:       }).filter((cp) => cp.totalEvents > 0);
 92: 
 93:       return {
 94:         year,
 95:         totalGross,
 96:         totalNet,
 97:         totalEvents: allEvents.length,
 98:         avgMargin,
 99:         totalFreshMilkLitres,
100:         totalAltMilkLitres,
101:         monthly: Array.from(monthlyMap.values()),
102:         topEvents,
103:         companyPerformance,
104:       };
105:     },
106:   });
107: }
````

## File: lib/queries/units.ts
````typescript
 1: import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 2: import { supabase } from '@/lib/supabase';
 3: import type { Unit } from '@/types';
 4: 
 5: export function useUnits() {
 6:   return useQuery({
 7:     queryKey: ['units'],
 8:     queryFn: async (): Promise<Unit[]> => {
 9:       const { data, error } = await supabase
10:         .from('units')
11:         .select('*')
12:         .order('name');
13:       if (error) throw error;
14:       return data ?? [];
15:     },
16:   });
17: }
18: 
19: export function useUnit(id: string) {
20:   return useQuery({
21:     queryKey: ['units', id],
22:     queryFn: async (): Promise<Unit> => {
23:       const { data, error } = await supabase
24:         .from('units')
25:         .select('*')
26:         .eq('id', id)
27:         .single();
28:       if (error) throw error;
29:       return data;
30:     },
31:     enabled: !!id,
32:   });
33: }
34: 
35: export function useDeleteUnit() {
36:   const qc = useQueryClient();
37:   return useMutation({
38:     mutationFn: async (id: string) => {
39:       const { error } = await supabase.from('units').delete().eq('id', id);
40:       if (error) throw error;
41:     },
42:     onSuccess: () => {
43:       qc.invalidateQueries({ queryKey: ['units'] });
44:       qc.invalidateQueries({ queryKey: ['dashboard'] });
45:     },
46:   });
47: }
````

## File: lib/validations/company.schema.ts
````typescript
 1: import { z } from 'zod';
 2: 
 3: export const companySchema = z.object({
 4:   name: z.string().min(2, 'Company name must be at least 2 characters'),
 5:   contact_name: z.string().optional(),
 6:   email: z.string().email('Invalid email').optional().or(z.literal('')),
 7:   phone: z.string().optional(),
 8:   website: z.string().url('Invalid URL').optional().or(z.literal('')),
 9:   notes: z.string().optional(),
10: });
11: 
12: export type CompanyFormValues = z.infer<typeof companySchema>;
````

## File: lib/validations/event.schema.ts
````typescript
 1: import { z } from 'zod';
 2: 
 3: const staffingEntrySchema = z.object({
 4:   id: z.string().optional(),
 5:   staff_name: z.string().min(1, 'Name required'),
 6:   hours_worked: z.coerce.number().min(0),
 7:   hourly_rate: z.coerce.number().min(0),
 8: });
 9: 
10: const infrastructureItemSchema = z.object({
11:   id: z.string().optional(),
12:   description: z.string().min(1, 'Description required'),
13:   category: z.enum(['pitch_fee', 'travel', 'equipment', 'supplies', 'other'] as const),
14:   cost: z.coerce.number().min(0),
15: });
16: 
17: export const eventSchema = z.object({
18:   // Core details
19:   name: z.string().min(2, 'Event name must be at least 2 characters'),
20:   date: z.string().min(1, 'Date is required'),
21:   end_date: z.string().optional(),
22:   location: z.string().min(2, 'Location is required'),
23:   description: z.string().optional(),
24:   application_date: z.string().optional(),
25:   status: z.enum(['pending', 'accepted', 'rejected', 'waitlisted', 'withdrawn'] as const),
26:   notes: z.string().optional(),
27:   company_id: z.string().optional(),
28:   unit_ids: z.array(z.string()).default([]),
29:   application_url: z.string().optional(),
30:   overnight_stay: z.boolean().default(false),
31:   documents_uploaded: z.boolean().default(false),
32: 
33:   // Sales & VAT
34:   gross_sales: z.coerce.number().min(0),
35:   zero_rated_sales: z.coerce.number().min(0),
36:   standard_rated_sales: z.coerce.number().min(0),
37:   concessions_commission_pct: z.coerce.number().min(0).max(100),
38:   pitch_fee_refund_pct: z.coerce.number().min(0).max(100),
39: 
40:   // Costs
41:   cost_of_goods: z.coerce.number().min(0),
42:   pitch_fee: z.coerce.number().min(0),
43:   power_fee: z.coerce.number().min(0),
44:   travel_costs: z.coerce.number().min(0),
45:   camping_costs: z.coerce.number().min(0),
46:   equipment_costs: z.coerce.number().min(0),
47:   other_costs: z.coerce.number().min(0),
48:   staffing_costs: z.coerce.number().min(0),
49: 
50:   // Milk / consumables
51:   fresh_milk_litres: z.coerce.number().min(0),
52:   alt_milk_litres: z.coerce.number().min(0),
53: 
54:   // Arrays
55:   staffing_entries: z.array(staffingEntrySchema).default([]),
56:   infrastructure_items: z.array(infrastructureItemSchema).default([]),
57: });
58: 
59: export type EventFormValues = z.infer<typeof eventSchema>;
````

## File: lib/validations/unit.schema.ts
````typescript
 1: import { z } from 'zod';
 2: 
 3: export const unitSchema = z.object({
 4:   name: z.string().min(1, 'Unit name is required'),
 5:   registration: z.string().optional(),
 6:   notes: z.string().optional(),
 7:   status: z.enum(['active', 'maintenance', 'retired'] as const).default('active'),
 8:   vehicle_type: z.string().optional(),
 9:   height_m: z.number().nullable().optional(),
10:   length_m: z.number().nullable().optional(),
11:   width_m: z.number().nullable().optional(),
12:   mot_date: z.string().optional(),
13:   tax_date: z.string().optional(),
14:   service_date: z.string().optional(),
15:   service_interval: z.enum(['6months', '1year']).default('1year'),
16: });
17: 
18: export type UnitFormValues = z.infer<typeof unitSchema>;
````

## File: lib/auth.tsx
````typescript
 1: import React, { createContext, useContext, useEffect, useState } from 'react';
 2: import { Session, User } from '@supabase/supabase-js';
 3: import { supabase } from '@/lib/supabase';
 4: 
 5: interface AuthContextValue {
 6:   session: Session | null;
 7:   user: User | null;
 8:   loading: boolean;
 9:   signOut: () => Promise<void>;
10: }
11: 
12: const AuthContext = createContext<AuthContextValue>({
13:   session: null,
14:   user: null,
15:   loading: true,
16:   signOut: async () => {},
17: });
18: 
19: export function AuthProvider({ children }: { children: React.ReactNode }) {
20:   const [session, setSession] = useState<Session | null>(null);
21:   const [loading, setLoading] = useState(true);
22: 
23:   useEffect(() => {
24:     supabase.auth.getSession().then(({ data }) => {
25:       setSession(data.session);
26:       setLoading(false);
27:     });
28: 
29:     const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
30:       setSession(session);
31:     });
32: 
33:     return () => subscription.unsubscribe();
34:   }, []);
35: 
36:   const signOut = async () => {
37:     await supabase.auth.signOut();
38:   };
39: 
40:   return (
41:     <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
42:       {children}
43:     </AuthContext.Provider>
44:   );
45: }
46: 
47: export function useAuth() {
48:   return useContext(AuthContext);
49: }
````

## File: lib/calculations.ts
````typescript
  1: import type { EventFinancials, StaffingEntry, EventCalculations, EMPTY_CALCULATIONS } from '@/types';
  2: 
  3: export function calcStaffingTotal(entries: StaffingEntry[]): number {
  4:   return entries.reduce((sum, e) => sum + e.hours_worked * e.hourly_rate, 0);
  5: }
  6: 
  7: /**
  8:  * Full P&L calculation supporting:
  9:  *  - VAT breakdown (hot drinks/food at 20%, cold drinks at 0%)
 10:  *  - Concessions company commission on net (ex-VAT) sales
 11:  *  - Pitch fee with % refund; commission deducted from refund before payout
 12:  *  - Power fee, camping costs as additional event costs
 13:  *
 14:  * effectivePitchFee = pitch_fee - refundGross + commissionAmount
 15:  */
 16: export function calcEventFinancials(
 17:   f: EventFinancials,
 18:   staffing?: StaffingEntry[],
 19: ): EventCalculations {
 20:   const totalStaffingCost =
 21:     staffing && staffing.length > 0
 22:       ? calcStaffingTotal(staffing)
 23:       : (f.staffing_costs ?? 0);
 24: 
 25:   // --- VAT breakdown ---
 26:   const zeroRated = f.zero_rated_sales ?? 0;
 27:   const standardRated = f.standard_rated_sales ?? 0;
 28:   const hasVatBreakdown = zeroRated > 0 || standardRated > 0;
 29: 
 30:   const standardRatedNet = standardRated / 1.2;
 31:   const vatCollected = standardRated - standardRatedNet;
 32:   const totalNetSales = hasVatBreakdown ? zeroRated + standardRatedNet : (f.gross_sales ?? 0);
 33: 
 34:   // --- Commission & pitch fee settlement ---
 35:   const commissionPct = f.concessions_commission_pct ?? 0;
 36:   const refundPct = f.pitch_fee_refund_pct ?? 0;
 37:   const pitchFee = f.pitch_fee ?? 0;
 38: 
 39:   const commissionAmount = totalNetSales * (commissionPct / 100);
 40:   const pitchFeeRefundGross = pitchFee * (refundPct / 100);
 41:   const netRefund = pitchFeeRefundGross - commissionAmount;
 42:   const effectivePitchFee = pitchFee - pitchFeeRefundGross + commissionAmount;
 43: 
 44:   // --- P&L ---
 45:   const grossProfit = totalNetSales - (f.cost_of_goods ?? 0);
 46: 
 47:   const totalCosts =
 48:     (f.cost_of_goods ?? 0) +
 49:     totalStaffingCost +
 50:     effectivePitchFee +
 51:     (f.power_fee ?? 0) +
 52:     (f.travel_costs ?? 0) +
 53:     (f.camping_costs ?? 0) +
 54:     (f.equipment_costs ?? 0) +
 55:     (f.other_costs ?? 0);
 56: 
 57:   const netProfit = totalNetSales - totalCosts;
 58:   const profitMargin = totalNetSales === 0 ? 0 : (netProfit / totalNetSales) * 100;
 59: 
 60:   return {
 61:     standardRatedNet,
 62:     vatCollected,
 63:     totalNetSales,
 64:     commissionAmount,
 65:     pitchFeeRefundGross,
 66:     netRefund,
 67:     effectivePitchFee,
 68:     grossProfit,
 69:     totalCosts,
 70:     netProfit,
 71:     profitMargin,
 72:     totalStaffingCost,
 73:   };
 74: }
 75: 
 76: export function calcGrossProfit(f: EventFinancials): number {
 77:   return calcEventFinancials(f).grossProfit;
 78: }
 79: export function calcTotalCosts(f: EventFinancials): number {
 80:   return calcEventFinancials(f).totalCosts;
 81: }
 82: export function calcNetProfit(f: EventFinancials): number {
 83:   return calcEventFinancials(f).netProfit;
 84: }
 85: export function calcProfitMargin(f: EventFinancials): number {
 86:   return calcEventFinancials(f).profitMargin;
 87: }
 88: 
 89: export function calcAvgRevenuePerEvent(financials: EventFinancials[]): number {
 90:   if (financials.length === 0) return 0;
 91:   return financials.reduce((sum, f) => sum + calcEventFinancials(f).totalNetSales, 0) / financials.length;
 92: }
 93: 
 94: export const emptyFinancials: Omit<EventFinancials, 'id' | 'event_id' | 'created_at' | 'updated_at'> = {
 95:   gross_sales: 0, zero_rated_sales: 0, standard_rated_sales: 0,
 96:   concessions_commission_pct: 0, pitch_fee_refund_pct: 0,
 97:   cost_of_goods: 0, pitch_fee: 0, power_fee: 0,
 98:   travel_costs: 0, camping_costs: 0, equipment_costs: 0, other_costs: 0,
 99:   staffing_costs: 0, fresh_milk_litres: 0, alt_milk_litres: 0,
100: };
````

## File: lib/formatters.ts
````typescript
 1: import { format, parseISO, isValid } from 'date-fns';
 2: 
 3: export function formatCurrency(value: number | null | undefined): string {
 4:   const n = value == null || !Number.isFinite(value) ? 0 : value;
 5:   return new Intl.NumberFormat('en-GB', {
 6:     style: 'currency',
 7:     currency: 'GBP',
 8:     minimumFractionDigits: 2,
 9:     maximumFractionDigits: 2,
10:   }).format(n);
11: }
12: 
13: export function formatCurrencyCompact(value: number | null | undefined): string {
14:   const n = value == null || !Number.isFinite(value) ? 0 : value;
15:   if (Math.abs(n) >= 1000) {
16:     return new Intl.NumberFormat('en-GB', {
17:       style: 'currency',
18:       currency: 'GBP',
19:       notation: 'compact',
20:       maximumFractionDigits: 1,
21:     }).format(n);
22:   }
23:   return formatCurrency(n);
24: }
25: 
26: export function formatPercent(value: number | null | undefined, decimals = 1): string {
27:   const n = value == null || !Number.isFinite(value) ? 0 : value;
28:   return `${n.toFixed(decimals)}%`;
29: }
30: 
31: export function formatDate(dateStr: string | null | undefined): string {
32:   if (!dateStr) return '';
33:   try {
34:     const date = parseISO(dateStr);
35:     if (!isValid(date)) return dateStr;
36:     return format(date, 'd MMM yyyy');
37:   } catch {
38:     return dateStr;
39:   }
40: }
41: 
42: export function formatDateShort(dateStr: string | null | undefined): string {
43:   if (!dateStr) return '';
44:   try {
45:     const date = parseISO(dateStr);
46:     if (!isValid(date)) return dateStr;
47:     return format(date, 'd MMM');
48:   } catch {
49:     return dateStr;
50:   }
51: }
52: 
53: export function formatDateRange(startStr: string | null | undefined, endStr?: string | null): string {
54:   if (!startStr) return '';
55:   const start = formatDate(startStr);
56:   if (!endStr) return start;
57:   try {
58:     const startDate = parseISO(startStr);
59:     const endDate = parseISO(endStr);
60:     if (!isValid(startDate) || !isValid(endDate)) return start;
61:     if (format(startDate, 'MMM yyyy') === format(endDate, 'MMM yyyy')) {
62:       return `${format(startDate, 'd')}–${format(endDate, 'd MMM yyyy')}`;
63:     }
64:     return `${format(startDate, 'd MMM')} – ${format(endDate, 'd MMM yyyy')}`;
65:   } catch {
66:     return start;
67:   }
68: }
69: 
70: export function formatMonthLabel(month: number, year: number): string {
71:   const date = new Date(year, month - 1, 1);
72:   return format(date, 'MMM');
73: }
74: 
75: export function toISODateString(date: Date): string {
76:   return format(date, 'yyyy-MM-dd');
77: }
````

## File: lib/notifications.ts
````typescript
 1: // expo-notifications is NOT supported in Expo Go SDK 53+.
 2: // All functions are no-ops here. Push notifications will be re-enabled
 3: // when building with EAS (development build or production).
 4: 
 5: export async function registerForPushNotifications(_userId: string): Promise<string | null> {
 6:   return null;
 7: }
 8: 
 9: export function addNotificationResponseListener(
10:   _handler: (response: any) => void,
11: ): { remove: () => void } | null {
12:   return null;
13: }
14: 
15: export async function clearBadge(): Promise<void> {
16:   // no-op
17: }
````

## File: lib/scoring.ts
````typescript
 1: import type { EventWithFinancials, ApplicationStatus } from '@/types';
 2: 
 3: export interface ScoreResult {
 4:   score: number;       // 0-100
 5:   label: string;       // e.g. "Strong Pick"
 6:   color: string;       // tailwind text colour class
 7:   reasons: string[];
 8: }
 9: 
10: const STATUS_SCORE: Record<ApplicationStatus, number> = {
11:   accepted: 30, waitlisted: 18, pending: 10, rejected: 0, withdrawn: 0,
12: };
13: 
14: export function scoreEvent(
15:   event: EventWithFinancials,
16:   allEvents: EventWithFinancials[],
17: ): ScoreResult {
18:   const reasons: string[] = [];
19:   let score = 0;
20: 
21:   // 1. Status (0–30)
22:   const statusPts = STATUS_SCORE[event.status] ?? 10;
23:   score += statusPts;
24:   if (event.status === 'accepted')   reasons.push('Already accepted ✓');
25:   if (event.status === 'waitlisted') reasons.push('Currently on waitlist');
26:   if (event.status === 'pending')    reasons.push('Application pending');
27: 
28:   // 2. Historical profit with same company (0–35)
29:   const past = allEvents.filter(
30:     (e) =>
31:       e.company_id &&
32:       e.company_id === event.company_id &&
33:       e.id !== event.id &&
34:       new Date(e.date) < new Date() &&
35:       e.calculations.netProfit > 0,
36:   );
37:   if (past.length > 0) {
38:     const avg = past.reduce((s, e) => s + e.calculations.netProfit, 0) / past.length;
39:     const pts = Math.min(35, Math.round(avg / 50));
40:     score += pts;
41:     reasons.push(`Avg \u00a3${avg.toFixed(0)} net from ${past.length} past event${past.length > 1 ? 's' : ''} with this company`);
42:   } else if (event.calculations.netProfit > 0) {
43:     const pts = Math.min(35, Math.round(event.calculations.netProfit / 50));
44:     score += pts;
45:     reasons.push(`\u00a3${event.calculations.netProfit.toFixed(0)} net profit recorded`);
46:   } else {
47:     score += 10;
48:     reasons.push('No historical data for this company yet');
49:   }
50: 
51:   // 3. Estimated event scale from pitch fee paid (0–25)
52:   const pitchFeePaid = event.event_financials?.pitch_fee ?? 0;
53:   const sizePts = pitchFeePaid >= 3000 ? 25 : pitchFeePaid >= 1500 ? 20 : pitchFeePaid >= 800 ? 14 : pitchFeePaid >= 300 ? 8 : 5;
54:   score += sizePts;
55:   if (sizePts >= 20) reasons.push('Large-scale event (high revenue potential)');
56:   else if (sizePts >= 14) reasons.push('Mid-size event');
57:   else reasons.push('Smaller or local event');
58: 
59:   // 4. Duration bonus (0–10)
60:   const days = event.end_date
61:     ? Math.round((new Date(event.end_date).getTime() - new Date(event.date).getTime()) / 86400000) + 1
62:     : 1;
63:   const durPts = Math.min(10, days * 3);
64:   score += durPts;
65:   if (days > 1) reasons.push(`${days}-day event (+${durPts} pts for duration)`);
66: 
67:   score = Math.min(100, Math.max(0, score));
68: 
69:   let label = 'Uncertain';
70:   let color = 'text-slate-500';
71:   if (score >= 75) { label = 'Strong Pick';   color = 'text-green-600'; }
72:   else if (score >= 55) { label = 'Good Option';  color = 'text-amber-600'; }
73:   else if (score >= 35) { label = 'Consider';     color = 'text-orange-500'; }
74:   else { label = 'Low Priority'; color = 'text-red-500'; }
75: 
76:   return { score, label, color, reasons };
77: }
````

## File: lib/supabase.ts
````typescript
 1: import { createClient } from '@supabase/supabase-js';
 2: import * as SecureStore from 'expo-secure-store';
 3: import { Database } from '@/types/database';
 4: 
 5: const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
 6: const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
 7: 
 8: const ExpoSecureStoreAdapter = {
 9:   getItem: (key: string) => SecureStore.getItemAsync(key),
10:   setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
11:   removeItem: (key: string) => SecureStore.deleteItemAsync(key),
12: };
13: 
14: export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
15:   auth: {
16:     storage: ExpoSecureStoreAdapter,
17:     autoRefreshToken: true,
18:     persistSession: true,
19:     detectSessionInUrl: false,
20:   },
21: });
````

## File: supabase/functions/check-application-urls/index.ts
````typescript
  1: // Supabase Edge Function: check-application-urls
  2: // Fetches all event application URLs, hashes content, flags changes, sends push notifications
  3: // Deploy with: supabase functions deploy check-application-urls
  4: // Schedule daily via pg_cron (see migrations.sql)
  5: // Required secrets: SUPABASE_SERVICE_ROLE_KEY
  6: 
  7: import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
  8: import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
  9: 
 10: const CORS_HEADERS = {
 11:   'Access-Control-Allow-Origin': '*',
 12:   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 13: };
 14: 
 15: async function hashContent(content: string): Promise<string> {
 16:   const encoder = new TextEncoder();
 17:   const data = encoder.encode(content.slice(0, 50_000)); // limit to 50KB
 18:   const hashBuffer = await crypto.subtle.digest('SHA-256', data);
 19:   return Array.from(new Uint8Array(hashBuffer))
 20:     .map((b) => b.toString(16).padStart(2, '0'))
 21:     .join('');
 22: }
 23: 
 24: async function fetchPageContent(url: string): Promise<string | null> {
 25:   try {
 26:     const res = await fetch(url, {
 27:       headers: {
 28:         'User-Agent': 'Mozilla/5.0 (compatible; BrewedByBoon/1.0; +application-status-check)',
 29:       },
 30:       signal: AbortSignal.timeout(10_000),
 31:     });
 32:     if (!res.ok) return null;
 33:     const html = await res.text();
 34:     // Strip tags to reduce noise from dynamic content like timestamps
 35:     return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
 36:                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
 37:                .replace(/<[^>]+>/g, ' ')
 38:                .replace(/\s+/g, ' ')
 39:                .trim();
 40:   } catch {
 41:     return null;
 42:   }
 43: }
 44: 
 45: serve(async (req) => {
 46:   if (req.method === 'OPTIONS') {
 47:     return new Response('ok', { headers: CORS_HEADERS });
 48:   }
 49: 
 50:   const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
 51:   const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 52: 
 53:   if (!serviceRoleKey) {
 54:     return new Response(
 55:       JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }),
 56:       { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
 57:     );
 58:   }
 59: 
 60:   const supabase = createClient(supabaseUrl, serviceRoleKey);
 61: 
 62:   // Fetch all events that have an application URL and haven't been flagged yet
 63:   const { data: events, error } = await supabase
 64:     .from('events')
 65:     .select('id, name, user_id, application_url, page_hash, url_changed')
 66:     .not('application_url', 'is', null)
 67:     .eq('url_changed', false);
 68: 
 69:   if (error) {
 70:     return new Response(
 71:       JSON.stringify({ error: error.message }),
 72:       { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
 73:     );
 74:   }
 75: 
 76:   const results = { checked: 0, changed: 0, errors: 0, notified: 0 };
 77: 
 78:   for (const event of events ?? []) {
 79:     if (!event.application_url) continue;
 80:     results.checked++;
 81: 
 82:     const content = await fetchPageContent(event.application_url);
 83:     if (!content) { results.errors++; continue; }
 84: 
 85:     const newHash = await hashContent(content);
 86:     const now = new Date().toISOString();
 87: 
 88:     if (!event.page_hash) {
 89:       // First check — just store the hash, don't alert
 90:       await supabase
 91:         .from('events')
 92:         .update({ page_hash: newHash, url_last_checked_at: now })
 93:         .eq('id', event.id);
 94:       continue;
 95:     }
 96: 
 97:     if (newHash !== event.page_hash) {
 98:       // Page has changed — flag it
 99:       results.changed++;
100:       await supabase
101:         .from('events')
102:         .update({ page_hash: newHash, url_last_checked_at: now, url_changed: true })
103:         .eq('id', event.id);
104: 
105:       // Get the user's push token
106:       const { data: profile } = await supabase
107:         .from('profiles')
108:         .select('push_token')
109:         .eq('id', event.user_id)
110:         .single();
111: 
112:       if (profile?.push_token) {
113:         // Send push notification via our send-push-notification function
114:         try {
115:           await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
116:             method: 'POST',
117:             headers: {
118:               'Content-Type': 'application/json',
119:               'Authorization': `Bearer ${serviceRoleKey}`,
120:             },
121:             body: JSON.stringify({
122:               to: profile.push_token,
123:               title: '📋 Application Page Changed',
124:               body: `"${event.name}" — the application page has been updated. Tap to check your status.`,
125:               data: { eventId: event.id, type: 'url_changed' },
126:             }),
127:           });
128:           results.notified++;
129:         } catch { /* notification failed silently */ }
130:       }
131:     } else {
132:       // No change — just update the check timestamp
133:       await supabase
134:         .from('events')
135:         .update({ url_last_checked_at: now })
136:         .eq('id', event.id);
137:     }
138:   }
139: 
140:   // ── Also check uk_events_directory application URLs ──────────────────────
141:   const { data: directoryEntries } = await supabase
142:     .from('uk_events_directory')
143:     .select('id, name, application_url, page_hash')
144:     .not('application_url', 'is', null);
145: 
146:   const dirResults = { checked: 0, changed: 0, errors: 0 };
147: 
148:   for (const entry of directoryEntries ?? []) {
149:     if (!entry.application_url) continue;
150:     dirResults.checked++;
151: 
152:     const content = await fetchPageContent(entry.application_url);
153:     if (!content) { dirResults.errors++; continue; }
154: 
155:     const newHash = await hashContent(content);
156:     const now = new Date().toISOString();
157: 
158:     if (!entry.page_hash) {
159:       await supabase
160:         .from('uk_events_directory')
161:         .update({ page_hash: newHash, last_verified_at: now })
162:         .eq('id', entry.id);
163:       continue;
164:     }
165: 
166:     if (newHash !== entry.page_hash) {
167:       dirResults.changed++;
168:       await supabase
169:         .from('uk_events_directory')
170:         .update({ page_hash: newHash, last_verified_at: now, application_changed: true })
171:         .eq('id', entry.id);
172:     } else {
173:       await supabase
174:         .from('uk_events_directory')
175:         .update({ last_verified_at: now })
176:         .eq('id', entry.id);
177:     }
178:   }
179: 
180:   return new Response(
181:     JSON.stringify({ success: true, events: results, directory: dirResults }),
182:     { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
183:   );
184: });
````

## File: supabase/functions/discover-events/index.ts
````typescript
  1: // Supabase Edge Function: discover-events
  2: // Searches for UK food market / festival events using Brave Search API
  3: // Deploy with: supabase functions deploy discover-events
  4: // Set secret: supabase secrets set BRAVE_SEARCH_API_KEY=your_key
  5: 
  6: import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
  7: 
  8: const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';
  9: 
 10: const CORS_HEADERS = {
 11:   'Access-Control-Allow-Origin': '*',
 12:   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 13: };
 14: 
 15: interface SearchResult {
 16:   id: string;
 17:   title: string;
 18:   description: string;
 19:   url: string;
 20:   source: string;
 21:   location: string | null;
 22:   dateHint: string | null;
 23:   category: string;
 24: }
 25: 
 26: // Common UK event application platforms and directories
 27: const TRUSTED_DOMAINS = [
 28:   'streetfood.org.uk', 'ncass.org.uk', 'artisanfoodmarket.co.uk',
 29:   'eventbrite.co.uk', 'festivalguide.co.uk', 'ukfoodfestival.co.uk',
 30:   'streetfoodunion.com', 'craftmarkets.co.uk', 'applieddirector.co.uk',
 31:   'bigfeastival.com', 'lovefood.org', 'farmersmarketsonline.com',
 32:   'lovefoodhatewasteapply.co.uk', 'grassroots.org',
 33: ];
 34: 
 35: function detectCategory(title: string, description: string): string {
 36:   const text = (title + ' ' + description).toLowerCase();
 37:   if (text.includes('festival')) return 'Festival';
 38:   if (text.includes('market') || text.includes('farmers')) return 'Market';
 39:   if (text.includes('fair') || text.includes('fete')) return 'Fair';
 40:   if (text.includes('corporate') || text.includes('office') || text.includes('workplace')) return 'Corporate';
 41:   if (text.includes('street food') || text.includes('streetfood')) return 'Street Food';
 42:   if (text.includes('pop-up') || text.includes('pop up')) return 'Pop-Up';
 43:   if (text.includes('wedding')) return 'Wedding';
 44:   return 'Event';
 45: }
 46: 
 47: function extractLocation(title: string, description: string): string | null {
 48:   const ukCities = [
 49:     'London', 'Birmingham', 'Manchester', 'Leeds', 'Sheffield', 'Bristol',
 50:     'Glasgow', 'Edinburgh', 'Liverpool', 'Newcastle', 'Brighton', 'Cardiff',
 51:     'Nottingham', 'Leicester', 'Coventry', 'Southampton', 'Oxford', 'Cambridge',
 52:     'Bath', 'York', 'Exeter', 'Norwich', 'Derby', 'Bournemouth', 'Reading',
 53:     'Portsmouth', 'Kent', 'Surrey', 'Essex', 'Suffolk', 'Norfolk', 'Devon',
 54:     'Cornwall', 'Dorset', 'Sussex', 'Hampshire', 'Berkshire',
 55:   ];
 56:   const text = title + ' ' + description;
 57:   for (const city of ukCities) {
 58:     if (text.includes(city)) return city;
 59:   }
 60:   return null;
 61: }
 62: 
 63: function extractDateHint(title: string, description: string): string | null {
 64:   const text = title + ' ' + description;
 65:   const months = ['January', 'February', 'March', 'April', 'May', 'June',
 66:     'July', 'August', 'September', 'October', 'November', 'December'];
 67:   for (const month of months) {
 68:     if (text.includes(month)) {
 69:       const match = text.match(new RegExp(`\\d{1,2}[\\s\\-–]+${month}\\s+\\d{4}|${month}\\s+\\d{4}|${month}\\s+\\d{1,2}`));
 70:       if (match) return match[0];
 71:     }
 72:   }
 73:   // Look for year
 74:   const yearMatch = text.match(/202[5-9]/);
 75:   if (yearMatch) return yearMatch[0];
 76:   return null;
 77: }
 78: 
 79: serve(async (req) => {
 80:   if (req.method === 'OPTIONS') {
 81:     return new Response('ok', { headers: CORS_HEADERS });
 82:   }
 83: 
 84:   try {
 85:     const { query, region, category } = await req.json();
 86:     const braveKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
 87: 
 88:     if (!braveKey) {
 89:       return new Response(
 90:         JSON.stringify({ error: 'BRAVE_SEARCH_API_KEY not configured in Supabase secrets' }),
 91:         { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
 92:       );
 93:     }
 94: 
 95:     // Build search query
 96:     const regionStr = region && region !== 'All UK' ? ` ${region}` : '';
 97:     const categoryStr = category && category !== 'All' ? ` ${category.toLowerCase()}` : '';
 98:     const baseQuery = query || `UK street food coffee trader vendor applications${regionStr}${categoryStr} 2025 apply now`;
 99: 
100:     const params = new URLSearchParams({
101:       q: baseQuery,
102:       count: '20',
103:       country: 'GB',
104:       search_lang: 'en',
105:       safesearch: 'moderate',
106:       freshness: 'py', // past year
107:     });
108: 
109:     const braveRes = await fetch(`${BRAVE_API_URL}?${params}`, {
110:       headers: {
111:         'Accept': 'application/json',
112:         'Accept-Encoding': 'gzip',
113:         'X-Subscription-Token': braveKey,
114:       },
115:     });
116: 
117:     if (!braveRes.ok) {
118:       const errText = await braveRes.text();
119:       return new Response(
120:         JSON.stringify({ error: `Brave Search error: ${braveRes.status}`, detail: errText }),
121:         { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
122:       );
123:     }
124: 
125:     const braveData = await braveRes.json();
126:     const webResults = braveData?.web?.results ?? [];
127: 
128:     const results: SearchResult[] = webResults
129:       .filter((r: any) => r.url && r.title)
130:       .map((r: any, i: number) => {
131:         const title = r.title ?? '';
132:         const desc = r.description ?? r.extra_snippets?.[0] ?? '';
133:         const hostname = new URL(r.url).hostname.replace('www.', '');
134:         return {
135:           id: `brave-${i}-${Date.now()}`,
136:           title,
137:           description: desc,
138:           url: r.url,
139:           source: hostname,
140:           location: extractLocation(title, desc),
141:           dateHint: extractDateHint(title, desc),
142:           category: detectCategory(title, desc),
143:         };
144:       });
145: 
146:     return new Response(
147:       JSON.stringify({ results, query: baseQuery, count: results.length }),
148:       { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
149:     );
150:   } catch (err) {
151:     return new Response(
152:       JSON.stringify({ error: String(err) }),
153:       { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
154:     );
155:   }
156: });
````

## File: supabase/functions/send-push-notification/index.ts
````typescript
 1: // Supabase Edge Function: send-push-notification
 2: // Sends a push notification to an Expo push token via the Expo Push API
 3: // Deploy with: supabase functions deploy send-push-notification
 4: 
 5: import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
 6: 
 7: const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
 8: 
 9: const CORS_HEADERS = {
10:   'Access-Control-Allow-Origin': '*',
11:   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
12: };
13: 
14: export interface PushPayload {
15:   to: string;
16:   title: string;
17:   body: string;
18:   data?: Record<string, unknown>;
19:   sound?: 'default' | null;
20:   badge?: number;
21: }
22: 
23: serve(async (req) => {
24:   if (req.method === 'OPTIONS') {
25:     return new Response('ok', { headers: CORS_HEADERS });
26:   }
27: 
28:   try {
29:     const payload: PushPayload = await req.json();
30: 
31:     if (!payload.to || !payload.to.startsWith('ExponentPushToken[')) {
32:       return new Response(
33:         JSON.stringify({ error: 'Invalid or missing Expo push token' }),
34:         { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
35:       );
36:     }
37: 
38:     const message = {
39:       to: payload.to,
40:       sound: payload.sound ?? 'default',
41:       title: payload.title,
42:       body: payload.body,
43:       data: payload.data ?? {},
44:       badge: payload.badge ?? 1,
45:     };
46: 
47:     const expoRes = await fetch(EXPO_PUSH_URL, {
48:       method: 'POST',
49:       headers: {
50:         'Accept': 'application/json',
51:         'Content-Type': 'application/json',
52:         'Accept-Encoding': 'gzip, deflate',
53:       },
54:       body: JSON.stringify(message),
55:     });
56: 
57:     const expoData = await expoRes.json();
58: 
59:     return new Response(
60:       JSON.stringify({ success: true, expo: expoData }),
61:       { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
62:     );
63:   } catch (err) {
64:     return new Response(
65:       JSON.stringify({ error: String(err) }),
66:       { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
67:     );
68:   }
69: });
````

## File: supabase/functions/sync-directory/index.ts
````typescript
  1: // Supabase Edge Function: sync-directory
  2: // Searches Brave Search for new UK food market / festival trader opportunities
  3: // and upserts them into uk_events_directory.
  4: //
  5: // Deploy:   supabase functions deploy sync-directory
  6: // Secrets:  supabase secrets set BRAVE_SEARCH_API_KEY=your_key
  7: // Schedule: run daily at 03:00 UTC via pg_cron (see migrations.sql)
  8: //
  9: // The function is idempotent — it uses ON CONFLICT (name) DO UPDATE,
 10: // so running it multiple times will not create duplicates.
 11: 
 12: import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
 13: import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
 14: 
 15: const CORS_HEADERS = {
 16:   'Access-Control-Allow-Origin': '*',
 17:   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 18: };
 19: 
 20: const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';
 21: 
 22: // Search queries designed to find UK trader application pages
 23: const SEARCH_QUERIES = [
 24:   'UK music festival street food coffee trader application 2025 apply',
 25:   'UK food festival concessions trader application 2025',
 26:   'UK street food market stall holder application 2025 apply now',
 27:   'UK Christmas market trader application 2025 2026',
 28:   'UK outdoor festival catering pitch application open',
 29:   'UK county show food trader stall application 2025',
 30:   'UK motorsport event catering trader apply 2025',
 31:   'Glastonbury Latitude Victorious food trader application',
 32:   'UK farmers market artisan food stall application',
 33: ];
 34: 
 35: // Known concessions companies to specifically check
 36: const COMPANY_QUERIES = [
 37:   'Togather traders festival UK apply coffee 2025',
 38:   'D&J Catering Events traders apply UK',
 39:   'Eat Drink Festivals trader application 2025',
 40:   'Severn Events trader stall apply',
 41:   'NCASS food truck trader application UK',
 42: ];
 43: 
 44: interface BraveResult {
 45:   title: string;
 46:   url: string;
 47:   description: string;
 48: }
 49: 
 50: type DirectoryCategory =
 51:   | 'Music Festival'
 52:   | 'Food Festival'
 53:   | 'Street Food Market'
 54:   | 'Christmas Market'
 55:   | 'Garden and Lifestyle'
 56:   | 'Motorsport'
 57:   | 'Equestrian'
 58:   | 'Concessions Company'
 59:   | 'Industry Body'
 60:   | 'Event';
 61: 
 62: function detectCategory(title: string, description: string): DirectoryCategory {
 63:   const text = (title + ' ' + description).toLowerCase();
 64:   if (text.includes('concessions') || text.includes('trader portal') || text.includes('catering company')) return 'Concessions Company';
 65:   if (text.includes('ncass') || text.includes('industry') || text.includes('association')) return 'Industry Body';
 66:   if (text.includes('christmas market') || text.includes('xmas market') || text.includes('winter market')) return 'Christmas Market';
 67:   if (text.includes('music festival') || text.includes('glastonbury') || text.includes('latitude') || text.includes('victorious')) return 'Music Festival';
 68:   if (text.includes('food festival') || text.includes('food & drink') || text.includes('eat & drink')) return 'Food Festival';
 69:   if (text.includes('street food') || text.includes('streetfood') || text.includes('food market')) return 'Street Food Market';
 70:   if (text.includes('motorsport') || text.includes('grand prix') || text.includes('goodwood') || text.includes('silverstone')) return 'Motorsport';
 71:   if (text.includes('equestrian') || text.includes('horse') || text.includes('polo')) return 'Equestrian';
 72:   if (text.includes('garden') || text.includes('lifestyle') || text.includes('flower') || text.includes('hampton court') || text.includes('chelsea')) return 'Garden and Lifestyle';
 73:   return 'Event';
 74: }
 75: 
 76: function extractRegion(title: string, description: string, url: string): string | null {
 77:   const text = (title + ' ' + description + ' ' + url).toLowerCase();
 78:   if (text.includes('london') || text.includes('hyde park') || text.includes('victoria park')) return 'London';
 79:   if (text.includes('edinburgh') || text.includes('glasgow') || text.includes('scotland')) return 'Scotland';
 80:   if (text.includes('wales') || text.includes('cardiff') || text.includes('welsh')) return 'Wales';
 81:   if (text.includes('bristol') || text.includes('bath') || text.includes('somerset') || text.includes('south west')) return 'South West';
 82:   if (text.includes('manchester') || text.includes('liverpool') || text.includes('north west') || text.includes('creamfields')) return 'North West';
 83:   if (text.includes('yorkshire') || text.includes('leeds') || text.includes('sheffield')) return 'Yorkshire';
 84:   if (text.includes('birmingham') || text.includes('midlands') || text.includes('coventry')) return 'Midlands';
 85:   if (text.includes('norfolk') || text.includes('suffolk') || text.includes('east anglia') || text.includes('cambridge')) return 'East of England';
 86:   if (text.includes('kent') || text.includes('surrey') || text.includes('essex') || text.includes('south east')) return 'South East';
 87:   if (text.includes('national') || text.includes('uk wide') || text.includes('across the uk')) return 'National';
 88:   return null;
 89: }
 90: 
 91: function extractDateHint(title: string, description: string): string | null {
 92:   const text = title + ' ' + description;
 93:   const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
 94:   for (const month of months) {
 95:     const match = text.match(new RegExp(`\\d{1,2}[\\s\\-–]+${month}\\s+\\d{4}|${month}\\s+\\d{4}|${month}\\s+\\d{1,2}`, 'i'));
 96:     if (match) return match[0];
 97:   }
 98:   const yearMatch = text.match(/202[5-9]/);
 99:   if (yearMatch) return yearMatch[0];
100:   return null;
101: }
102: 
103: // Detect if a result looks like a genuine trader application page (not news/social media)
104: function isRelevantResult(result: BraveResult): boolean {
105:   const url = result.url.toLowerCase();
106:   const title = result.title.toLowerCase();
107:   const desc = result.description.toLowerCase();
108: 
109:   // Skip social media, news, review sites
110:   const skipDomains = ['twitter.com', 'facebook.com', 'instagram.com', 'reddit.com',
111:     'tripadvisor.co.uk', 'yelp.co.uk', 'bbc.co.uk', 'theguardian.com',
112:     'dailymail.co.uk', 'timeout.com', 'visitscotland.com'];
113:   if (skipDomains.some((d) => url.includes(d))) return false;
114: 
115:   // Must mention trader / vendor / apply / stall / pitch
116:   const keywords = ['trader', 'vendor', 'apply', 'stall', 'pitch', 'application', 'catering', 'concessions'];
117:   return keywords.some((kw) => title.includes(kw) || desc.includes(kw));
118: }
119: 
120: async function searchBrave(query: string, apiKey: string): Promise<BraveResult[]> {
121:   const params = new URLSearchParams({
122:     q: query,
123:     count: '10',
124:     country: 'GB',
125:     search_lang: 'en',
126:     safesearch: 'moderate',
127:     freshness: 'py', // past year
128:   });
129: 
130:   try {
131:     const res = await fetch(`${BRAVE_API_URL}?${params}`, {
132:       headers: {
133:         'Accept': 'application/json',
134:         'Accept-Encoding': 'gzip',
135:         'X-Subscription-Token': apiKey,
136:       },
137:     });
138:     if (!res.ok) return [];
139:     const data = await res.json();
140:     return (data?.web?.results ?? []) as BraveResult[];
141:   } catch {
142:     return [];
143:   }
144: }
145: 
146: serve(async (req) => {
147:   if (req.method === 'OPTIONS') {
148:     return new Response('ok', { headers: CORS_HEADERS });
149:   }
150: 
151:   const braveKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
152:   const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
153:   const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
154: 
155:   if (!braveKey) {
156:     return new Response(
157:       JSON.stringify({ error: 'BRAVE_SEARCH_API_KEY not set. Deploy with: supabase secrets set BRAVE_SEARCH_API_KEY=your_key' }),
158:       { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
159:     );
160:   }
161: 
162:   const supabase = createClient(supabaseUrl, serviceKey);
163: 
164:   let added = 0;
165:   let updated = 0;
166:   let skipped = 0;
167: 
168:   // Combine event queries + company queries
169:   const allQueries = [...SEARCH_QUERIES, ...COMPANY_QUERIES];
170: 
171:   for (const queryStr of allQueries) {
172:     const results = await searchBrave(queryStr, braveKey);
173: 
174:     for (const result of results) {
175:       if (!isRelevantResult(result)) { skipped++; continue; }
176: 
177:       const title = result.title.replace(/\s*[-|–]\s*.+$/, '').trim(); // strip " - Site Name" suffixes
178:       if (!title || title.length < 5) { skipped++; continue; }
179: 
180:       const category = detectCategory(result.title, result.description);
181:       const region = extractRegion(result.title, result.description, result.url);
182:       const dateHint = extractDateHint(result.title, result.description);
183:       const hostname = new URL(result.url).hostname.replace('www.', '');
184: 
185:       const entry = {
186:         name: title.slice(0, 200),
187:         category,
188:         description: result.description?.slice(0, 500) ?? '',
189:         website: result.url,
190:         application_url: result.url,
191:         location: null as string | null,
192:         region,
193:         typical_dates: dateHint,
194:         organiser: hostname,
195:         source: 'brave_search',
196:         featured: false,
197:         last_verified_at: new Date().toISOString(),
198:       };
199: 
200:       // Upsert — ON CONFLICT on name (unique index exists)
201:       const { error } = await supabase
202:         .from('uk_events_directory')
203:         .upsert(entry, { onConflict: 'name', ignoreDuplicates: false });
204: 
205:       if (error) {
206:         // Likely a duplicate with slight name variation — skip
207:         skipped++;
208:       } else {
209:         // Check if it was an insert or update by querying created_at
210:         added++;
211:       }
212:     }
213: 
214:     // Brave free tier rate limit: 1 req/sec
215:     await new Promise((r) => setTimeout(r, 1100));
216:   }
217: 
218:   // Also run the URL freshness check inline (same as check-application-urls)
219:   const { data: directoryEntries } = await supabase
220:     .from('uk_events_directory')
221:     .select('id, name, application_url, page_hash')
222:     .not('application_url', 'is', null)
223:     .not('application_url', 'eq', '');
224: 
225:   let urlsChecked = 0;
226:   let urlsChanged = 0;
227: 
228:   for (const entry of directoryEntries ?? []) {
229:     if (!entry.application_url) continue;
230:     try {
231:       const res = await fetch(entry.application_url, {
232:         headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BrewedByBoon/1.0)' },
233:         signal: AbortSignal.timeout(8_000),
234:       });
235:       if (!res.ok) continue;
236:       const html = await res.text();
237:       const cleaned = html
238:         .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
239:         .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
240:         .replace(/<[^>]+>/g, ' ')
241:         .replace(/\s+/g, ' ')
242:         .trim()
243:         .slice(0, 50_000);
244: 
245:       const encoder = new TextEncoder();
246:       const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(cleaned));
247:       const newHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
248: 
249:       urlsChecked++;
250:       const now = new Date().toISOString();
251: 
252:       if (!entry.page_hash) {
253:         await supabase.from('uk_events_directory').update({ page_hash: newHash, last_verified_at: now }).eq('id', entry.id);
254:       } else if (newHash !== entry.page_hash) {
255:         urlsChanged++;
256:         await supabase.from('uk_events_directory').update({ page_hash: newHash, last_verified_at: now, application_changed: true }).eq('id', entry.id);
257:       } else {
258:         await supabase.from('uk_events_directory').update({ last_verified_at: now }).eq('id', entry.id);
259:       }
260:     } catch {
261:       // URL fetch failed — skip silently
262:     }
263:   }
264: 
265:   return new Response(
266:     JSON.stringify({
267:       success: true,
268:       sync: { added, updated, skipped, queriesRun: allQueries.length },
269:       urlCheck: { checked: urlsChecked, changed: urlsChanged },
270:       timestamp: new Date().toISOString(),
271:     }),
272:     { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
273:   );
274: });
````

## File: supabase/migration_004.sql
````sql
 1: -- ============================================================
 2: -- Migration 004: pg_cron scheduled jobs for daily auto-sync
 3: -- ============================================================
 4: -- Run this AFTER:
 5: --   1. Running migrations.sql (001-003) first
 6: --   2. Enabling pg_cron in Supabase Dashboard:
 7: --      Project Settings → Database → Extensions → search "pg_cron" → Enable
 8: --   3. Enabling pg_net the same way
 9: --   4. Deploying the Edge Functions:
10: --      supabase functions deploy sync-directory
11: --      supabase functions deploy check-application-urls
12: --   5. Setting the BRAVE_SEARCH_API_KEY secret:
13: --      supabase secrets set BRAVE_SEARCH_API_KEY=your_key_here
14: --
15: -- Replace YOUR_PROJECT_REF with your Supabase project reference ID
16: -- (found in: Dashboard → Project Settings → General → Reference ID)
17: -- Replace YOUR_SERVICE_ROLE_KEY with your service_role key
18: -- (found in: Dashboard → Project Settings → API → service_role)
19: --
20: -- WARNING: The service_role key has full DB access. This SQL runs inside
21: -- Supabase's trusted server environment and is never exposed to clients.
22: 
23: -- Enable required extensions
24: CREATE EXTENSION IF NOT EXISTS pg_cron;
25: CREATE EXTENSION IF NOT EXISTS pg_net;
26: 
27: -- ── Job 1: Daily directory sync (03:00 UTC) ────────────────────────────────
28: -- Searches Brave for new UK events/festivals, upserts into uk_events_directory,
29: -- and checks existing application URLs for page changes.
30: 
31: SELECT cron.unschedule('sync-directory-daily')
32: WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-directory-daily');
33: 
34: SELECT cron.schedule(
35:   'sync-directory-daily',
36:   '0 3 * * *',
37:   $$
38:   SELECT net.http_post(
39:     url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-directory',
40:     headers := jsonb_build_object(
41:       'Content-Type',   'application/json',
42:       'Authorization',  'Bearer YOUR_SERVICE_ROLE_KEY'
43:     ),
44:     body    := '{}'::jsonb
45:   ) AS request_id;
46:   $$
47: );
48: 
49: -- ── Job 2: Daily URL check for tracked events (08:00 UTC) ──────────────────
50: -- Checks application URLs on your own tracked events for page changes
51: -- and flags them in the app with the orange "Page changed" badge.
52: 
53: SELECT cron.unschedule('check-application-urls-daily')
54: WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-application-urls-daily');
55: 
56: SELECT cron.schedule(
57:   'check-application-urls-daily',
58:   '0 8 * * *',
59:   $$
60:   SELECT net.http_post(
61:     url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-application-urls',
62:     headers := jsonb_build_object(
63:       'Content-Type',   'application/json',
64:       'Authorization',  'Bearer YOUR_SERVICE_ROLE_KEY'
65:     ),
66:     body    := '{}'::jsonb
67:   ) AS request_id;
68:   $$
69: );
70: 
71: -- Verify both jobs are scheduled:
72: -- SELECT jobname, schedule, active FROM cron.job;
````

## File: supabase/migrations.sql
````sql
  1: -- Run this in your Supabase SQL editor to set up the database schema
  2: 
  3: -- Enable UUID extension
  4: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  5: 
  6: -- Profiles table (extends auth.users)
  7: CREATE TABLE IF NOT EXISTS public.profiles (
  8:   id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  9:   business_name TEXT,
 10:   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 11: );
 12: 
 13: ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
 14: DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
 15: DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
 16: DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
 17: CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
 18: CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
 19: CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
 20: 
 21: -- Auto-create profile on signup
 22: CREATE OR REPLACE FUNCTION public.handle_new_user()
 23: RETURNS TRIGGER AS $$
 24: BEGIN
 25:   INSERT INTO public.profiles (id) VALUES (NEW.id);
 26:   RETURN NEW;
 27: END;
 28: $$ LANGUAGE plpgsql SECURITY DEFINER;
 29: 
 30: DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
 31: CREATE TRIGGER on_auth_user_created
 32:   AFTER INSERT ON auth.users
 33:   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
 34: 
 35: -- Concessions companies
 36: CREATE TABLE IF NOT EXISTS public.concessions_companies (
 37:   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 38:   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 39:   name TEXT NOT NULL,
 40:   contact_name TEXT,
 41:   email TEXT,
 42:   phone TEXT,
 43:   website TEXT,
 44:   notes TEXT,
 45:   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 46:   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 47: );
 48: 
 49: ALTER TABLE public.concessions_companies ENABLE ROW LEVEL SECURITY;
 50: DROP POLICY IF EXISTS "Users can CRUD own companies" ON public.concessions_companies;
 51: CREATE POLICY "Users can CRUD own companies" ON public.concessions_companies
 52:   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
 53: 
 54: -- Events
 55: DO $$ BEGIN
 56:   CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected', 'waitlisted', 'withdrawn');
 57: EXCEPTION WHEN duplicate_object THEN NULL;
 58: END $$;
 59: 
 60: CREATE TABLE IF NOT EXISTS public.events (
 61:   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 62:   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 63:   name TEXT NOT NULL,
 64:   date DATE NOT NULL,
 65:   end_date DATE,
 66:   location TEXT NOT NULL,
 67:   description TEXT,
 68:   application_date DATE,
 69:   status application_status NOT NULL DEFAULT 'pending',
 70:   notes TEXT,
 71:   company_id UUID REFERENCES public.concessions_companies(id) ON DELETE SET NULL,
 72:   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 73:   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 74: );
 75: 
 76: ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
 77: DROP POLICY IF EXISTS "Users can CRUD own events" ON public.events;
 78: CREATE POLICY "Users can CRUD own events" ON public.events
 79:   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
 80: 
 81: -- Event financials (1-to-1 with events)
 82: CREATE TABLE IF NOT EXISTS public.event_financials (
 83:   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 84:   event_id UUID NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
 85:   gross_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
 86:   cost_of_goods NUMERIC(12,2) NOT NULL DEFAULT 0,
 87:   pitch_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
 88:   travel_costs NUMERIC(12,2) NOT NULL DEFAULT 0,
 89:   equipment_costs NUMERIC(12,2) NOT NULL DEFAULT 0,
 90:   other_costs NUMERIC(12,2) NOT NULL DEFAULT 0,
 91:   staffing_costs NUMERIC(12,2) NOT NULL DEFAULT 0,
 92:   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 93:   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 94: );
 95: 
 96: ALTER TABLE public.event_financials ENABLE ROW LEVEL SECURITY;
 97: DROP POLICY IF EXISTS "Users can CRUD own event_financials" ON public.event_financials;
 98: CREATE POLICY "Users can CRUD own event_financials" ON public.event_financials
 99:   FOR ALL USING (
100:     EXISTS (
101:       SELECT 1 FROM public.events e
102:       WHERE e.id = event_id AND e.user_id = auth.uid()
103:     )
104:   )
105:   WITH CHECK (
106:     EXISTS (
107:       SELECT 1 FROM public.events e
108:       WHERE e.id = event_id AND e.user_id = auth.uid()
109:     )
110:   );
111: 
112: -- Staffing entries
113: CREATE TABLE IF NOT EXISTS public.staffing_entries (
114:   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
115:   event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
116:   staff_name TEXT NOT NULL,
117:   hours_worked NUMERIC(6,2) NOT NULL DEFAULT 0,
118:   hourly_rate NUMERIC(8,2) NOT NULL DEFAULT 0,
119:   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
120:   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
121: );
122: 
123: ALTER TABLE public.staffing_entries ENABLE ROW LEVEL SECURITY;
124: DROP POLICY IF EXISTS "Users can CRUD own staffing_entries" ON public.staffing_entries;
125: CREATE POLICY "Users can CRUD own staffing_entries" ON public.staffing_entries
126:   FOR ALL USING (
127:     EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
128:   )
129:   WITH CHECK (
130:     EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
131:   );
132: 
133: -- Infrastructure items
134: DO $$ BEGIN
135:   CREATE TYPE infrastructure_category AS ENUM ('pitch_fee', 'travel', 'equipment', 'supplies', 'other');
136: EXCEPTION WHEN duplicate_object THEN NULL;
137: END $$;
138: 
139: CREATE TABLE IF NOT EXISTS public.infrastructure_items (
140:   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
141:   event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
142:   description TEXT NOT NULL,
143:   category infrastructure_category NOT NULL DEFAULT 'other',
144:   cost NUMERIC(10,2) NOT NULL DEFAULT 0,
145:   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
146:   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
147: );
148: 
149: ALTER TABLE public.infrastructure_items ENABLE ROW LEVEL SECURITY;
150: DROP POLICY IF EXISTS "Users can CRUD own infrastructure_items" ON public.infrastructure_items;
151: CREATE POLICY "Users can CRUD own infrastructure_items" ON public.infrastructure_items
152:   FOR ALL USING (
153:     EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
154:   )
155:   WITH CHECK (
156:     EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
157:   );
158: 
159: -- Updated_at triggers
160: CREATE OR REPLACE FUNCTION public.update_updated_at()
161: RETURNS TRIGGER AS $$
162: BEGIN
163:   NEW.updated_at = NOW();
164:   RETURN NEW;
165: END;
166: $$ LANGUAGE plpgsql;
167: 
168: DROP TRIGGER IF EXISTS set_updated_at ON public.concessions_companies;
169: CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.concessions_companies
170:   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
171: DROP TRIGGER IF EXISTS set_updated_at ON public.events;
172: CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.events
173:   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
174: DROP TRIGGER IF EXISTS set_updated_at ON public.event_financials;
175: CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.event_financials
176:   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
177: DROP TRIGGER IF EXISTS set_updated_at ON public.staffing_entries;
178: CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.staffing_entries
179:   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
180: DROP TRIGGER IF EXISTS set_updated_at ON public.infrastructure_items;
181: CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.infrastructure_items
182:   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
183: 
184: -- ============================================================
185: -- Migration 002: Event discovery, URL monitoring, push tokens
186: -- ============================================================
187: 
188: -- Add push token to profiles
189: ALTER TABLE public.profiles
190:   ADD COLUMN IF NOT EXISTS push_token TEXT,
191:   ADD COLUMN IF NOT EXISTS business_name_updated TEXT;
192: 
193: -- Add URL monitoring fields to events
194: ALTER TABLE public.events
195:   ADD COLUMN IF NOT EXISTS application_url TEXT,
196:   ADD COLUMN IF NOT EXISTS page_hash TEXT,
197:   ADD COLUMN IF NOT EXISTS url_last_checked_at TIMESTAMPTZ,
198:   ADD COLUMN IF NOT EXISTS url_changed BOOLEAN NOT NULL DEFAULT FALSE;
199: 
200: -- Enable pg_cron and pg_net for scheduled URL checks
201: -- (run separately if these extensions are not already enabled)
202: -- CREATE EXTENSION IF NOT EXISTS pg_cron;
203: -- CREATE EXTENSION IF NOT EXISTS pg_net;
204: 
205: -- Schedule the check-application-urls edge function to run daily at 8am UTC
206: -- Uncomment and update YOUR_SUPABASE_PROJECT_REF and YOUR_ANON_KEY after setup:
207: -- SELECT cron.schedule(
208: --   'check-application-urls-daily',
209: --   '0 8 * * *',
210: --   $$
211: --   SELECT net.http_post(
212: --     url := 'https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/check-application-urls',
213: --     headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
214: --     body := '{}'::jsonb
215: --   );
216: --   $$
217: -- );
218: 
219: -- ============================================================
220: -- Migration 003: Fleet (units), enhanced financials, Discover
221: -- ============================================================
222: -- Safe to run multiple times — uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
223: 
224: -- Unit status enum
225: DO $$ BEGIN
226:   CREATE TYPE unit_status AS ENUM ('active', 'maintenance', 'retired');
227: EXCEPTION WHEN duplicate_object THEN NULL;
228: END $$;
229: 
230: -- Units (fleet) table
231: CREATE TABLE IF NOT EXISTS public.units (
232:   id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
233:   user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
234:   name        TEXT        NOT NULL,
235:   registration TEXT,
236:   notes       TEXT,
237:   status      unit_status NOT NULL DEFAULT 'active',
238:   created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
239:   updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
240: );
241: 
242: ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
243: 
244: DO $$ BEGIN
245:   CREATE POLICY "Users can CRUD own units"
246:     ON public.units FOR ALL
247:     USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
248: EXCEPTION WHEN duplicate_object THEN NULL;
249: END $$;
250: 
251: DROP TRIGGER IF EXISTS set_updated_at ON public.units;
252: CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.units
253:   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
254: 
255: -- New columns on events
256: ALTER TABLE public.events ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL;
257: ALTER TABLE public.events ADD COLUMN IF NOT EXISTS overnight_stay BOOLEAN NOT NULL DEFAULT FALSE;
258: ALTER TABLE public.events ADD COLUMN IF NOT EXISTS documents_uploaded BOOLEAN NOT NULL DEFAULT FALSE;
259: 
260: -- New columns on event_financials
261: ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS zero_rated_sales        NUMERIC(12,2) NOT NULL DEFAULT 0;
262: ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS standard_rated_sales    NUMERIC(12,2) NOT NULL DEFAULT 0;
263: ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS concessions_commission_pct NUMERIC(7,4) NOT NULL DEFAULT 0;
264: ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS pitch_fee_refund_pct    NUMERIC(7,4) NOT NULL DEFAULT 0;
265: ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS power_fee              NUMERIC(12,2) NOT NULL DEFAULT 0;
266: ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS camping_costs          NUMERIC(12,2) NOT NULL DEFAULT 0;
267: ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS fresh_milk_litres      NUMERIC(8,2)  NOT NULL DEFAULT 0;
268: ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS alt_milk_litres        NUMERIC(8,2)  NOT NULL DEFAULT 0;
269: 
270: -- UK Events & Concessions Company Directory
271: CREATE TABLE IF NOT EXISTS public.uk_events_directory (
272:   id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
273:   name                TEXT        NOT NULL,
274:   organiser           TEXT,
275:   website             TEXT,
276:   location            TEXT,
277:   region              TEXT,
278:   category            TEXT,
279:   description         TEXT,
280:   application_url     TEXT,
281:   typical_dates       TEXT,
282:   next_date           TEXT,
283:   estimated_footfall  TEXT,
284:   pitch_fee_range     TEXT,
285:   events_managed      TEXT,
286:   contact_phone       TEXT,
287:   contact_email       TEXT,
288:   last_verified_at    TIMESTAMPTZ,
289:   application_changed BOOLEAN     NOT NULL DEFAULT FALSE,
290:   page_hash           TEXT,
291:   source              TEXT        NOT NULL DEFAULT 'manual',
292:   featured            BOOLEAN     NOT NULL DEFAULT FALSE,
293:   created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
294:   updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
295: );
296: 
297: -- Add columns if upgrading from an older version of the table
298: ALTER TABLE public.uk_events_directory ADD COLUMN IF NOT EXISTS events_managed      TEXT;
299: ALTER TABLE public.uk_events_directory ADD COLUMN IF NOT EXISTS contact_phone       TEXT;
300: ALTER TABLE public.uk_events_directory ADD COLUMN IF NOT EXISTS contact_email       TEXT;
301: ALTER TABLE public.uk_events_directory ADD COLUMN IF NOT EXISTS last_verified_at    TIMESTAMPTZ;
302: ALTER TABLE public.uk_events_directory ADD COLUMN IF NOT EXISTS application_changed BOOLEAN NOT NULL DEFAULT FALSE;
303: ALTER TABLE public.uk_events_directory ADD COLUMN IF NOT EXISTS page_hash           TEXT;
304: ALTER TABLE public.uk_events_directory ADD COLUMN IF NOT EXISTS next_date           TEXT;
305: 
306: -- Unique index so we can safely upsert seed data (ON CONFLICT (name))
307: CREATE UNIQUE INDEX IF NOT EXISTS uk_events_directory_name_idx ON public.uk_events_directory (name);
308: 
309: -- Trigger
310: CREATE OR REPLACE FUNCTION public.update_updated_at_directory()
311: RETURNS TRIGGER AS $$
312: BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
313: $$ LANGUAGE plpgsql;
314: 
315: DROP TRIGGER IF EXISTS set_updated_at ON public.uk_events_directory;
316: CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.uk_events_directory
317:   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_directory();
318: 
319: -- ── Seed: Concessions Companies ──────────────────────────────────────────────
320: -- Uses upsert so it is safe to run again without creating duplicates.
321: 
322: INSERT INTO public.uk_events_directory
323:   (name, category, description, website, application_url, featured,
324:    events_managed, contact_phone, contact_email, region, source)
325: VALUES
326: 
327: ('D&J Catering & Events',
328:  'Concessions Company',
329:  'One of the UK''s longest-established concessions operators, managing catering at hundreds of events annually across music festivals, motorsport and outdoor shows.',
330:  'https://www.dnjcatering.co.uk', 'https://www.dnjcatering.co.uk/traders', TRUE,
331:  'Glastonbury, Download, Isle of Wight Festival, Creamfields, V Festival, Silverstone',
332:  NULL, 'traders@dnjcatering.co.uk', 'National', 'manual'),
333: 
334: ('Togather',
335:  'Concessions Company',
336:  'Modern concessions platform partnering with independent street food traders for festivals, corporate events and markets. Online application portal with rolling availability.',
337:  'https://www.togather.com', 'https://www.togather.com/traders', TRUE,
338:  'Latitude, Wilderness Festival, Victorious, Cambridge Folk Festival',
339:  NULL, 'traders@togather.com', 'National', 'manual'),
340: 
341: ('Central Fusion',
342:  'Concessions Company',
343:  'Boutique concessions agency focusing on premium festivals and lifestyle events. Strong relationships with independent food and drink operators.',
344:  'https://www.centralfusion.co.uk', 'https://www.centralfusion.co.uk/apply', FALSE,
345:  'British Summer Time Hyde Park, Kew the Music, Carfest',
346:  NULL, 'hello@centralfusion.co.uk', 'London & South', 'manual'),
347: 
348: ('RB Vernon',
349:  'Concessions Company',
350:  'Established concessions contractor primarily serving motorsport, air shows and outdoor sporting events. Known for large-scale pitches.',
351:  'https://www.rbvernon.co.uk', 'https://www.rbvernon.co.uk/catering-enquiries', FALSE,
352:  'Silverstone Grand Prix, Goodwood, RIAT Air Tattoo, Cheltenham Festival',
353:  NULL, 'catering@rbvernon.co.uk', 'Midlands & South', 'manual'),
354: 
355: ('Severn Events',
356:  'Concessions Company',
357:  'Regional concessions operator covering the Midlands, Wales and South West. Strong presence at county shows, food festivals and rural events.',
358:  'https://www.severnevents.co.uk', 'https://www.severnevents.co.uk/traders', FALSE,
359:  'Three Counties Show, Royal Welsh Show, Malvern Shows',
360:  '01905 000000', 'traders@severnevents.co.uk', 'Midlands & Wales', 'manual'),
361: 
362: ('Eat & Drink Festivals',
363:  'Concessions Company',
364:  'Specialist food and drink festival organiser running consumer shows across the UK. Direct application process for food and beverage traders.',
365:  'https://www.eatanddrinkfestivals.com', 'https://www.eatanddrinkfestivals.com/traders', TRUE,
366:  'Eat & Drink Festival (multiple cities), BBC Good Food Show',
367:  NULL, 'traders@eatanddrinkfestivals.com', 'National', 'manual'),
368: 
369: ('FEAST',
370:  'Concessions Company',
371:  'Award-winning street food festival organiser creating premium outdoor dining events at historic and cultural venues across the UK.',
372:  'https://www.feastonline.co.uk', 'https://www.feastonline.co.uk/apply', FALSE,
373:  'FEAST at Blenheim Palace, FEAST Winchester, FEAST Arundel',
374:  NULL, 'hello@feastonline.co.uk', 'South & South East', 'manual'),
375: 
376: ('Kerb',
377:  'Concessions Company',
378:  'London''s leading street food collective, operating markets at permanent and pop-up sites and managing concessions at major events. Highly competitive application process.',
379:  'https://www.kerbfood.com', 'https://www.kerbfood.com/traders', TRUE,
380:  'Kerb Camden, Kerb King''s Cross, Glastonbury, All Points East',
381:  NULL, 'traders@kerbfood.com', 'London', 'manual'),
382: 
383: ('Tuck (by Coggers)',
384:  'Concessions Company',
385:  'Growing concessions network supplying traders to community events, food markets and smaller festivals. Good entry point for new traders.',
386:  'https://www.tuckmarket.co.uk', 'https://www.tuckmarket.co.uk/apply', FALSE,
387:  'Tuck Markets (various), local county fairs, community festivals',
388:  NULL, 'hello@tuckmarket.co.uk', 'National', 'manual'),
389: 
390: ('Urban Food Fest',
391:  'Concessions Company',
392:  'Street food festival organiser running high-footfall weekend markets in city centres. Known for quality curation and social media promotion.',
393:  'https://www.urbanfoodfest.com', 'https://www.urbanfoodfest.com/traders', FALSE,
394:  'Urban Food Fest Manchester, Birmingham, Leeds, Bristol',
395:  NULL, 'traders@urbanfoodfest.com', 'National', 'manual'),
396: 
397: ('Street Food Warehouse',
398:  'Concessions Company',
399:  'Fast-growing street food event company running converted warehouse events across the North of England. Seeking specialist coffee and hot drink traders.',
400:  'https://www.streetfoodwarehouse.co.uk', 'https://www.streetfoodwarehouse.co.uk/traders', FALSE,
401:  'Street Food Warehouse Leeds, Manchester, Sheffield, Newcastle',
402:  NULL, 'traders@streetfoodwarehouse.co.uk', 'North England', 'manual'),
403: 
404: ('VIP Events Catering',
405:  'Concessions Company',
406:  'Premium concessions contractor for corporate hospitality, sporting events and high-end festivals. Focus on quality and premium branding.',
407:  'https://www.vipevents.co.uk', 'https://www.vipevents.co.uk/catering-partners', FALSE,
408:  'Polo events, equestrian shows, corporate summer parties',
409:  NULL, 'catering@vipevents.co.uk', 'South England', 'manual'),
410: 
411: -- New major companies
412: ('Great British Food Festival',
413:  'Concessions Company',
414:  'The UK''s largest touring food festival, visiting stately homes and heritage venues across England. Dedicated trader application portal with seasonal availability.',
415:  'https://www.greatbritishfoodfestival.com', 'https://www.greatbritishfoodfestival.com/apply', TRUE,
416:  'Great British Food Festival at Audley End, Tatton Park, Hardwick Hall, Chatsworth, Shugborough',
417:  NULL, 'traders@greatbritishfoodfestival.com', 'National', 'manual'),
418: 
419: ('Foodies Festival',
420:  'Concessions Company',
421:  'UK''s premier outdoor food and drink festival brand, running 8+ events per year at iconic venues. Strong coffee trading opportunity.',
422:  'https://www.foodiesfestival.com', 'https://www.foodiesfestival.com/trade-stands', TRUE,
423:  'Foodies Festival Edinburgh, Oxford, Brighton, Birmingham, London',
424:  NULL, 'trade@foodiesfestival.com', 'National', 'manual'),
425: 
426: ('Food and Drink Festivals UK',
427:  'Concessions Company',
428:  'Regional food festival organiser running events at country parks and showgrounds across England. Coffee and hot beverage traders always welcome.',
429:  'https://www.foodanddrinkfestivals.com', 'https://www.foodanddrinkfestivals.com/traders', FALSE,
430:  'Food & Drink Festival (East Midlands, West Midlands, Yorkshire)',
431:  NULL, 'info@foodanddrinkfestivals.com', 'Midlands & Yorkshire', 'manual'),
432: 
433: ('Mellors Group',
434:  'Concessions Company',
435:  'National funfair and outdoor events catering contractor. Operates at theme parks, outdoor festivals and touring shows across the UK.',
436:  'https://www.mellorsgroup.com', 'https://www.mellorsgroup.com/contact', FALSE,
437:  'Travelling fairs, theme park events, outdoor shows',
438:  '01623 707 666', 'enquiries@mellorsgroup.com', 'National', 'manual'),
439: 
440: ('Broadwick Live',
441:  'Concessions Company',
442:  'Premium live events company running some of the UK''s most iconic festivals. Competitive application but excellent returns for accepted traders.',
443:  'https://www.broadwicklive.com', 'https://www.broadwicklive.com', TRUE,
444:  'Tobacco Dock events, Field Day, Printworks London',
445:  NULL, 'production@broadwicklive.com', 'London', 'manual'),
446: 
447: ('RHS Shows',
448:  'Concessions Company',
449:  'Royal Horticultural Society catering concessions at flagship flower shows. Prestigious venues with wealthy demographics — premium coffee pricing well received.',
450:  'https://www.rhs.org.uk', 'https://www.rhs.org.uk/shows-events/exhibiting', TRUE,
451:  'RHS Chelsea Flower Show, RHS Hampton Court, RHS Tatton Park, RHS Cardiff',
452:  NULL, 'commercialventures@rhs.org.uk', 'National', 'manual'),
453: 
454: ('Taste Festivals',
455:  'Concessions Company',
456:  'Premium food and wine festival brand with prestige venues. Application requires established brand and quality credentials.',
457:  'https://www.tastefestivals.com', 'https://www.tastefestivals.com/participate', FALSE,
458:  'Taste of London, Taste of Edinburgh',
459:  NULL, 'participate@tastefestivals.com', 'London & Scotland', 'manual'),
460: 
461: ('Channell Events',
462:  'Concessions Company',
463:  'Specialist motorsport and outdoor events caterer with strong presence at UK race circuits. Reliable pitch fees and experienced operations team.',
464:  'https://www.channellevents.co.uk', 'https://www.channellevents.co.uk/traders', FALSE,
465:  'Thruxton, Snetterton, Brands Hatch, Castle Combe',
466:  NULL, 'traders@channellevents.co.uk', 'South & East', 'manual'),
467: 
468: ('Street Food Hub',
469:  'Concessions Company',
470:  'Curated street food market organiser placing traders at local authority events, business parks and pop-up markets. Good for building regular income.',
471:  'https://www.streetfoodhub.co.uk', 'https://www.streetfoodhub.co.uk/apply', FALSE,
472:  'Corporate catering days, local authority events, weekend markets',
473:  NULL, 'hello@streetfoodhub.co.uk', 'National', 'manual'),
474: 
475: ('NCASS (Nationwide Caterers Association)',
476:  'Industry Body',
477:  'The trade association for mobile caterers and street food traders in the UK. Provides insurance, food hygiene certificates, licensing advice and a members events directory.',
478:  'https://www.ncass.org.uk', 'https://www.ncass.org.uk/membership', TRUE,
479:  'NCASS members have access to an exclusive events listing not available elsewhere',
480:  '0121 603 2524', 'info@ncass.org.uk', 'National', 'manual'),
481: 
482: ('Street Food Union (SFU)',
483:  'Industry Body',
484:  'Trade body and community for street food vendors. Runs markets and advocates for fair pitch fees and sustainable trading conditions.',
485:  'https://www.streetfoodunion.com', 'https://www.streetfoodunion.com/join', FALSE,
486:  NULL, NULL, 'hello@streetfoodunion.com', 'National', 'manual')
487: 
488: ON CONFLICT (name) DO UPDATE SET
489:   description        = EXCLUDED.description,
490:   website            = EXCLUDED.website,
491:   application_url    = EXCLUDED.application_url,
492:   featured           = EXCLUDED.featured,
493:   events_managed     = EXCLUDED.events_managed,
494:   contact_phone      = EXCLUDED.contact_phone,
495:   contact_email      = EXCLUDED.contact_email,
496:   region             = EXCLUDED.region,
497:   updated_at         = NOW();
498: 
499: -- ── Seed: UK Events & Festivals ──────────────────────────────────────────────
500: 
501: INSERT INTO public.uk_events_directory
502:   (name, category, description, website, application_url, featured,
503:    organiser, location, region, typical_dates, next_date, estimated_footfall, pitch_fee_range, source)
504: VALUES
505: 
506: ('Glastonbury Festival',
507:  'Music Festival',
508:  'The world''s largest greenfield festival. Coffee trading here is highly competitive but extremely high volume — expect 200,000+ attendees. Managed via D&J Catering & Events.',
509:  'https://www.glastonburyfestivals.co.uk', NULL, TRUE,
510:  'D&J Catering & Events', 'Pilton, Somerset', 'South West', 'Late June', '2026-06-26',
511:  '200,000+', '£3,000–£12,000', 'manual'),
512: 
513: ('Download Festival',
514:  'Music Festival',
515:  'UK''s premier rock and metal festival at Donington Park. Three days, 100,000+ attendance. D&J manages concessions.',
516:  'https://www.downloadfestival.co.uk', NULL, TRUE,
517:  'D&J Catering & Events', 'Donington Park, Leicestershire', 'Midlands', 'June', '2026-06-06',
518:  '100,000+', '£2,000–£8,000', 'manual'),
519: 
520: ('Reading Festival',
521:  'Music Festival',
522:  'Iconic dual-site festival (Reading + Leeds). Apply through D&J for Reading. One of the best concessions events in the UK calendar.',
523:  'https://www.readingfestival.com', NULL, TRUE,
524:  'D&J Catering & Events', 'Little John''s Farm, Reading', 'South East', 'August Bank Holiday', '2026-08-28',
525:  '105,000+', '£2,500–£9,000', 'manual'),
526: 
527: ('Leeds Festival',
528:  'Music Festival',
529:  'Twin event with Reading. High-volume weekend event with strong coffee trading opportunities throughout the day.',
530:  'https://www.leedsfestival.com', NULL, TRUE,
531:  'D&J Catering & Events', 'Bramham Park, Leeds', 'Yorkshire', 'August Bank Holiday', '2026-08-28',
532:  '105,000+', '£2,500–£9,000', 'manual'),
533: 
534: ('Creamfields',
535:  'Music Festival',
536:  'UK''s biggest electronic music festival. 70,000 per day, 4-day event. Very strong early morning coffee demand.',
537:  'https://www.creamfields.com', NULL, FALSE,
538:  'D&J Catering & Events', 'Daresbury, Cheshire', 'North West', 'August', '2026-08-27',
539:  '70,000/day', '£1,500–£5,000', 'manual'),
540: 
541: ('Latitude Festival',
542:  'Music Festival',
543:  'Arts and music festival in Suffolk. Relaxed family-friendly atmosphere, premium demographics — ideal for specialty coffee.',
544:  'https://www.latitudefestival.com', NULL, FALSE,
545:  'Togather', 'Henham Park, Suffolk', 'East of England', 'July', '2026-07-16',
546:  '35,000', '£1,200–£4,500', 'manual'),
547: 
548: ('Wilderness Festival',
549:  'Music Festival',
550:  'Boutique lifestyle festival at Cornbury Park. Upmarket crowd, premium spend — excellent for high-end coffee concepts.',
551:  'https://www.wildernessfestival.com', NULL, FALSE,
552:  'Togather', 'Cornbury Park, Oxfordshire', 'South East', 'August', '2026-08-06',
553:  '25,000', '£1,000–£3,500', 'manual'),
554: 
555: ('All Points East',
556:  'Music Festival',
557:  'Victoria Park London festival run by AEG Presents. Urban demographic, very coffee-forward audience.',
558:  'https://www.allpointseastfestival.com', NULL, FALSE,
559:  'Kerb', 'Victoria Park, London', 'London', 'May', '2026-05-22',
560:  '50,000+', '£1,800–£6,000', 'manual'),
561: 
562: ('Field Day',
563:  'Music Festival',
564:  'Alternative music festival in London. Broadwick Live event with curated food offering. Niche but loyal audience.',
565:  'https://fielddayfestivals.com', NULL, FALSE,
566:  'Broadwick Live', 'Tobacco Dock, London', 'London', 'June', NULL,
567:  '15,000', '£800–£2,500', 'manual'),
568: 
569: ('Victorious Festival',
570:  'Music Festival',
571:  'Portsmouth seafront festival. 50,000+ over the weekend, growing rapidly. Apply through Togather.',
572:  'https://www.victoriousfestival.co.uk', NULL, FALSE,
573:  'Togather', 'Southsea, Portsmouth', 'South East', 'August', '2026-08-22',
574:  '50,000+', '£1,200–£4,000', 'manual'),
575: 
576: ('RHS Chelsea Flower Show',
577:  'Garden and Lifestyle',
578:  'The world''s most famous flower show. Affluent demographic (avg spend very high). Managed directly by RHS — competitive but profitable for quality operators.',
579:  'https://www.rhs.org.uk/shows-events/rhs-chelsea-flower-show', NULL, TRUE,
580:  'RHS Shows', 'Royal Hospital Chelsea, London', 'London', 'May', '2026-05-19',
581:  '150,000+', '£3,000–£10,000', 'manual'),
582: 
583: ('RHS Hampton Court Palace Garden Festival',
584:  'Garden and Lifestyle',
585:  'Second largest RHS show. Summer gardens event with affluent audience and premium hospitality. Excellent coffee demand.',
586:  'https://www.rhs.org.uk/shows-events/rhs-hampton-court-palace-garden-festival', NULL, TRUE,
587:  'RHS Shows', 'Hampton Court Palace, Surrey', 'London', 'July', '2026-07-01',
588:  '120,000+', '£2,500–£8,000', 'manual'),
589: 
590: ('RHS Tatton Park',
591:  'Garden and Lifestyle',
592:  'North West''s flagship garden show. Three-day event at the stunning Tatton Park estate.',
593:  'https://www.rhs.org.uk/shows-events/rhs-tatton-park-flower-show', NULL, FALSE,
594:  'RHS Shows', 'Tatton Park, Cheshire', 'North West', 'July', '2026-07-22',
595:  '80,000+', '£1,500–£5,500', 'manual'),
596: 
597: ('Goodwood Festival of Speed',
598:  'Motorsport',
599:  'World''s greatest motorsport garden party. 200,000+ over 4 days, very high average spend. Managed by RB Vernon / independent application.',
600:  'https://www.goodwood.com/motorsport/festival-of-speed', NULL, TRUE,
601:  'RB Vernon', 'Goodwood House, West Sussex', 'South East', 'July', '2026-07-09',
602:  '200,000+', '£2,500–£10,000', 'manual'),
603: 
604: ('Goodwood Revival',
605:  'Motorsport',
606:  'Vintage motorsport spectacular. Dress-code 1940s–1960s. Wealthy demographic, very high per-head spend. Premium coffee does well here.',
607:  'https://www.goodwood.com/motorsport/goodwood-revival', NULL, TRUE,
608:  'RB Vernon', 'Goodwood Motor Circuit, West Sussex', 'South East', 'September', '2026-09-04',
609:  '150,000+', '£2,500–£9,000', 'manual'),
610: 
611: ('Silverstone Formula 1 British Grand Prix',
612:  'Motorsport',
613:  'UK''s biggest motorsport event. 450,000+ across the weekend. Managed by RB Vernon / D&J. Highly competitive pitch allocation.',
614:  'https://www.silverstone.co.uk', NULL, TRUE,
615:  'RB Vernon', 'Silverstone Circuit, Northamptonshire', 'Midlands', 'July', '2026-07-03',
616:  '450,000+', '£4,000–£15,000', 'manual'),
617: 
618: ('Cheltenham Festival (Horse Racing)',
619:  'Equestrian',
620:  'Four-day National Hunt horse racing festival. Huge crowds, premium spend, excellent for hot drinks in March weather.',
621:  'https://www.cheltenham.co.uk/racing/cheltenham-festival', NULL, FALSE,
622:  'RB Vernon', 'Cheltenham Racecourse, Gloucestershire', 'South West', 'March', '2027-03-16',
623:  '280,000+', '£2,000–£8,000', 'manual'),
624: 
625: ('Royal Ascot',
626:  'Equestrian',
627:  'Five-day flat racing festival. Some of the most affluent racegoers in the world. Premium branding essential — specialty coffee well suited.',
628:  'https://www.ascot.co.uk', NULL, FALSE,
629:  'Independent Application', 'Ascot Racecourse, Berkshire', 'South East', 'June', '2026-06-16',
630:  '300,000+', '£3,000–£12,000', 'manual'),
631: 
632: ('Foodies Festival Edinburgh',
633:  'Food Festival',
634:  'One of Scotland''s biggest food festivals at Inverleith Park. Hot drinks are always top sellers.',
635:  'https://www.foodiesfestival.com', 'https://www.foodiesfestival.com/trade-stands', TRUE,
636:  'Foodies Festival', 'Inverleith Park, Edinburgh', 'Scotland', 'August', '2026-08-07',
637:  '50,000+', '£1,000–£3,500', 'manual'),
638: 
639: ('Foodies Festival Brighton',
640:  'Food Festival',
641:  'South coast Foodies Festival, strong weekend family audience. Coffee and cold brew do very well here.',
642:  'https://www.foodiesfestival.com', 'https://www.foodiesfestival.com/trade-stands', FALSE,
643:  'Foodies Festival', 'Hove Lawns, Brighton', 'South East', 'May', '2026-05-23',
644:  '35,000+', '£900–£3,000', 'manual'),
645: 
646: ('Great British Food Festival at Chatsworth',
647:  'Food Festival',
648:  'Flagship GBFF event at the spectacular Chatsworth estate. Top-tier demographic, excellent coffee revenue potential.',
649:  'https://www.greatbritishfoodfestival.com', 'https://www.greatbritishfoodfestival.com/apply', TRUE,
650:  'Great British Food Festival', 'Chatsworth House, Derbyshire', 'Midlands', 'September', '2026-09-05',
651:  '30,000+', '£900–£3,000', 'manual'),
652: 
653: ('Great British Food Festival at Audley End',
654:  'Food Festival',
655:  'GBFF event at the beautiful Audley End House. Two days, affluent audience, strong demand for artisan coffee.',
656:  'https://www.greatbritishfoodfestival.com', 'https://www.greatbritishfoodfestival.com/apply', FALSE,
657:  'Great British Food Festival', 'Audley End House, Essex', 'East of England', 'June', '2026-06-27',
658:  '20,000+', '£800–£2,500', 'manual'),
659: 
660: ('BBC Good Food Show Winter',
661:  'Food Festival',
662:  'BBC-branded consumer food show at the NEC Birmingham. Indoor show with massive footfall — ideal for specialty coffee.',
663:  'https://www.bbcgoodfoodshow.com', 'https://www.bbcgoodfoodshow.com/exhibiting', TRUE,
664:  'Eat & Drink Festivals', 'NEC Birmingham', 'Midlands', 'November', '2026-11-25',
665:  '120,000+', '£2,000–£7,000', 'manual'),
666: 
667: ('Taste of London',
668:  'Food Festival',
669:  'Premium food and restaurant festival in Regent''s Park. Very high-end audience, strong spend. Application through Taste Festivals.',
670:  'https://www.tastefestivals.com', 'https://www.tastefestivals.com/participate', FALSE,
671:  'Taste Festivals', 'Regent''s Park, London', 'London', 'June', '2026-06-17',
672:  '45,000+', '£1,500–£5,000', 'manual'),
673: 
674: ('Manchester Christmas Markets',
675:  'Christmas Market',
676:  'One of the UK''s largest Christmas markets across multiple city centre sites. Hot drink pitch applications managed by Manchester City Council.',
677:  'https://www.manchesterchristmas.com', 'https://www.manchester.gov.uk/christmas-markets', TRUE,
678:  'Manchester City Council', 'Manchester City Centre', 'North West', 'November–December', '2026-11-13',
679:  '500,000+', '£3,000–£12,000', 'manual'),
680: 
681: ('Birmingham Frankfurt Christmas Market',
682:  'Christmas Market',
683:  'Europe''s largest German Christmas market outside Germany and Austria. Coffee concession applications through Birmingham Events.',
684:  'https://www.thinkbirmingham.com/christmas', NULL, TRUE,
685:  'Birmingham City Council', 'Birmingham City Centre', 'Midlands', 'November–December', '2026-11-05',
686:  '5,500,000+', '£4,000–£15,000', 'manual'),
687: 
688: ('Winchester Christmas Market',
689:  'Christmas Market',
690:  'Charming Christmas market in the grounds of Winchester Cathedral. Premium demographic, strong hot drink sales.',
691:  'https://www.winchestercathedral.org.uk/christmas', NULL, FALSE,
692:  'Winchester BID', 'Winchester Cathedral, Hampshire', 'South East', 'November–December', '2026-11-20',
693:  '250,000+', '£2,000–£8,000', 'manual'),
694: 
695: ('Bath Christmas Market',
696:  'Christmas Market',
697:  'One of the UK''s most atmospheric Christmas markets, set against Roman and Georgian architecture. Apply direct to Bath BID.',
698:  'https://www.bathchristmasmarket.co.uk', 'https://www.bathchristmasmarket.co.uk/traders', FALSE,
699:  'Bath BID', 'Bath City Centre', 'South West', 'Late November–December', '2026-11-26',
700:  '400,000+', '£2,500–£10,000', 'manual'),
701: 
702: ('Kerb Camden Market',
703:  'Street Food Market',
704:  'London''s most iconic street food market, operating year-round. Regular weekly trading — excellent for building a loyal customer base.',
705:  'https://www.camdenmarket.com/food', 'https://www.kerbfood.com/traders', FALSE,
706:  'Kerb', 'Camden Market, London', 'London', 'Year-round, weekends', NULL,
707:  '5,000–15,000/day', '£300–£800/day', 'manual'),
708: 
709: ('Kerb King''s Cross',
710:  'Street Food Market',
711:  'Lunchtime street food market at Granary Square, King''s Cross. Corporate and tourist demographic, excellent coffee take-up.',
712:  'https://www.kerbfood.com', 'https://www.kerbfood.com/traders', FALSE,
713:  'Kerb', 'Granary Square, King''s Cross, London', 'London', 'Weekdays year-round', NULL,
714:  '2,000–5,000/day', '£200–£600/day', 'manual'),
715: 
716: ('Portobello Road Market',
717:  'Street Food Market',
718:  'Famous London antiques and street food market. Weekend trading, strong tourist footfall. Apply to Portobello Road BID.',
719:  'https://www.portobelloroad.co.uk', NULL, FALSE,
720:  'Portobello Road BID', 'Portobello Road, Notting Hill, London', 'London', 'Saturdays year-round', NULL,
721:  '3,000–10,000/day', '£150–£500/day', 'manual'),
722: 
723: ('Digbeth Dining Club',
724:  'Street Food Market',
725:  'Birmingham''s best street food market in the creative district. Apply direct. Strong demographic for specialty coffee.',
726:  'https://www.digbethdiningclub.com', 'https://www.digbethdiningclub.com/apply', FALSE,
727:  'Digbeth Dining Club Ltd', 'Digbeth, Birmingham', 'Midlands', 'Weekends year-round', NULL,
728:  '2,000–6,000/day', '£200–£600/day', 'manual'),
729: 
730: ('British Street Food Awards',
731:  'Food Festival',
732:  'Regional heats and national final celebrating the best of UK street food. Apply to compete and trade at regional heats — excellent profile building.',
733:  'https://www.britishstreetfood.co.uk', 'https://www.britishstreetfood.co.uk/enter', FALSE,
734:  'British Street Food Awards', 'Various UK cities', 'National', 'May–September', NULL,
735:  '5,000–20,000', '£300–£1,200', 'manual')
736: 
737: ON CONFLICT (name) DO UPDATE SET
738:   description       = EXCLUDED.description,
739:   website           = EXCLUDED.website,
740:   application_url   = EXCLUDED.application_url,
741:   organiser         = EXCLUDED.organiser,
742:   location          = EXCLUDED.location,
743:   region            = EXCLUDED.region,
744:   typical_dates     = EXCLUDED.typical_dates,
745:   next_date         = EXCLUDED.next_date,
746:   estimated_footfall = EXCLUDED.estimated_footfall,
747:   pitch_fee_range   = EXCLUDED.pitch_fee_range,
748:   featured          = EXCLUDED.featured,
749:   updated_at        = NOW();
750: 
751: -- ============================================================
752: -- Migration 004: pg_cron scheduled jobs for daily auto-sync
753: -- ============================================================
754: -- Run this AFTER enabling pg_cron in your Supabase dashboard:
755: --   Dashboard → Project Settings → Extensions → pg_cron → Enable
756: -- Also enable pg_net in the same way (required for HTTP calls from pg_cron).
757: --
758: -- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY with real values.
759: -- Service role key is safe to use here as this runs inside Supabase's
760: -- trusted server environment (not exposed to clients).
761: 
762: -- Enable required extensions (safe to run multiple times)
763: CREATE EXTENSION IF NOT EXISTS pg_cron;
764: CREATE EXTENSION IF NOT EXISTS pg_net;
765: 
766: -- ── Job 1: Daily event sync (03:00 UTC) ─────────────────────────────────────
767: -- Searches Brave for new UK events/festivals and upserts into uk_events_directory.
768: -- Requires BRAVE_SEARCH_API_KEY secret to be set.
769: --
770: SELECT cron.unschedule('sync-directory-daily') WHERE EXISTS (
771:   SELECT 1 FROM cron.job WHERE jobname = 'sync-directory-daily'
772: );
773: 
774: SELECT cron.schedule(
775:   'sync-directory-daily',
776:   '0 3 * * *',
777:   $$
778:   SELECT net.http_post(
779:     url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-directory',
780:     headers := jsonb_build_object(
781:       'Content-Type',   'application/json',
782:       'Authorization',  'Bearer YOUR_SERVICE_ROLE_KEY'
783:     ),
784:     body    := '{}'::jsonb
785:   ) AS request_id;
786:   $$
787: );
788: 
789: -- ── Job 2: Daily URL check (08:00 UTC) ───────────────────────────────────────
790: -- Checks application URLs for your tracked events and flags page changes.
791: -- No API key needed — uses service role key only.
792: --
793: SELECT cron.unschedule('check-application-urls-daily') WHERE EXISTS (
794:   SELECT 1 FROM cron.job WHERE jobname = 'check-application-urls-daily'
795: );
796: 
797: SELECT cron.schedule(
798:   'check-application-urls-daily',
799:   '0 8 * * *',
800:   $$
801:   SELECT net.http_post(
802:     url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-application-urls',
803:     headers := jsonb_build_object(
804:       'Content-Type',   'application/json',
805:       'Authorization',  'Bearer YOUR_SERVICE_ROLE_KEY'
806:     ),
807:     body    := '{}'::jsonb
808:   ) AS request_id;
809:   $$
810: );
811: 
812: -- Verify scheduled jobs:
813: -- SELECT * FROM cron.job;
814: 
815: -- ============================================================
816: -- Migration 005: Multi-unit support per event
817: -- ============================================================
818: -- Adds event_units join table so multiple units can be assigned
819: -- to a single event. The existing unit_id column on events is
820: -- kept for backwards compatibility but the app now reads/writes
821: -- through event_units instead.
822: 
823: CREATE TABLE IF NOT EXISTS public.event_units (
824:   id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
825:   event_id   UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
826:   unit_id    UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
827:   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
828:   UNIQUE (event_id, unit_id)
829: );
830: 
831: ALTER TABLE public.event_units ENABLE ROW LEVEL SECURITY;
832: 
833: DROP POLICY IF EXISTS "Users can CRUD own event_units" ON public.event_units;
834: CREATE POLICY "Users can CRUD own event_units" ON public.event_units
835:   FOR ALL
836:   USING (
837:     EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
838:   )
839:   WITH CHECK (
840:     EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
841:   );
842: 
843: -- Migrate any existing unit_id data into event_units
844: INSERT INTO public.event_units (event_id, unit_id)
845: SELECT id, unit_id FROM public.events WHERE unit_id IS NOT NULL
846: ON CONFLICT (event_id, unit_id) DO NOTHING;
847: 
848: -- ============================================================
849: -- Migration 006: Profile enhancements
850: -- ============================================================
851: ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'Coffee';
852: ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'GBP';
853: ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_metrics JSONB NOT NULL DEFAULT '[]'::jsonb;
````

## File: types/database.ts
````typescript
  1: export type ApplicationStatus =
  2:   | 'pending'
  3:   | 'accepted'
  4:   | 'rejected'
  5:   | 'waitlisted'
  6:   | 'withdrawn';
  7: 
  8: export type InfrastructureCategory =
  9:   | 'pitch_fee'
 10:   | 'travel'
 11:   | 'equipment'
 12:   | 'supplies'
 13:   | 'other';
 14: 
 15: export type UnitStatus = 'active' | 'maintenance' | 'retired';
 16: 
 17: export interface Database {
 18:   public: {
 19:     Tables: {
 20:       profiles: {
 21:         Row: {
 22:           id: string;
 23:           business_name: string | null;
 24:           push_token: string | null;
 25:           created_at: string;
 26:         };
 27:         Insert: {
 28:           id: string;
 29:           business_name?: string | null;
 30:           push_token?: string | null;
 31:           created_at?: string;
 32:         };
 33:         Update: {
 34:           id?: string;
 35:           business_name?: string | null;
 36:           push_token?: string | null;
 37:           created_at?: string;
 38:         };
 39:         Relationships: [];
 40:       };
 41:       units: {
 42:         Row: {
 43:           id: string;
 44:           user_id: string;
 45:           name: string;
 46:           registration: string | null;
 47:           notes: string | null;
 48:           status: UnitStatus;
 49:           vehicle_type: string | null;
 50:           height_m: number | null;
 51:           length_m: number | null;
 52:           width_m: number | null;
 53:           mot_date: string | null;
 54:           tax_date: string | null;
 55:           service_date: string | null;
 56:           service_interval: string | null;
 57:           created_at: string;
 58:           updated_at: string;
 59:         };
 60:         Insert: {
 61:           id?: string;
 62:           user_id: string;
 63:           name: string;
 64:           registration?: string | null;
 65:           notes?: string | null;
 66:           status?: UnitStatus;
 67:           vehicle_type?: string | null;
 68:           height_m?: number | null;
 69:           length_m?: number | null;
 70:           width_m?: number | null;
 71:           mot_date?: string | null;
 72:           tax_date?: string | null;
 73:           service_date?: string | null;
 74:           service_interval?: string | null;
 75:           created_at?: string;
 76:           updated_at?: string;
 77:         };
 78:         Update: {
 79:           id?: string;
 80:           user_id?: string;
 81:           name?: string;
 82:           registration?: string | null;
 83:           notes?: string | null;
 84:           status?: UnitStatus;
 85:           vehicle_type?: string | null;
 86:           height_m?: number | null;
 87:           length_m?: number | null;
 88:           width_m?: number | null;
 89:           mot_date?: string | null;
 90:           tax_date?: string | null;
 91:           service_date?: string | null;
 92:           service_interval?: string | null;
 93:           updated_at?: string;
 94:         };
 95:         Relationships: [];
 96:       };
 97:       concessions_companies: {
 98:         Row: {
 99:           id: string;
100:           user_id: string;
101:           name: string;
102:           contact_name: string | null;
103:           email: string | null;
104:           phone: string | null;
105:           website: string | null;
106:           notes: string | null;
107:           created_at: string;
108:           updated_at: string;
109:         };
110:         Insert: {
111:           id?: string;
112:           user_id: string;
113:           name: string;
114:           contact_name?: string | null;
115:           email?: string | null;
116:           phone?: string | null;
117:           website?: string | null;
118:           notes?: string | null;
119:           created_at?: string;
120:           updated_at?: string;
121:         };
122:         Update: {
123:           id?: string;
124:           user_id?: string;
125:           name?: string;
126:           contact_name?: string | null;
127:           email?: string | null;
128:           phone?: string | null;
129:           website?: string | null;
130:           notes?: string | null;
131:           updated_at?: string;
132:         };
133:         Relationships: [];
134:       };
135:       events: {
136:         Row: {
137:           id: string;
138:           user_id: string;
139:           name: string;
140:           date: string;
141:           end_date: string | null;
142:           location: string;
143:           description: string | null;
144:           application_date: string | null;
145:           status: ApplicationStatus;
146:           notes: string | null;
147:           company_id: string | null;
148:           unit_id: string | null;
149:           overnight_stay: boolean;
150:           documents_uploaded: boolean;
151:           application_url: string | null;
152:           page_hash: string | null;
153:           url_last_checked_at: string | null;
154:           url_changed: boolean;
155:           created_at: string;
156:           updated_at: string;
157:         };
158:         Insert: {
159:           id?: string;
160:           user_id: string;
161:           name: string;
162:           date: string;
163:           end_date?: string | null;
164:           location: string;
165:           description?: string | null;
166:           application_date?: string | null;
167:           status?: ApplicationStatus;
168:           notes?: string | null;
169:           company_id?: string | null;
170:           unit_id?: string | null;
171:           overnight_stay?: boolean;
172:           documents_uploaded?: boolean;
173:           application_url?: string | null;
174:           page_hash?: string | null;
175:           url_last_checked_at?: string | null;
176:           url_changed?: boolean;
177:           created_at?: string;
178:           updated_at?: string;
179:         };
180:         Update: {
181:           id?: string;
182:           user_id?: string;
183:           name?: string;
184:           date?: string;
185:           end_date?: string | null;
186:           location?: string;
187:           description?: string | null;
188:           application_date?: string | null;
189:           status?: ApplicationStatus;
190:           notes?: string | null;
191:           company_id?: string | null;
192:           unit_id?: string | null;
193:           overnight_stay?: boolean;
194:           documents_uploaded?: boolean;
195:           application_url?: string | null;
196:           page_hash?: string | null;
197:           url_last_checked_at?: string | null;
198:           url_changed?: boolean;
199:           updated_at?: string;
200:         };
201:         Relationships: [
202:           {
203:             foreignKeyName: "events_company_id_fkey";
204:             columns: ["company_id"];
205:             isOneToOne: false;
206:             referencedRelation: "concessions_companies";
207:             referencedColumns: ["id"];
208:           },
209:           {
210:             foreignKeyName: "events_unit_id_fkey";
211:             columns: ["unit_id"];
212:             isOneToOne: false;
213:             referencedRelation: "units";
214:             referencedColumns: ["id"];
215:           }
216:         ];
217:       };
218:       event_financials: {
219:         Row: {
220:           id: string;
221:           event_id: string;
222:           gross_sales: number;
223:           zero_rated_sales: number;
224:           standard_rated_sales: number;
225:           concessions_commission_pct: number;
226:           pitch_fee_refund_pct: number;
227:           cost_of_goods: number;
228:           pitch_fee: number;
229:           power_fee: number;
230:           travel_costs: number;
231:           camping_costs: number;
232:           equipment_costs: number;
233:           other_costs: number;
234:           staffing_costs: number;
235:           fresh_milk_litres: number;
236:           alt_milk_litres: number;
237:           created_at: string;
238:           updated_at: string;
239:         };
240:         Insert: {
241:           id?: string;
242:           event_id: string;
243:           gross_sales?: number;
244:           zero_rated_sales?: number;
245:           standard_rated_sales?: number;
246:           concessions_commission_pct?: number;
247:           pitch_fee_refund_pct?: number;
248:           cost_of_goods?: number;
249:           pitch_fee?: number;
250:           power_fee?: number;
251:           travel_costs?: number;
252:           camping_costs?: number;
253:           equipment_costs?: number;
254:           other_costs?: number;
255:           staffing_costs?: number;
256:           fresh_milk_litres?: number;
257:           alt_milk_litres?: number;
258:           created_at?: string;
259:           updated_at?: string;
260:         };
261:         Update: {
262:           id?: string;
263:           event_id?: string;
264:           gross_sales?: number;
265:           zero_rated_sales?: number;
266:           standard_rated_sales?: number;
267:           concessions_commission_pct?: number;
268:           pitch_fee_refund_pct?: number;
269:           cost_of_goods?: number;
270:           pitch_fee?: number;
271:           power_fee?: number;
272:           travel_costs?: number;
273:           camping_costs?: number;
274:           equipment_costs?: number;
275:           other_costs?: number;
276:           staffing_costs?: number;
277:           fresh_milk_litres?: number;
278:           alt_milk_litres?: number;
279:           updated_at?: string;
280:         };
281:         Relationships: [
282:           {
283:             foreignKeyName: "event_financials_event_id_fkey";
284:             columns: ["event_id"];
285:             isOneToOne: true;
286:             referencedRelation: "events";
287:             referencedColumns: ["id"];
288:           }
289:         ];
290:       };
291:       staffing_entries: {
292:         Row: {
293:           id: string;
294:           event_id: string;
295:           staff_name: string;
296:           hours_worked: number;
297:           hourly_rate: number;
298:           created_at: string;
299:           updated_at: string;
300:         };
301:         Insert: {
302:           id?: string;
303:           event_id: string;
304:           staff_name: string;
305:           hours_worked: number;
306:           hourly_rate: number;
307:           created_at?: string;
308:           updated_at?: string;
309:         };
310:         Update: {
311:           id?: string;
312:           event_id?: string;
313:           staff_name?: string;
314:           hours_worked?: number;
315:           hourly_rate?: number;
316:           updated_at?: string;
317:         };
318:         Relationships: [
319:           {
320:             foreignKeyName: "staffing_entries_event_id_fkey";
321:             columns: ["event_id"];
322:             isOneToOne: false;
323:             referencedRelation: "events";
324:             referencedColumns: ["id"];
325:           }
326:         ];
327:       };
328:       infrastructure_items: {
329:         Row: {
330:           id: string;
331:           event_id: string;
332:           description: string;
333:           category: InfrastructureCategory;
334:           cost: number;
335:           created_at: string;
336:           updated_at: string;
337:         };
338:         Insert: {
339:           id?: string;
340:           event_id: string;
341:           description: string;
342:           category: InfrastructureCategory;
343:           cost: number;
344:           created_at?: string;
345:           updated_at?: string;
346:         };
347:         Update: {
348:           id?: string;
349:           event_id?: string;
350:           description?: string;
351:           category?: InfrastructureCategory;
352:           cost?: number;
353:           updated_at?: string;
354:         };
355:         Relationships: [
356:           {
357:             foreignKeyName: "infrastructure_items_event_id_fkey";
358:             columns: ["event_id"];
359:             isOneToOne: false;
360:             referencedRelation: "events";
361:             referencedColumns: ["id"];
362:           }
363:         ];
364:       };
365:       uk_events_directory: {
366:         Row: {
367:           id: string;
368:           name: string;
369:           organiser: string | null;
370:           website: string | null;
371:           location: string | null;
372:           region: string | null;
373:           category: string | null;
374:           description: string | null;
375:           application_url: string | null;
376:           typical_dates: string | null;
377:           next_date: string | null;
378:           estimated_footfall: string | null;
379:           pitch_fee_range: string | null;
380:           events_managed: string | null;
381:           contact_phone: string | null;
382:           contact_email: string | null;
383:           last_verified_at: string | null;
384:           application_changed: boolean;
385:           page_hash: string | null;
386:           source: string;
387:           featured: boolean;
388:           created_at: string;
389:           updated_at: string;
390:         };
391:         Insert: {
392:           id?: string;
393:           name: string;
394:           organiser?: string | null;
395:           website?: string | null;
396:           location?: string | null;
397:           region?: string | null;
398:           category?: string | null;
399:           description?: string | null;
400:           application_url?: string | null;
401:           typical_dates?: string | null;
402:           next_date?: string | null;
403:           estimated_footfall?: string | null;
404:           pitch_fee_range?: string | null;
405:           events_managed?: string | null;
406:           contact_phone?: string | null;
407:           contact_email?: string | null;
408:           last_verified_at?: string | null;
409:           application_changed?: boolean;
410:           source?: string;
411:           featured?: boolean;
412:         };
413:         Update: {
414:           name?: string;
415:           organiser?: string | null;
416:           website?: string | null;
417:           location?: string | null;
418:           region?: string | null;
419:           category?: string | null;
420:           description?: string | null;
421:           application_url?: string | null;
422:           typical_dates?: string | null;
423:           next_date?: string | null;
424:           estimated_footfall?: string | null;
425:           pitch_fee_range?: string | null;
426:           events_managed?: string | null;
427:           contact_phone?: string | null;
428:           contact_email?: string | null;
429:           last_verified_at?: string | null;
430:           application_changed?: boolean;
431:           source?: string;
432:           featured?: boolean;
433:           updated_at?: string;
434:         };
435:         Relationships: [];
436:       };
437:     };
438:     Views: Record<string, never>;
439:     Functions: Record<string, never>;
440:     Enums: {
441:       application_status: ApplicationStatus;
442:       infrastructure_category: InfrastructureCategory;
443:       unit_status: UnitStatus;
444:     };
445:     CompositeTypes: Record<string, never>;
446:   };
447: }
````

## File: types/index.ts
````typescript
  1: import type { Database, ApplicationStatus, UnitStatus } from './database';
  2: 
  3: export type { ApplicationStatus, UnitStatus } from './database';
  4: 
  5: type Tables = Database['public']['Tables'];
  6: 
  7: export type Profile = Tables['profiles']['Row'];
  8: export type ConcessionsCompany = Tables['concessions_companies']['Row'];
  9: export type Event = Tables['events']['Row'];
 10: export type EventFinancials = Tables['event_financials']['Row'];
 11: export type StaffingEntry = Tables['staffing_entries']['Row'];
 12: export type InfrastructureItem = Tables['infrastructure_items']['Row'];
 13: export type Unit = Tables['units']['Row'];
 14: export type UkEventDirectory = Tables['uk_events_directory']['Row'];
 15: 
 16: export type InfrastructureCategory = 'pitch_fee' | 'travel' | 'equipment' | 'supplies' | 'other';
 17: 
 18: export interface EventCalculations {
 19:   // VAT breakdown
 20:   standardRatedNet: number;
 21:   vatCollected: number;
 22:   totalNetSales: number;
 23:   // Commission & pitch fee settlement
 24:   commissionAmount: number;
 25:   pitchFeeRefundGross: number;
 26:   netRefund: number;
 27:   effectivePitchFee: number;
 28:   // Summary
 29:   grossProfit: number;
 30:   totalCosts: number;
 31:   netProfit: number;
 32:   profitMargin: number;
 33:   totalStaffingCost: number;
 34: }
 35: 
 36: export const EMPTY_CALCULATIONS: EventCalculations = {
 37:   standardRatedNet: 0, vatCollected: 0, totalNetSales: 0,
 38:   commissionAmount: 0, pitchFeeRefundGross: 0, netRefund: 0, effectivePitchFee: 0,
 39:   grossProfit: 0, totalCosts: 0, netProfit: 0, profitMargin: 0, totalStaffingCost: 0,
 40: };
 41: 
 42: export interface EventWithFinancials extends Event {
 43:   event_financials: EventFinancials | null;
 44:   concessions_companies: ConcessionsCompany | null;
 45:   units: Unit[];
 46:   calculations: EventCalculations;
 47: }
 48: 
 49: export interface EventDetail extends EventWithFinancials {
 50:   staffing_entries: StaffingEntry[];
 51:   infrastructure_items: InfrastructureItem[];
 52: }
 53: 
 54: export interface DiscoveredEvent {
 55:   id: string;
 56:   title: string;
 57:   description: string;
 58:   url: string;
 59:   source: string;
 60:   location: string | null;
 61:   dateHint: string | null;
 62:   category: string;
 63:   region: string | null;
 64:   organiser: string | null;
 65:   estimatedFootfall: string | null;
 66:   pitchFeeRange: string | null;
 67:   featured: boolean;
 68:   // Company-specific fields
 69:   eventsManaged: string | null;
 70:   contactPhone: string | null;
 71:   contactEmail: string | null;
 72:   lastVerifiedAt: string | null;
 73:   applicationChanged: boolean;
 74:   isCompany: boolean;
 75: }
 76: 
 77: export interface CompanyWithStats extends ConcessionsCompany {
 78:   totalEvents: number;
 79:   acceptedEvents: number;
 80:   totalRevenue: number;
 81:   totalNetProfit: number;
 82:   lastEventDate: string | null;
 83:   avgProfitMargin: number | null;
 84:   completedEventCount: number;
 85: }
 86: 
 87: export interface UnitWithStatus extends Unit {
 88:   currentEvent: EventWithFinancials | null;
 89: }
 90: 
 91: export interface DashboardStats {
 92:   totalEventsYtd: number;
 93:   grossSalesYtd: number;
 94:   netProfitYtd: number;
 95:   acceptanceRate: number;
 96:   avgRevenuePerEvent: number;
 97:   upcomingEvents: EventWithFinancials[];
 98:   monthlyRevenue: MonthlyRevenue[];
 99:   statusBreakdown: StatusCount[];
100:   totalFreshMilkLitres: number;
101:   totalAltMilkLitres: number;
102:   unitStatuses: UnitWithStatus[];
103:   committedFees: number;
104:   upcomingCommitments: {
105:     id: string;
106:     name: string;
107:     date: string;
108:     end_date: string | null;
109:     location: string;
110:     committedFee: number;
111:   }[];
112: }
113: 
114: export interface MonthlyRevenue {
115:   month: string;
116:   grossSales: number;
117:   netProfit: number;
118: }
119: 
120: export interface StatusCount {
121:   status: ApplicationStatus;
122:   count: number;
123: }
124: 
125: export interface ReportData {
126:   year: number;
127:   totalGross: number;
128:   totalNet: number;
129:   totalEvents: number;
130:   avgMargin: number;
131:   totalFreshMilkLitres: number;
132:   totalAltMilkLitres: number;
133:   monthly: MonthlyBreakdown[];
134:   topEvents: EventWithFinancials[];
135:   companyPerformance: CompanyPerformance[];
136: }
137: 
138: export interface MonthlyBreakdown {
139:   month: number;
140:   monthLabel: string;
141:   eventCount: number;
142:   grossSales: number;
143:   totalCosts: number;
144:   netProfit: number;
145:   profitMargin: number;
146: }
147: 
148: export interface CompanyPerformance {
149:   company: ConcessionsCompany;
150:   totalEvents: number;
151:   acceptedEvents: number;
152:   totalRevenue: number;
153:   acceptanceRate: number;
154: }
155: 
156: export interface StaffingEntryForm {
157:   id?: string;
158:   staff_name: string;
159:   hours_worked: number;
160:   hourly_rate: number;
161: }
162: 
163: export interface InfrastructureItemForm {
164:   id?: string;
165:   description: string;
166:   category: InfrastructureCategory;
167:   cost: number;
168: }
169: 
170: export type { UnitFormValues } from '@/lib/validations/unit.schema';
171: 
172: export interface CompanyFormValues {
173:   name: string;
174:   contact_name?: string;
175:   email?: string;
176:   phone?: string;
177:   website?: string;
178:   notes?: string;
179: }
````

## File: .env.example
````
 1: EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
 2: EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
 3: 
 4: # Brave Search API — free tier at https://brave.com/search/api/
 5: # Set this in your Supabase project dashboard → Settings → Edge Functions → Secrets
 6: BRAVE_SEARCH_API_KEY=your-brave-api-key-here
 7: 
 8: # Supabase service role key — from Supabase dashboard → Settings → API
 9: # Set in Supabase Edge Function secrets (never expose in app)
10: SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
````

## File: .gitignore
````
 1: # Learn more https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files
 2: 
 3: # dependencies
 4: node_modules/
 5: 
 6: # Expo
 7: .expo/
 8: dist/
 9: web-build/
10: expo-env.d.ts
11: 
12: # Native
13: .kotlin/
14: *.orig.*
15: *.jks
16: *.p8
17: *.p12
18: *.key
19: *.mobileprovision
20: 
21: # Metro
22: .metro-health-check*
23: 
24: # debug
25: npm-debug.*
26: yarn-debug.*
27: yarn-error.*
28: 
29: # macOS
30: .DS_Store
31: *.pem
32: 
33: # local env files
34: .env*.local
35: .env.local
36: .env
37: 
38: # Database
39: *.db
40: *.db-journal
41: 
42: # typescript
43: *.tsbuildinfo
44: 
45: # generated native folders
46: /ios
47: /android
````

## File: .npmrc
````
1: legacy-peer-deps=true
````

## File: app.json
````json
 1: {
 2:   "expo": {
 3:     "name": "Brewed by Boon",
 4:     "slug": "brewedbyboon",
 5:     "version": "1.0.0",
 6:     "scheme": "brewedbyboon",
 7:     "orientation": "portrait",
 8:     "icon": "./assets/icon.png",
 9:     "userInterfaceStyle": "light",
10:     "newArchEnabled": true,
11:     "splash": {
12:       "image": "./assets/splash-icon.png",
13:       "resizeMode": "contain",
14:       "backgroundColor": "#0f172a"
15:     },
16:     "ios": {
17:       "supportsTablet": true,
18:       "bundleIdentifier": "com.brewedbyboon.app"
19:     },
20:     "android": {
21:       "adaptiveIcon": {
22:         "foregroundImage": "./assets/adaptive-icon.png",
23:         "backgroundColor": "#0f172a"
24:       },
25:       "edgeToEdgeEnabled": true,
26:       "predictiveBackGestureEnabled": false,
27:       "package": "com.brewedbyboon.app"
28:     },
29:     "web": {
30:       "bundler": "metro",
31:       "output": "static",
32:       "favicon": "./assets/favicon.png"
33:     },
34:     "plugins": [
35:       "expo-router",
36:       "expo-secure-store",
37:       [
38:         "expo-notifications",
39:         {
40:           "icon": "./assets/icon.png",
41:           "color": "#f59e0b",
42:           "defaultChannel": "default"
43:         }
44:       ]
45:     ]
46:   }
47: }
````

## File: babel.config.js
````javascript
1: module.exports = function (api) {
2:   api.cache(true);
3:   return {
4:     presets: [
5:       ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
6:       'nativewind/babel',
7:     ],
8:   };
9: };
````

## File: global.css
````css
1: @tailwind base;
2: @tailwind components;
3: @tailwind utilities;
````

## File: metro.config.js
````javascript
1: const { getDefaultConfig } = require('expo/metro-config');
2: const { withNativeWind } = require('nativewind/metro');
3: 
4: const config = getDefaultConfig(__dirname);
5: 
6: module.exports = withNativeWind(config, { input: './global.css' });
````

## File: nativewind-env.d.ts
````typescript
1: /// <reference types="nativewind/types" />
````

## File: package.json
````json
 1: {
 2:   "name": "brewedbyboon",
 3:   "version": "1.0.0",
 4:   "main": "expo-router/entry",
 5:   "scripts": {
 6:     "start": "expo start",
 7:     "android": "expo start --android",
 8:     "ios": "expo start --ios",
 9:     "web": "expo start --web"
10:   },
11:   "dependencies": {
12:     "@expo/vector-icons": "^14.1.0",
13:     "@hookform/resolvers": "^3.9.0",
14:     "@react-native-async-storage/async-storage": "^2.1.0",
15:     "@shopify/flash-list": "^1.8.3",
16:     "@supabase/supabase-js": "^2.45.0",
17:     "@tanstack/react-query": "^5.56.0",
18:     "date-fns": "^3.6.0",
19:     "expo": "~54.0.0",
20:     "expo-constants": "~18.0.13",
21:     "expo-device": "~8.0.10",
22:     "expo-haptics": "~15.0.8",
23:     "expo-linking": "~8.0.11",
24:     "expo-notifications": "~0.32.16",
25:     "expo-router": "~6.0.23",
26:     "expo-secure-store": "~15.0.8",
27:     "expo-status-bar": "~3.0.9",
28:     "nativewind": "^4.0.36",
29:     "react": "19.1.0",
30:     "react-hook-form": "^7.53.0",
31:     "react-native": "0.81.5",
32:     "react-native-gesture-handler": "~2.28.0",
33:     "react-native-reanimated": "~4.1.1",
34:     "react-native-safe-area-context": "~5.6.0",
35:     "react-native-screens": "~4.16.0",
36:     "react-native-svg": "15.12.1",
37:     "react-native-worklets": "0.5.1",
38:     "tailwindcss": "^3.4.14",
39:     "zod": "^3.23.0",
40:     "zustand": "^5.0.0"
41:   },
42:   "devDependencies": {
43:     "@types/react": "~19.0.0",
44:     "babel-preset-expo": "~12.0.0",
45:     "typescript": "~5.3.0"
46:   },
47:   "private": true
48: }
````

## File: SETUP.md
````markdown
  1: # Brewed by Boon — Setup & Installation Guide
  2: 
  3: Complete instructions for getting the app running on your iPhone and Mac.
  4: 
  5: ---
  6: 
  7: ## What You Need
  8: 
  9: | Tool | Why | Free? |
 10: |------|-----|-------|
 11: | [Supabase](https://supabase.com) account | Cloud database + backend | Yes |
 12: | [Expo](https://expo.dev) account | Building and deploying the app | Yes |
 13: | [Brave Search API](https://api.search.brave.com) key | Event discovery feature | Free tier available |
 14: | [Node.js](https://nodejs.org) (v18+) | Run the build tools | Yes |
 15: | iPhone with iOS 16+ | Run the app | — |
 16: 
 17: ---
 18: 
 19: ## Part 1 — Supabase Setup (Database + Backend)
 20: 
 21: ### 1.1 Create a Supabase project
 22: 
 23: 1. Go to [supabase.com](https://supabase.com) → **New project**
 24: 2. Name it `brewed-by-boon`, choose a strong database password, pick a region close to you (e.g. `eu-west-2 London`)
 25: 3. Wait ~2 minutes for it to provision
 26: 
 27: ### 1.2 Run the database migrations
 28: 
 29: 1. In your Supabase project, click **SQL Editor** in the left sidebar
 30: 2. Click **New query**
 31: 3. Open the file `supabase/migrations.sql` from this project
 32: 4. Copy the entire contents and paste into the SQL editor
 33: 5. Click **Run** — you should see "Success. No rows returned"
 34: 
 35: This creates all the tables: `profiles`, `concessions_companies`, `events`, `event_financials`, `staffing_entries`, `infrastructure_items` with all the correct columns, RLS policies, and triggers.
 36: 
 37: ### 1.3 Get your API keys
 38: 
 39: In your Supabase project:
 40: - Go to **Settings → API**
 41: - Copy **Project URL** → this is your `EXPO_PUBLIC_SUPABASE_URL`
 42: - Copy **anon public** key → this is your `EXPO_PUBLIC_SUPABASE_ANON_KEY`
 43: - Copy **service_role** key → this is your `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — only used server-side)
 44: 
 45: ### 1.4 Create your .env file
 46: 
 47: In the project root, copy the example file:
 48: 
 49: ```bash
 50: cp .env.example .env
 51: ```
 52: 
 53: Then fill in your values:
 54: 
 55: ```
 56: EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
 57: EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
 58: BRAVE_SEARCH_API_KEY=BSA...your-brave-key...
 59: SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...
 60: ```
 61: 
 62: ### 1.5 Get a Brave Search API key
 63: 
 64: 1. Go to [api.search.brave.com](https://api.search.brave.com)
 65: 2. Sign up and create an API key (free tier gives 2,000 queries/month)
 66: 3. Add it to your `.env` as `BRAVE_SEARCH_API_KEY`
 67: 
 68: ---
 69: 
 70: ## Part 2 — Deploy Edge Functions (Backend Logic)
 71: 
 72: The app uses three serverless functions on Supabase for:
 73: - **discover-events** — searches for UK events via Brave Search
 74: - **check-application-urls** — monitors application pages for changes
 75: - **send-push-notification** — sends push alerts to your iPhone
 76: 
 77: ### 2.1 Install Supabase CLI
 78: 
 79: ```bash
 80: npm install -g supabase
 81: ```
 82: 
 83: ### 2.2 Log in and link your project
 84: 
 85: ```bash
 86: supabase login
 87: supabase link --project-ref your-project-ref
 88: ```
 89: 
 90: (Find your project ref in Supabase → Settings → General — it's in the project URL: `https://your-ref.supabase.co`)
 91: 
 92: ### 2.3 Set secrets for the Edge Functions
 93: 
 94: ```bash
 95: supabase secrets set BRAVE_SEARCH_API_KEY=your_brave_key
 96: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 97: ```
 98: 
 99: ### 2.4 Deploy all three functions
100: 
101: ```bash
102: supabase functions deploy discover-events
103: supabase functions deploy check-application-urls
104: supabase functions deploy send-push-notification
105: ```
106: 
107: Each deploy takes about 30 seconds. You should see "Deployed Function" in the output.
108: 
109: ### 2.5 Schedule automatic URL checking (optional)
110: 
111: To have the app automatically check application pages daily:
112: 
113: 1. In Supabase → **SQL Editor**, run:
114: ```sql
115: -- Enable pg_cron extension (may already be enabled)
116: CREATE EXTENSION IF NOT EXISTS pg_cron;
117: 
118: -- Schedule daily URL check at 9am UTC
119: SELECT cron.schedule(
120:   'check-application-urls-daily',
121:   '0 9 * * *',
122:   $$
123:   SELECT net.http_post(
124:     url := 'https://your-project-ref.supabase.co/functions/v1/check-application-urls',
125:     headers := '{"Authorization": "Bearer your-service-role-key"}'::jsonb
126:   );
127:   $$
128: );
129: ```
130: 
131: Replace `your-project-ref` and `your-service-role-key` with your actual values.
132: 
133: ---
134: 
135: ## Part 3 — Running on Your iPhone (Development — Free)
136: 
137: This uses **Expo Go**, a free app that lets you run the app instantly without any App Store submission.
138: 
139: ### 3.1 Install dependencies
140: 
141: In the project folder:
142: 
143: ```bash
144: npm install
145: ```
146: 
147: ### 3.2 Start the development server
148: 
149: ```bash
150: npx expo start
151: ```
152: 
153: You'll see a QR code in your terminal.
154: 
155: ### 3.3 Install Expo Go on your iPhone
156: 
157: 1. Open the **App Store** on your iPhone
158: 2. Search for **Expo Go** and install it
159: 
160: ### 3.4 Open the app
161: 
162: 1. Open the **Camera** app on your iPhone
163: 2. Point it at the QR code in your terminal
164: 3. Tap the banner that appears — the app will open in Expo Go
165: 
166: **That's it!** The app will load with your live data.
167: 
168: > **Note:** Both your Mac and iPhone need to be on the **same WiFi network** for this to work.
169: 
170: ### Re-opening later
171: 
172: After the first setup:
173: 1. `npx expo start` on your Mac
174: 2. Scan QR code, or open Expo Go and it remembers recent apps
175: 
176: ---
177: 
178: ## Part 4 — Installing on Your iPhone Properly (No Expo Go)
179: 
180: For a proper installation on your home screen (like a real app), you need to build it with EAS Build.
181: 
182: ### 4.1 Install EAS CLI
183: 
184: ```bash
185: npm install -g eas-cli
186: eas login
187: ```
188: 
189: ### 4.2 Configure EAS
190: 
191: In the project folder:
192: 
193: ```bash
194: eas build:configure
195: ```
196: 
197: This creates an `eas.json` file. Accept all defaults.
198: 
199: ### 4.3 Build for iOS
200: 
201: ```bash
202: eas build --platform ios --profile preview
203: ```
204: 
205: - This uploads the code to Expo's build servers
206: - Takes 10–20 minutes the first time
207: - You'll get a URL to download the `.ipa` file when done
208: - No Apple Developer account needed for a personal device build using EAS preview profile
209: 
210: ### 4.4 Install on your iPhone
211: 
212: Once the build is complete:
213: 1. EAS will give you a QR code or link
214: 2. Open the link on your iPhone (in Safari)
215: 3. Tap **Install** when prompted
216: 4. Go to **Settings → General → VPN & Device Management** and trust the developer certificate
217: 
218: The app icon will appear on your home screen.
219: 
220: ---
221: 
222: ## Part 5 — Mac App (Optional)
223: 
224: Expo supports running the app as a Mac app via Mac Catalyst, but the simplest approach for Mac is to just use the web version or keep it as iPhone-only (since it's designed for mobile use on the go).
225: 
226: To run on your Mac for testing:
227: 
228: ```bash
229: npx expo start --ios
230: ```
231: 
232: This opens the iOS Simulator (requires Xcode installed from the App Store).
233: 
234: ---
235: 
236: ## Part 6 — Setting Up Two Devices
237: 
238: To use the app on both your iPhone and a staff member's iPhone:
239: 
240: **Same account (shared data):**
241: 1. Both devices sign into the app with the same email/password
242: 2. All events, companies, and financials are shared between devices
243: 3. Good for owner + one staff member who needs to see everything
244: 
245: **Separate accounts (separate data):**
246: 1. Each device creates a separate account
247: 2. Each person only sees their own data
248: 3. Good if staff should only see events they're working on
249: 
250: ---
251: 
252: ## Troubleshooting
253: 
254: **"Network request failed" on startup**
255: → Check your `.env` file has the correct Supabase URL and anon key (no trailing spaces)
256: 
257: **"Discover" search returns no results**
258: → Make sure your Brave Search API key is set: `supabase secrets set BRAVE_SEARCH_API_KEY=...`
259: 
260: **Push notifications not arriving**
261: → On first launch, accept the notification permission prompt. Then go to an event detail page — the app registers your push token. If you dismissed it, go to iPhone Settings → Brewed (or Expo Go) → Notifications and enable.
262: 
263: **App won't open after QR scan**
264: → Make sure iPhone and Mac are on the same WiFi. If on different networks, use `npx expo start --tunnel` instead.
265: 
266: **TypeScript / build errors**
267: → Run `npm install` first. If errors persist, `rm -rf node_modules && npm install`.
268: 
269: ---
270: 
271: ## Project Structure (Quick Reference)
272: 
273: ```
274: app/           — All screens (Expo Router file-based routing)
275: components/    — Reusable UI components
276: lib/           — Supabase client, React Query hooks, formatters
277: supabase/
278:   functions/   — Edge Functions (deployed to Supabase, not the phone)
279:   migrations.sql — Run this once in Supabase SQL Editor
280: types/         — TypeScript types
281: .env           — Your credentials (never commit this file)
282: ```
283: 
284: ---
285: 
286: ## Key Features
287: 
288: | Feature | How it works |
289: |---------|-------------|
290: | **Events tracker** | Full CRUD with status tracking (Pending → Accepted/Rejected/Waitlisted) |
291: | **Application timeline** | Visual journey showing where each application is |
292: | **URL monitoring** | Paste an application portal URL; app alerts you if the page changes |
293: | **Event discovery** | Brave Search finds UK markets/festivals you can apply to |
294: | **Add discovered events** | One tap adds a found event to your tracker |
295: | **Financials** | Track gross sales, COGS, pitch fee, staffing, travel — auto-calculates net profit & margin |
296: | **Reports** | Monthly breakdown, top events by profit, CSV export |
297: | **Dashboard** | YTD stats, revenue chart, acceptance rate, upcoming events |
298: | **Multi-device** | Cloud sync via Supabase — same data on all your devices |
````

## File: tailwind.config.js
````javascript
 1: /** @type {import('tailwindcss').Config} */
 2: module.exports = {
 3:   content: [
 4:     './app/**/*.{js,jsx,ts,tsx}',
 5:     './components/**/*.{js,jsx,ts,tsx}',
 6:   ],
 7:   presets: [require('nativewind/preset')],
 8:   theme: {
 9:     extend: {
10:       colors: {
11:         coffee: {
12:           50:  '#fdf8f0',
13:           100: '#faefd9',
14:           200: '#f4dcb0',
15:           300: '#ecc47f',
16:           400: '#e3a54d',
17:           500: '#db8c2a',
18:           600: '#cc7520',
19:           700: '#aa5d1c',
20:           800: '#884a1e',
21:           900: '#6e3d1c',
22:           950: '#3b1e0d',
23:         },
24:         brand: {
25:           primary: '#6b3a2a',
26:           secondary: '#c9813a',
27:           dark: '#1c1917',
28:         },
29:       },
30:       fontFamily: {
31:         sans: ['System'],
32:       },
33:     },
34:   },
35:   plugins: [],
36: };
````

## File: tsconfig.json
````json
 1: {
 2:   "extends": "expo/tsconfig.base",
 3:   "compilerOptions": {
 4:     "strict": true,
 5:     "baseUrl": ".",
 6:     "paths": {
 7:       "@/*": ["./*"]
 8:     }
 9:   },
10:   "include": [
11:     "**/*.ts",
12:     "**/*.tsx",
13:     ".expo/types/**/*.d.ts",
14:     "expo-env.d.ts"
15:   ],
16:   "exclude": [
17:     "supabase/functions"
18:   ]
19: }
````
