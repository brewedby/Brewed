import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '@/lib/supabase';
import {
  isBiometricAvailable, isBiometricEnabled, enableBiometric,
  signInWithBiometric, getBiometricType, REMEMBER_ME_KEY,
} from '@/lib/biometrics';

export default function SignInScreen() {
  const router = useRouter();
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
    // Offer biometric setup on first successful sign-in
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
    // user_cancel: no alert needed
  }

  const biometricIcon = biometricType === 'face' ? 'scan-outline' : 'finger-print-outline';
  const biometricLabel = biometricType === 'face' ? 'Face ID' : 'Touch ID';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0c0a09' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 48 }}>

          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 44 }}>
            <View style={{
              width: 80, height: 80, borderRadius: 22,
              backgroundColor: '#78350f',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
              shadowColor: '#b45309', shadowOpacity: 0.5,
              shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
              elevation: 8,
            }}>
              <Ionicons name="cafe" size={40} color="#fbbf24" />
            </View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#ffffff', letterSpacing: -0.5 }}>
              Brewed
            </Text>
            <Text style={{ color: '#78716c', marginTop: 6, fontSize: 15 }}>
              Mobile Trader Platform
            </Text>
          </View>

          <View style={{ gap: 16 }}>
            {/* Email */}
            <View>
              <Text style={{ color: '#d6d3d1', marginBottom: 8, fontWeight: '600', fontSize: 14 }}>
                Email
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#1c1917', color: '#ffffff',
                  paddingHorizontal: 16, paddingVertical: 14,
                  borderRadius: 14, borderWidth: 1, borderColor: '#292524', fontSize: 16,
                }}
                placeholder="you@example.com"
                placeholderTextColor="#57534e"
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

            {/* Password */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: '#d6d3d1', fontWeight: '600', fontSize: 14 }}>Password</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/forgot-password')}
                  accessibilityRole="button"
                  accessibilityLabel="Forgot password"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                >
                  <Text style={{ color: '#f59e0b', fontSize: 13, fontWeight: '500' }}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={{ position: 'relative' }}>
                <TextInput
                  ref={passwordRef}
                  style={{
                    backgroundColor: '#1c1917', color: '#ffffff',
                    paddingHorizontal: 16, paddingVertical: 14, paddingRight: 48,
                    borderRadius: 14, borderWidth: 1, borderColor: '#292524', fontSize: 16,
                  }}
                  placeholder="••••••••"
                  placeholderTextColor="#57534e"
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
                  style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#78716c" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember Me */}
            <TouchableOpacity
              onPress={() => setRememberMe((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityLabel="Keep me signed in"
              accessibilityState={{ checked: rememberMe }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}
            >
              <View style={{
                width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                borderColor: rememberMe ? '#b45309' : '#44403c',
                backgroundColor: rememberMe ? '#b45309' : 'transparent',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={{ color: '#a8a29e', fontSize: 14 }}>Keep me signed in</Text>
            </TouchableOpacity>

            {/* Sign In */}
            <TouchableOpacity
              style={{
                backgroundColor: '#b45309',
                paddingVertical: 16, borderRadius: 14, alignItems: 'center',
                opacity: canSubmit ? 1 : 0.5,
              }}
              onPress={handleSignIn}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityState={{ disabled: !canSubmit }}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>Sign In</Text>}
            </TouchableOpacity>

            {/* Biometric sign-in */}
            {biometricEnabled && (
              <TouchableOpacity
                onPress={handleBiometricSignIn}
                disabled={biometricLoading || loading}
                accessibilityRole="button"
                accessibilityLabel={`Sign in with ${biometricLabel}`}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 10, paddingVertical: 16, borderRadius: 14,
                  borderWidth: 1, borderColor: '#292524',
                  opacity: biometricLoading || loading ? 0.5 : 1,
                }}
              >
                {biometricLoading
                  ? <ActivityIndicator color="#f59e0b" />
                  : (
                    <>
                      <Ionicons name={biometricIcon as any} size={22} color="#f59e0b" />
                      <Text style={{ color: '#d6d3d1', fontWeight: '600', fontSize: 15 }}>
                        Sign in with {biometricLabel}
                      </Text>
                    </>
                  )}
              </TouchableOpacity>
            )}

            {/* Sign up link */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
              <Text style={{ color: '#78716c', fontSize: 14 }}>Don't have an account? </Text>
              <Link href="/(auth)/sign-up">
                <Text style={{ color: '#f59e0b', fontWeight: '600', fontSize: 14 }}>Sign up</Text>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
