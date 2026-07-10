import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { REMEMBER_ME_KEY, disableBiometric } from '@/lib/biometrics';
import { clearFleetReminders } from '@/lib/notifications';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isRecoveryMode: boolean;
  setIsRecoveryMode: (v: boolean) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  isRecoveryMode: false,
  setIsRecoveryMode: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const init = async () => {
      // "Keep me signed in" unchecked → burn the session on each cold
      // start. Also burn the biometric refresh token: supabase.signOut()
      // invalidates it server-side anyway, so leaving the local copy in
      // SecureStore would only cause a misleading "Session expired" alert
      // when the user opens the app and the sign-in screen tries to
      // refresh against the dead token.
      const rememberMe = await SecureStore.getItemAsync(REMEMBER_ME_KEY);
      if (rememberMe === 'false') {
        await disableBiometric();
        await supabase.auth.signOut();
        setSession(null);
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'SIGNED_OUT') {
        setIsRecoveryMode(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    // Sign-out must clean three pieces of state, in this order:
    //
    //   1. Biometric — clear REFRESH_TOKEN_KEY + BIOMETRIC_ENABLED_KEY
    //      from SecureStore BEFORE Supabase invalidates the token. The
    //      stored refresh token is about to be revoked server-side; if
    //      we leave it sitting locally with the enabled flag still
    //      true, the next sign-in screen auto-offers "Sign in with
    //      Face ID" which then 401s with "Session expired" — exactly
    //      the bug the user is hitting.
    //
    //   2. React Query cache — drop every cached query. Without this
    //      a transient profile-load failure stays sticky after sign-in
    //      because the queryKey ['profile', userId] is identical for
    //      the same account, so React Query reuses the prior error
    //      state until staleTime (5 min) expires. The user sees the
    //      "Couldn't load your trader profile" recovery banner even
    //      though they just signed in successfully.
    //
    //   3. Supabase — revoke the refresh token server-side. This fires
    //      onAuthStateChange('SIGNED_OUT'), which clears the session
    //      state and lets the layout redirect to the sign-in screen.
    //   4. Fleet reminders — cancel this user's scheduled MOT/tax/service
    //      notifications so the next account on this device doesn't
    //      inherit alerts about someone else's vehicles.
    setIsRecoveryMode(false);
    await disableBiometric();
    queryClient.clear();
    await clearFleetReminders();
    await supabase.auth.signOut();
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, isRecoveryMode, setIsRecoveryMode, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
