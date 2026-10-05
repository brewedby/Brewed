import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/themeContext';
import {
  authenticate, biometricLabel, disableBiometric, getBiometricType,
  isAppLockEnabled, shouldRelock,
} from '@/lib/biometrics';

/**
 * Covers the app with a lock screen when the Face ID app lock is on:
 *  - on cold start, if a persisted session was restored, and
 *  - on returning from the background after RELOCK_AFTER_MS.
 *
 * A fresh password sign-in never locks (the user just authenticated).
 * The navigation tree stays mounted underneath so unlocking returns the
 * user exactly where they were.
 */
export function AppLockGate() {
  const { session, loading, signOut } = useAuth();
  const { tokens } = useTheme();
  const p = tokens.palette;

  const [locked, setLocked] = useState(false);
  const [label, setLabel] = useState('Face ID');
  const backgroundedAt = useRef<number | null>(null);
  const prompting = useRef(false);
  const initialCheckDone = useRef(false);
  const hasSession = useRef(false);
  hasSession.current = !!session;

  // Cold start: lock only if the session was restored from storage.
  useEffect(() => {
    if (loading || initialCheckDone.current) return;
    initialCheckDone.current = true;
    if (!session) return;
    isAppLockEnabled().then((on) => { if (on) setLocked(true); });
  }, [loading, session]);

  // Signed out → nothing to protect.
  useEffect(() => {
    if (!session) setLocked(false);
  }, [session]);

  useEffect(() => {
    getBiometricType().then((t) => setLabel(biometricLabel(t))).catch(() => {});
    const sub = AppState.addEventListener('change', (state) => {
      // The Face ID sheet only makes the app 'inactive', never
      // 'background', so prompting can't re-trigger the lock.
      if (state === 'background') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active') {
        const since = backgroundedAt.current;
        backgroundedAt.current = null;
        if (!hasSession.current || since === null) return;
        isAppLockEnabled().then((on) => {
          if (shouldRelock(since, Date.now(), on)) setLocked(true);
        });
      }
    });
    return () => sub.remove();
  }, []);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    const result = await authenticate('Unlock Brewed');
    prompting.current = false;
    if (result === 'success') {
      setLocked(false);
    } else if (result === 'unavailable') {
      // No biometrics and no passcode any more — the lock can't be
      // enforced, so turn it off rather than trap the user.
      await disableBiometric();
      setLocked(false);
    }
  }, []);

  useEffect(() => {
    if (locked) unlock();
  }, [locked, unlock]);

  if (!locked || !session) return null;

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center', padding: 32, zIndex: 1000 }]}
      accessibilityViewIsModal
    >
      <Text style={{ fontFamily: tokens.type.display, fontWeight: tokens.type.displayWeight, fontSize: 48, color: p.text, letterSpacing: -1.4 }}>
        Brewed
      </Text>
      <Text style={{ fontSize: 12, color: p.textMuted, fontStyle: 'italic', marginTop: 6, marginBottom: 36 }}>
        The ledger is locked.
      </Text>
      <TouchableOpacity
        onPress={unlock}
        accessibilityRole="button"
        accessibilityLabel={`Unlock with ${label}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: p.text, paddingVertical: 14, paddingHorizontal: 28, minHeight: 48 }}
      >
        <Ionicons name={label === 'Touch ID' ? 'finger-print-outline' : 'scan-outline'} size={16} color={p.bg} />
        <Text style={{ color: p.bg, fontWeight: '700', fontSize: 12, letterSpacing: 2 }}>
          {`UNLOCK WITH ${label.toUpperCase()}`}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => { signOut(); }}
        accessibilityRole="button"
        accessibilityLabel="Sign out and use your password"
        style={{ paddingVertical: 14, marginTop: 12 }}
      >
        <Text style={{ color: p.brand, fontSize: 12, fontWeight: '600' }}>Sign out and use password</Text>
      </TouchableOpacity>
    </View>
  );
}
