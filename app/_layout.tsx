import '../global.css';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ThemeProvider, useTheme } from '@/lib/themeContext';
import { useProfile } from '@/lib/queries/profile';
import { SubscriptionProvider, useSubscription } from '@/lib/iap/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import { useNetworkStatus } from '@/lib/useNetworkStatus';
import { OfflineBanner } from '@/components/shared/OfflineBanner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 2 },
  },
});

function RootLayoutNav() {
  const { session, loading, user, isRecoveryMode, setIsRecoveryMode } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const { isEntitled, isReady: subReady } = useSubscription();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    function handleDeepLink(url: string) {
      const hash = url.split('#')[1];
      if (!hash) return;
      const params = Object.fromEntries(new URLSearchParams(hash));
      if (params.type === 'recovery' && params.access_token) {
        setIsRecoveryMode(true);
        supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token ?? '',
        });
      }
    }

    Linking.getInitialURL().then((url) => { if (url) handleDeepLink(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, [setIsRecoveryMode]);

  useEffect(() => {
    if (loading) return;

    // Recovery flow takes precedence
    if (isRecoveryMode) {
      router.replace('/(auth)/reset-password');
      return;
    }

    const segs = segments as string[];
    const inAuthGroup = segs[0] === '(auth)';
    const inOnboarding = segs[0] === 'onboarding';
    const inModal = segs[0] === '(modal)';
    const onPaywall = inModal && segs[1] === 'paywall';
    const onPrivacy = inModal && segs[1] === 'privacy';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
      return;
    }

    if (session && inAuthGroup) {
      if (!profile?.business_name) {
        router.replace('/onboarding');
      } else if (!isEntitled && subReady) {
        router.replace('/(modal)/paywall');
      } else {
        router.replace('/(tabs)/dashboard');
      }
      return;
    }

    // Onboarding gate (must complete profile before paywall)
    if (session && !inAuthGroup && !inOnboarding && !profile?.business_name && profile !== null && !profileLoading) {
      router.replace('/onboarding');
      return;
    }

    // Subscription gate — keep paywall up unless entitled.
    // Allow privacy modal so users can read the privacy summary from paywall.
    if (
      session &&
      profile?.business_name &&
      !isEntitled &&
      subReady &&
      !onPaywall &&
      !onPrivacy &&
      !inAuthGroup
    ) {
      router.replace('/(modal)/paywall');
      return;
    }

    // Entitled user landed on paywall (e.g. after restore) → leave it
    if (session && isEntitled && onPaywall) {
      router.replace('/(tabs)/dashboard');
    }
  }, [session, loading, segments, profile, profileLoading, isRecoveryMode, isEntitled, subReady]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(modal)" options={{ presentation: 'modal' }} />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}

function OfflineBannerWrapper() {
  const isOnline = useNetworkStatus();
  if (isOnline) return null;
  return <OfflineBanner />;
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'DMSerifDisplay-Regular': require('../assets/fonts/DMSerifDisplay-Regular.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <View style={{ flex: 1 }}>
                  <OfflineBannerWrapper />
                  <RootLayoutNav />
                </View>
                <ThemedStatusBar />
              </SubscriptionProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
