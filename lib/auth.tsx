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
  /** Signs out THIS device. Pass { scope: 'global' } to end every session
   *  for the account (e.g. after a password reset). */
  signOut: (opts?: { scope?: 'local' | 'global' }) => Promise<void>;
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
      // start, and turn the Face ID app lock off with it.
      //
      // scope: 'local' is essential. supabase-js defaults signOut() to
      // GLOBAL scope, which revoked every session on the account — so a
      // staff phone with "Keep me signed in" off logged the owner's
      // phone and the van iPad out every time it was opened.
      const rememberMe = await SecureStore.getItemAsync(REMEMBER_ME_KEY);
      if (rememberMe === 'false') {
        await disableBiometric();
        await supabase.auth.signOut({ scope: 'local' });
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

  const signOut = useCallback(async (opts: { scope?: 'local' | 'global' } = {}) => {
    // Sign-out must clean three pieces of state, in this order:
    //
    //   1. Biometric — turn the Face ID app lock off (and purge any
    //      legacy stored refresh token) so the next account on this
    //      device opts in for itself.
    //
    //   2. React Query cache — drop every cached query. Without this
    //      a transient profile-load failure stays sticky after sign-in
    //      because the queryKey ['profile', userId] is identical for
    //      the same account, so React Query reuses the prior error
    //      state until staleTime (5 min) expires. The user sees the
    //      "Couldn't load your trader profile" recovery banner even
    //      though they just signed in successfully.
    //
    //   3. Supabase — revoke this device's session (local scope by
    //      default; see the cold-start comment above). This fires
    //      onAuthStateChange('SIGNED_OUT'), which clears the session
    //      state and lets the layout redirect to the sign-in screen.
    //   4. Fleet reminders — cancel this user's scheduled MOT/tax/service
    //      notifications so the next account on this device doesn't
    //      inherit alerts about someone else's vehicles.
    setIsRecoveryMode(false);
    await disableBiometric();
    queryClient.clear();
    await clearFleetReminders();
    await supabase.auth.signOut({ scope: opts.scope ?? 'local' });
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
