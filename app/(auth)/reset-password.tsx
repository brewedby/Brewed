import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  ScrollView, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

const MIN_PASSWORD_LENGTH = 8;

type Strength = { label: string; color: string; bars: number };

function scorePassword(pw: string): Strength {
  if (pw.length < MIN_PASSWORD_LENGTH) return { label: `Too short (${MIN_PASSWORD_LENGTH}+ chars)`, color: '#ef4444', bars: 0 };
  let score = 1;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { label: 'Weak',   color: '#ef4444', bars: 1 };
  if (score <= 3) return { label: 'Fair',   color: '#f59e0b', bars: 2 };
  if (score <= 4) return { label: 'Good',   color: '#22c55e', bars: 3 };
  return               { label: 'Strong', color: '#16a34a', bars: 4 };
}

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const confirmRef = useRef<TextInput>(null);
  const router = useRouter();
  const { setIsRecoveryMode } = useAuth();

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
      // Clear recovery mode, sign out the recovery session, then go to sign-in
      setIsRecoveryMode(false);
      await supabase.auth.signOut();
      Alert.alert(
        'Password updated',
        'Your password has been changed. Sign in with your new password.',
        [{ text: 'Sign In', onPress: () => router.replace('/(auth)/sign-in') }],
      );
    }
  }

  function handleBack() {
    setIsRecoveryMode(false);
    router.replace('/(auth)/sign-in');
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0c0a09' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 64, paddingBottom: 40 }}>

            {/* Back link */}
            <TouchableOpacity
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Back to sign in"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 16 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 36, alignSelf: 'flex-start' }}
            >
              <Ionicons name="chevron-back" size={18} color="#78716c" />
              <Text style={{ color: '#78716c', fontSize: 15 }}>Sign In</Text>
            </TouchableOpacity>

            {/* Heading */}
            <View style={{ marginBottom: 32 }}>
              <View style={{
                width: 56, height: 56, borderRadius: 16,
                backgroundColor: '#78350f',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
              }}>
                <Ionicons name="lock-closed" size={26} color="#fbbf24" />
              </View>
              <Text style={{ color: '#ffffff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 }}>
                Set new password
              </Text>
              <Text style={{ color: '#78716c', fontSize: 15, lineHeight: 22 }}>
                Choose a strong password for your Brewed account.
              </Text>
            </View>

            {/* New password */}
            <View style={{ marginBottom: 8 }}>
              <Text style={{ color: '#d6d3d1', fontWeight: '600', fontSize: 14, marginBottom: 8 }}>
                New password
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={{
                    backgroundColor: '#1c1917', color: '#ffffff',
                    paddingHorizontal: 16, paddingVertical: 14, paddingRight: 50,
                    borderRadius: 14, borderWidth: 1,
                    borderColor: password.length > 0 && password.length < MIN_PASSWORD_LENGTH ? '#ef4444' : '#292524',
                    fontSize: 16,
                  }}
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                  placeholderTextColor="#57534e"
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
                  style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#78716c" />
                </TouchableOpacity>
              </View>

              {/* Strength meter */}
              {password.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3, 4].map((bar) => (
                      <View
                        key={bar}
                        style={{
                          flex: 1, height: 3, borderRadius: 2,
                          backgroundColor: bar <= strength.bars ? strength.color : '#292524',
                        }}
                      />
                    ))}
                  </View>
                  {strength.label ? (
                    <Text style={{ color: strength.color, fontSize: 12, fontWeight: '500' }}>
                      {strength.label}
                    </Text>
                  ) : null}
                </View>
              )}
            </View>

            {/* Confirm password */}
            <View style={{ marginBottom: 28 }}>
              <Text style={{ color: '#d6d3d1', fontWeight: '600', fontSize: 14, marginBottom: 8 }}>
                Confirm password
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  ref={confirmRef}
                  style={{
                    backgroundColor: '#1c1917', color: '#ffffff',
                    paddingHorizontal: 16, paddingVertical: 14, paddingRight: 50,
                    borderRadius: 14, borderWidth: 1,
                    borderColor: mismatch ? '#ef4444' : '#292524',
                    fontSize: 16,
                  }}
                  placeholder="Repeat your new password"
                  placeholderTextColor="#57534e"
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
                  style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}
                >
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#78716c" />
                </TouchableOpacity>
              </View>
              {mismatch && (
                <Text style={{ color: '#ef4444', fontSize: 13, marginTop: 6 }}>
                  Passwords don't match
                </Text>
              )}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={{
                backgroundColor: '#b45309',
                paddingVertical: 16, borderRadius: 14,
                alignItems: 'center',
                opacity: canSubmit ? 1 : 0.5,
              }}
              onPress={handleReset}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel="Update password"
              accessibilityState={{ disabled: !canSubmit }}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>Update password</Text>}
            </TouchableOpacity>

          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
