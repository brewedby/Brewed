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
