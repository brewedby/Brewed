import '../global.css';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/queries/profile';
import { supabase } from '@/lib/supabase';
import { useNetworkStatus } from '@/lib/useNetworkStatus';
import { OfflineBanner } from '@/components/shared/OfflineBanner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 15, retry: 2, gcTime: 1000 * 60 * 60 * 24 },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'brewed:query-cache',
  throttleTime: 3000,
});

function RootLayoutNav() {
  const { session, loading, user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const segments = useSegments();
  const router = useRouter();

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

function OfflineBannerWrapper() {
  const isOnline = useNetworkStatus();
  if (isOnline) return null;
  return <OfflineBanner />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
        >
          <AuthProvider>
            <View style={{ flex: 1 }}>
              <OfflineBannerWrapper />
              <RootLayoutNav />
            </View>
            <StatusBar style="dark" />
          </AuthProvider>
        </PersistQueryClientProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
