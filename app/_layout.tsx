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
import { isProfileSetupComplete } from '@/lib/profileHelpers';
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

    // 1. No session and we're outside the auth group → bounce to sign-in.
    //    Doesn't depend on profile.
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
      return;
    }

    // 2. We have a session but we're stuck in the auth group → must escape,
    //    even if the profile is missing or errored. Previously this branch
    //    sat behind `if (!profile) return` further down, which meant a
    //    profile-load failure right after sign-in trapped the user on the
    //    sign-in screen forever (no spinner, no error — just nothing). We
    //    wait for the initial fetch to *settle* (so we know whether to
    //    head for onboarding or dashboard) but never indefinitely block
    //    the escape on profile being defined.
    if (session && inAuthGroup) {
      if (profileLoading) return;
      if (!profile) {
        // Profile errored on the initial post-sign-in fetch. Leaving the
        // user on the sign-in screen looks like sign-in failed. Send
        // them to the dashboard — the prediction card and other surfaces
        // render their own profile-error banners with a Retry CTA, and
        // React Query's retry policy will refetch in the background.
        router.replace('/(tabs)/dashboard');
        return;
      }
      const setupComplete = isProfileSetupComplete(profile);
      if (!setupComplete) {
        router.replace('/onboarding');
      } else if (!isEntitled && subReady) {
        router.replace('/(modal)/paywall');
      } else {
        router.replace('/(tabs)/dashboard');
      }
      return;
    }

    // Below this point we're signed in and outside the auth group. Every
    // remaining redirect inspects `profile.business_name`, so wait for
    // the profile fetch to settle. A transient undefined would otherwise
    // bounce a fully-onboarded user into /onboarding on every tab nav.
    //
    // `profile` undefined post-loading means the query errored (React
    // Query keeps previous data on background refetch errors, so this
    // only triggers on a hard initial failure). Don't redirect — let
    // React Query retry. The user stays where they are; the screen
    // they're on shows its own loading / error UI.
    if (profileLoading) return;
    if (!profile) return;

    const setupComplete = isProfileSetupComplete(profile);

    // Onboarding gate (must complete profile before paywall).
    if (!inOnboarding && !setupComplete) {
      router.replace('/onboarding');
      return;
    }

    // Subscription gate — keep paywall up unless entitled.
    // Allow privacy modal so users can read the privacy summary from paywall.
    if (
      setupComplete &&
      !isEntitled &&
      subReady &&
      !onPaywall &&
      !onPrivacy
    ) {
      router.replace('/(modal)/paywall');
      return;
    }

    // Entitled user landed on paywall (e.g. after restore) → leave it
    if (isEntitled && onPaywall) {
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
