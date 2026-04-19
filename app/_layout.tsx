import '../global.css';
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/queries/profile';
import { supabase } from '@/lib/supabase';
import {
  registerForPushNotifications,
  addNotificationResponseListener,
  clearBadge,
  scheduleLocalAlerts,
} from '@/lib/notifications';
import { toISODateString } from '@/lib/formatters';
import { OfflineBanner } from '@/components/shared/OfflineBanner';

const queryClient = new QueryClient({
  defaultOptions: {
    // 15 min stale time — data stays visible all day at a festival with poor signal
    queries: { staleTime: 1000 * 60 * 15, retry: 2 },
  },
});

function RootLayoutNav() {
  const { session, loading, user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const segments = useSegments();
  const router = useRouter();

  // Deep link handler — catches password recovery links from email
  useEffect(() => {
    function handleDeepLink(url: string) {
      const hash = url.split('#')[1];
      if (!hash) return;
      const params = Object.fromEntries(new URLSearchParams(hash));
      if (params.type === 'recovery' && params.access_token) {
        supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token ?? '',
        }).then(() => {
          router.replace('/(auth)/reset-password');
        });
      }
    }

    Linking.getInitialURL().then((url) => { if (url) handleDeepLink(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, []);

  // Push notifications — register on first authenticated launch
  useEffect(() => {
    if (!user?.id) return;

    registerForPushNotifications(user.id);
    clearBadge();

    const sub = addNotificationResponseListener(() => {
      // Tapping a notification brings user to dashboard
      router.push('/(tabs)/dashboard');
    });

    return () => sub?.remove();
  }, [user?.id]);

  // Schedule local alerts whenever the session is active
  useEffect(() => {
    if (!user?.id) return;

    async function scheduleAlerts() {
      try {
        const today = toISODateString(new Date());

        const [unitsRes, eventsRes] = await Promise.all([
          supabase.from('units').select('name, mot_expiry, tax_expiry, service_date, service_interval'),
          supabase.from('events')
            .select('name, date, status, event_financials(gross_sales)')
            .eq('status', 'accepted')
            .lt('date', today),
        ]);

        const units = (unitsRes.data ?? []).map((u: any) => ({
          name: u.name,
          mot_expiry: u.mot_expiry,
          tax_expiry: u.tax_expiry,
          service_due: u.service_date ? (() => {
            const d = new Date(u.service_date);
            if (u.service_interval === '6months') d.setMonth(d.getMonth() + 6);
            else d.setFullYear(d.getFullYear() + 1);
            return toISODateString(d);
          })() : null,
        }));

        const pastEventsWithNoSales = (eventsRes.data ?? []).filter(
          (e: any) => !(e.event_financials?.gross_sales > 0),
        ).map((e: any) => ({ name: e.name, date: e.date }));

        await scheduleLocalAlerts({ units, pastEventsWithNoSales });
      } catch {
        // silently ignore — alerts are non-critical
      }
    }

    scheduleAlerts();
  }, [user?.id]);

  useEffect(() => {
    if (loading) return;
    if (profileLoading && session) return;
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
            <OfflineBanner />
            <RootLayoutNav />
            <StatusBar style="dark" />
          </AuthProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
