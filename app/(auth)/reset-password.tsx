import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  ScrollView, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/themeContext';
import { TONE } from '@/lib/theme';

const MIN_PASSWORD_LENGTH = 8;

type Strength = { label: string; color: string; bars: number };

function scorePassword(pw: string): Strength {
  if (pw.length < MIN_PASSWORD_LENGTH) return { label: `TOO SHORT (${MIN_PASSWORD_LENGTH}+ CHARS)`, color: TONE.bad, bars: 0 };
  let score = 1;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { label: 'WEAK',   color: TONE.bad,     bars: 1 };
  if (score <= 3) return { label: 'FAIR',   color: TONE.caution, bars: 2 };
  if (score <= 4) return { label: 'GOOD',   color: TONE.good,    bars: 3 };
  return               { label: 'STRONG', color: TONE.good,    bars: 4 };
}

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const p = tokens.palette;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const confirmRef = useRef<TextInput>(null);
  const router = useRouter();
  const { signOut } = useAuth();

  const strength = scorePassword(password);
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length >= MIN_PASSWORD_LENGTH && password === confirm && !loading;

  async function handleReset() {
    if (!canSubmit) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      const isExpired = error.message.toLowerCase().includes('expired') || error.message.toLowerCase().includes('invalid');
      Alert.alert(
        isExpired ? 'Link expired' : 'Could not update password',
        isExpired
          ? 'This reset link has expired. Please request a new one from the sign-in screen.'
          : error.message,
        [{ text: 'OK' }],
      );
    } else {
      // Route through useAuth().signOut() so the biometric refresh
      // token gets cleared too — otherwise the user who reset their
      // password would still see "Sign in with Face ID" against a
      // refresh token that's about to be revoked by Supabase.
      await signOut();
      Alert.alert(
        'Password updated',
        'Your password has been changed. Sign in with your new password.',
        [{ text: 'Sign In', onPress: () => router.replace('/(auth)/sign-in') }],
      );
    }
  }

  async function handleBack() {
    await signOut();
    router.replace('/(auth)/sign-in');
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
            <TouchableOpacity
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Back to sign in"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 16 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Ionicons name="chevron-back" size={14} color={p.brand} />
              <Text style={{ color: p.brand, fontSize: 13, fontWeight: '600' }}>Sign in</Text>
            </TouchableOpacity>
          </View>

          {/* ── Title ── */}
          <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: p.text }}>
            <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 2, fontWeight: '700' }}>
              {'NEW KEY'}
            </Text>
            <Text style={{
              fontFamily: tokens.type.display,
              fontWeight: tokens.type.displayWeight,
              fontSize: 32, letterSpacing: -0.7, lineHeight: 34,
              marginTop: 6, color: p.text,
            }}>
              Set a new password.
            </Text>
            <Text style={{ fontSize: 12, color: p.textMuted, fontStyle: 'italic', marginTop: 8, lineHeight: 18 }}>
              Choose a strong one. Eight characters minimum, mix of letters and numbers.
            </Text>
          </View>

          {/* ── Form ── */}
          <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16, gap: 18 }}>
            {/* New password */}
            <View>
              <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 6 }}>
                {'NEW PASSWORD'}
              </Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                borderBottomWidth: 1,
                borderBottomColor: password.length > 0 && password.length < MIN_PASSWORD_LENGTH ? TONE.bad : p.text,
                paddingBottom: 6,
              }}>
                <Ionicons name="lock-closed-outline" size={14} color={p.textMuted} />
                <TextInput
                  style={{ flex: 1, fontSize: 16, color: p.text, padding: 0, fontFamily: tokens.type.mono, letterSpacing: showPassword ? 0 : 4 }}
                  placeholder={`Min. ${MIN_PASSWORD_LENGTH} characters`}
                  placeholderTextColor={p.textFaint}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  value={password}
                  onChangeText={setPassword}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  blurOnSubmit={false}
                  accessibilityLabel="New password"
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

              {/* Strength meter */}
              {password.length > 0 && (
                <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 4, flex: 1 }}>
                    {[1, 2, 3, 4].map((bar) => (
                      <View
                        key={bar}
                        style={{
                          flex: 1, height: 3,
                          backgroundColor: bar <= strength.bars ? strength.color : p.borderStrong,
                        }}
                      />
                    ))}
                  </View>
                  <Text style={{ color: strength.color, fontSize: 9, fontWeight: '700', letterSpacing: 1.5, minWidth: 60 }}>
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
                borderBottomColor: mismatch ? TONE.bad : p.text,
                paddingBottom: 6,
              }}>
                <Ionicons name="lock-closed-outline" size={14} color={p.textMuted} />
                <TextInput
                  ref={confirmRef}
                  style={{ flex: 1, fontSize: 16, color: p.text, padding: 0, fontFamily: tokens.type.mono, letterSpacing: showConfirm ? 0 : 4 }}
                  placeholder="Repeat your new password"
                  placeholderTextColor={p.textFaint}
                  secureTextEntry={!showConfirm}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  value={confirm}
                  onChangeText={setConfirm}
                  returnKeyType="done"
                  onSubmitEditing={handleReset}
                  accessibilityLabel="Confirm new password"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={14} color={p.textMuted} />
                </TouchableOpacity>
              </View>
              {mismatch && (
                <Text style={{ color: TONE.bad, fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                  Passwords don't match
                </Text>
              )}
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleReset}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel="Update password"
              accessibilityState={{ disabled: !canSubmit }}
              style={{
                backgroundColor: p.text, paddingVertical: 14,
                alignItems: 'center', minHeight: 48, marginTop: 4,
                opacity: canSubmit ? 1 : 0.5,
              }}
            >
              {loading
                ? <ActivityIndicator color={p.bg} />
                : <Text style={{ color: p.bg, fontWeight: '700', fontSize: 12, letterSpacing: 2 }}>{'UPDATE PASSWORD'}</Text>}
            </TouchableOpacity>
          </View>
          <View style={{ height: 28 + insets.bottom }} />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
