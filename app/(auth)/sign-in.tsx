import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/themeContext';
import {
  isBiometricAvailable, isBiometricEnabled, enableBiometric,
  signInWithBiometric, getBiometricType, REMEMBER_ME_KEY,
} from '@/lib/biometrics';

const CURRENT_YEAR = new Date().getFullYear();

function formatDateline(d: Date): string {
  const day = d.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
  const month = d.toLocaleDateString('en-GB', { month: 'long' }).toUpperCase();
  return `${day} · ${month} ${d.getDate()}`;
}

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tokens } = useTheme();
  const p = tokens.palette;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<'face' | 'touch' | 'none'>('none');
  const [biometricLoading, setBiometricLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const dateline = formatDateline(new Date());

  useEffect(() => {
    async function checkBiometrics() {
      const [available, enabled, type] = await Promise.all([
        isBiometricAvailable(),
        isBiometricEnabled(),
        getBiometricType(),
      ]);
      setBiometricAvailable(available);
      setBiometricEnabled(enabled);
      setBiometricType(type);
    }
    checkBiometrics();
  }, []);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  async function handleSignIn() {
    if (!canSubmit) return;
    setLoading(true);
    await SecureStore.setItemAsync(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      Alert.alert('Sign in failed', error.message);
      return;
    }
    if (biometricAvailable && !biometricEnabled && data.session) {
      const label = biometricType === 'face' ? 'Face ID' : 'Touch ID';
      Alert.alert(
        `Enable ${label}?`,
        `Sign in faster next time using ${label} — no password needed.`,
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: `Enable ${label}`,
            onPress: async () => {
              await enableBiometric(data.session!.refresh_token);
              setBiometricEnabled(true);
            },
          },
        ],
      );
    }
  }

  async function handleBiometricSignIn() {
    setBiometricLoading(true);
    const result = await signInWithBiometric();
    setBiometricLoading(false);
    if (!result.success && (result.error === 'session_expired' || result.error === 'no_token')) {
      setBiometricEnabled(false);
      Alert.alert('Session expired', 'Please sign in with your password. You can re-enable Face ID after signing in.');
    }
  }

  const biometricIcon = biometricType === 'face' ? 'scan-outline' : 'finger-print-outline';
  const biometricLabel = biometricType === 'face' ? 'Face ID' : 'Touch ID';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Top masthead ── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 18, borderBottomWidth: 2, borderBottomColor: p.text, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginBottom: 14 }}>
            <Text style={{ fontSize: 8, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700' }}>{dateline}</Text>
            <Text style={{ fontSize: 8, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700' }}>{`VOL. ${CURRENT_YEAR}`}</Text>
          </View>
          <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 3, fontWeight: '700' }}>
            {'EST. 2024'}
          </Text>
          <Text style={{
            fontFamily: tokens.type.display,
            fontWeight: tokens.type.displayWeight,
            fontSize: 56, letterSpacing: -1.7, lineHeight: 56,
            marginTop: 4,
            color: p.text,
          }}>
            Brewed
          </Text>
          <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic', marginTop: 6 }}>
            The trader's ledger — for the road.
          </Text>
        </View>

        {/* ── Hero ── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 4 }}>
          <Text style={{ fontSize: 10, color: p.textMuted, letterSpacing: 2, fontWeight: '700' }}>
            {'WELCOME BACK'}
          </Text>
          <Text style={{
            fontFamily: tokens.type.display,
            fontWeight: tokens.type.displayWeight,
            fontSize: 30, letterSpacing: -0.6, lineHeight: 32,
            marginTop: 6, color: p.text,
          }}>
            {'Open the books.\nGet back to the pitch.'}
          </Text>
        </View>

        {/* ── Form ── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8, gap: 18 }}>
          {/* Email */}
          <View>
            <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 6 }}>
              {'EMAIL'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: p.text, paddingBottom: 6 }}>
              <Ionicons name="mail-outline" size={14} color={p.textMuted} />
              <TextInput
                style={{ flex: 1, fontSize: 16, color: p.text, padding: 0 }}
                placeholder="you@example.com"
                placeholderTextColor={p.textFaint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
                accessibilityLabel="Email address"
              />
            </View>
          </View>

          {/* Password */}
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700' }}>
                {'PASSWORD'}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/forgot-password')}
                accessibilityRole="button"
                accessibilityLabel="Forgot password"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              >
                <Text style={{ color: p.brand, fontSize: 11, fontWeight: '600', fontStyle: 'italic' }}>Forgot?</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: p.text, paddingBottom: 6 }}>
              <Ionicons name="lock-closed-outline" size={14} color={p.textMuted} />
              <TextInput
                ref={passwordRef}
                style={{ flex: 1, fontSize: 16, color: p.text, padding: 0, fontFamily: tokens.type.mono, letterSpacing: showPassword ? 0 : 4 }}
                placeholder="••••••••"
                placeholderTextColor={p.textFaint}
                secureTextEntry={!showPassword}
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
                accessibilityLabel="Password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={14} color={p.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember me */}
          <TouchableOpacity
            onPress={() => setRememberMe((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityLabel="Keep me signed in on this van"
            accessibilityState={{ checked: rememberMe }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}
          >
            <View style={{
              width: 14, height: 14, borderWidth: 1.5, borderColor: p.text,
              alignItems: 'center', justifyContent: 'center',
            }}>
              {rememberMe && <View style={{ width: 8, height: 8, backgroundColor: p.text }} />}
            </View>
            <Text style={{ fontSize: 12, color: p.textMuted }}>Keep me signed in on this van</Text>
          </TouchableOpacity>

          {/* Sign in */}
          <TouchableOpacity
            onPress={handleSignIn}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            accessibilityState={{ disabled: !canSubmit }}
            style={{
              backgroundColor: p.text, paddingVertical: 14,
              alignItems: 'center', minHeight: 48, marginTop: 4,
              opacity: canSubmit ? 1 : 0.5,
            }}
          >
            {loading
              ? <ActivityIndicator color={p.bg} />
              : <Text style={{ color: p.bg, fontWeight: '700', fontSize: 12, letterSpacing: 2 }}>{'SIGN IN'}</Text>}
          </TouchableOpacity>

          {/* Biometric sign-in */}
          {biometricEnabled && (
            <TouchableOpacity
              onPress={handleBiometricSignIn}
              disabled={biometricLoading || loading}
              accessibilityRole="button"
              accessibilityLabel={`Sign in with ${biometricLabel}`}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                borderWidth: 1, borderColor: p.text,
                paddingVertical: 12, minHeight: 44,
                opacity: biometricLoading || loading ? 0.5 : 1,
              }}
            >
              {biometricLoading
                ? <ActivityIndicator color={p.brand} />
                : (
                  <>
                    <Ionicons name={biometricIcon} size={14} color={p.text} />
                    <Text style={{ color: p.text, fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>
                      {`SIGN IN WITH ${biometricLabel.toUpperCase()}`}
                    </Text>
                  </>
                )}
            </TouchableOpacity>
          )}
        </View>

        {/* ── Footer — sign up ── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 28 + insets.bottom, marginTop: 16, borderTopWidth: 1, borderTopColor: p.border, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: p.textMuted, fontStyle: 'italic' }}>New to the round?</Text>
          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity
              accessibilityRole="link"
              accessibilityLabel="Sign up"
              style={{ paddingVertical: 6, marginTop: 2 }}
            >
              <Text style={{ color: p.brand, fontFamily: tokens.type.display, fontSize: 16, letterSpacing: 0.3 }}>
                Start a fresh ledger →
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
