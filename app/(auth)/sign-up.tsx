import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/themeContext';
import { TONE } from '@/lib/theme';

const CURRENT_YEAR = new Date().getFullYear();

type Strength = { label: string; color: string; bars: number };

function scorePassword(pw: string, faintColor: string): Strength {
  if (!pw) return { label: '', color: faintColor, bars: 0 };
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw))   score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { label: 'WEAK',   color: TONE.bad,     bars: 1 };
  if (score <= 3) return { label: 'FAIR',   color: TONE.caution, bars: 2 };
  return              { label: 'STRONG', color: TONE.good,    bars: 3 };
}

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tokens } = useTheme();
  const p = tokens.palette;
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailRef    = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef  = useRef<TextInput>(null);

  const strength       = useMemo(() => scorePassword(password, p.textFaint), [password, p.textFaint]);
  const passwordsMatch = confirmPassword.length === 0 || confirmPassword === password;
  const canSubmit =
    email.trim().length > 0 &&
    password.length >= 6 &&
    confirmPassword === password &&
    !loading;

  async function handleSignUp() {
    if (!canSubmit) return;
    if (password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { Alert.alert('Error', 'Passwords do not match.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { business_name: businessName.trim() } },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Sign up failed', error.message);
    } else {
      Alert.alert('Account created!', 'Check your email to confirm your account before signing in.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        {/* ── Top masthead ── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 18, borderBottomWidth: 2, borderBottomColor: p.text, alignItems: 'center' }}>
          <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 3, fontWeight: '700' }}>
            {`EST. 2024 · VOL. ${CURRENT_YEAR}`}
          </Text>
          <Text style={{
            fontFamily: tokens.type.display,
            fontWeight: tokens.type.displayWeight,
            fontSize: 48, letterSpacing: -1.4, lineHeight: 50,
            marginTop: 6, color: p.text,
          }}>
            A fresh ledger
          </Text>
          <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic', marginTop: 6 }}>
            Pull up a chair. Get the books open.
          </Text>
        </View>

        {/* ── Form ── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8, gap: 18 }}>
          {/* Business name */}
          <View>
            <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 6 }}>
              {'BUSINESS NAME'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: p.text, paddingBottom: 6 }}>
              <Ionicons name="business-outline" size={14} color={p.textMuted} />
              <TextInput
                style={{ flex: 1, fontSize: 16, color: p.text, padding: 0 }}
                placeholder="Brewed by Boon Ltd"
                placeholderTextColor={p.textFaint}
                autoCapitalize="words"
                value={businessName}
                onChangeText={setBusinessName}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                blurOnSubmit={false}
                accessibilityLabel="Business name"
              />
            </View>
          </View>

          {/* Email */}
          <View>
            <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 6 }}>
              {'EMAIL'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: p.text, paddingBottom: 6 }}>
              <Ionicons name="mail-outline" size={14} color={p.textMuted} />
              <TextInput
                ref={emailRef}
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
            <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 6 }}>
              {'PASSWORD'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: p.text, paddingBottom: 6 }}>
              <Ionicons name="lock-closed-outline" size={14} color={p.textMuted} />
              <TextInput
                ref={passwordRef}
                style={{ flex: 1, fontSize: 16, color: p.text, padding: 0, fontFamily: tokens.type.mono, letterSpacing: showPassword ? 0 : 4 }}
                placeholder="Min. 6 characters"
                placeholderTextColor={p.textFaint}
                secureTextEntry={!showPassword}
                autoComplete="password-new"
                value={password}
                onChangeText={setPassword}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                blurOnSubmit={false}
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
            {password.length > 0 && (
              <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 4, flex: 1 }}>
                  {[1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={{
                        flex: 1, height: 3,
                        backgroundColor: i <= strength.bars ? strength.color : p.borderStrong,
                      }}
                    />
                  ))}
                </View>
                <Text style={{ color: strength.color, fontSize: 9, fontWeight: '700', letterSpacing: 1.5, minWidth: 50 }}>
                  {strength.label}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm password */}
          <View>
            <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 6 }}>
              {'CONFIRM PASSWORD'}
            </Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              borderBottomWidth: 1,
              borderBottomColor: !passwordsMatch ? TONE.bad : p.text,
              paddingBottom: 6,
            }}>
              <Ionicons name="lock-closed-outline" size={14} color={p.textMuted} />
              <TextInput
                ref={confirmRef}
                style={{ flex: 1, fontSize: 16, color: p.text, padding: 0, fontFamily: tokens.type.mono, letterSpacing: showConfirm ? 0 : 4 }}
                placeholder="Re-enter password"
                placeholderTextColor={p.textFaint}
                secureTextEntry={!showConfirm}
                autoComplete="password-new"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
                accessibilityLabel="Confirm password"
              />
              <TouchableOpacity
                onPress={() => setShowConfirm((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={showConfirm ? 'Hide password' : 'Show password'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={14} color={p.textMuted} />
              </TouchableOpacity>
            </View>
            {!passwordsMatch && (
              <Text style={{ color: TONE.bad, fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                Passwords don't match
              </Text>
            )}
          </View>

          {/* Create account */}
          <TouchableOpacity
            onPress={handleSignUp}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="Create account"
            accessibilityState={{ disabled: !canSubmit }}
            style={{
              backgroundColor: p.text, paddingVertical: 14,
              alignItems: 'center', minHeight: 48, marginTop: 4,
              opacity: canSubmit ? 1 : 0.5,
            }}
          >
            {loading
              ? <ActivityIndicator color={p.bg} />
              : <Text style={{ color: p.bg, fontWeight: '700', fontSize: 12, letterSpacing: 2 }}>{'CREATE ACCOUNT'}</Text>}
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 28 + insets.bottom, marginTop: 16, borderTopWidth: 1, borderTopColor: p.border, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: p.textMuted, fontStyle: 'italic' }}>Already on the round?</Text>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity
              accessibilityRole="link"
              accessibilityLabel="Sign in"
              style={{ paddingVertical: 6, marginTop: 2 }}
            >
              <Text style={{ color: p.brand, fontFamily: tokens.type.display, fontSize: 16, letterSpacing: 0.3 }}>
                Sign in →
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
