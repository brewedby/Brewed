import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, TouchableWithoutFeedback, Keyboard, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/themeContext';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const p = tokens.palette;
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const codeRef = useRef<TextInput>(null);
  const router = useRouter();
  const { setIsRecoveryMode } = useAuth();

  async function handleSendCode() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) {
      // Distinguish the rate-limit case: Supabase throttles OTP requests
      // to one per 60s, which the "Resend code" button hits easily. The
      // old copy told a real account-holder "No account found", so they
      // assumed their account was gone. Also avoid asserting non-existence
      // for other failures (network, generic) — that both misleads and
      // leaks whether an email is registered.
      const msg = (error.message ?? '').toLowerCase();
      const isRateLimit =
        error.status === 429 ||
        msg.includes('rate limit') ||
        msg.includes('after 60 seconds') ||
        msg.includes('only request this after');
      if (isRateLimit) {
        Alert.alert('Please wait a moment', 'You can request another code in about a minute. Check your inbox and spam folder in the meantime.');
      } else {
        Alert.alert(
          'Could not send code',
          "We couldn't send a code to that address. Check it's typed correctly and that you have signal, then try again.",
        );
      }
      return;
    }
    setStep('code');
    setTimeout(() => codeRef.current?.focus(), 300);
  }

  async function handleVerifyCode() {
    if (code.length !== 6) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });
    setLoading(false);
    if (error) {
      Alert.alert('Invalid code', 'That code is incorrect or has expired. Check your email and try again.');
      setCode('');
      return;
    }
    setIsRecoveryMode(true);
    router.replace('/(auth)/reset-password');
  }

  function handleBack() {
    if (step === 'code') {
      setCode('');
      setStep('email');
    } else {
      router.back();
    }
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
              accessibilityLabel="Back"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 16 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Ionicons name="chevron-back" size={14} color={p.brand} />
              <Text style={{ color: p.brand, fontSize: 13, fontWeight: '600' }}>
                {step === 'code' ? 'Back' : 'Sign in'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Title ── */}
          <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: p.text }}>
            <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 2, fontWeight: '700' }}>
              {step === 'email' ? 'RESET BY POST' : 'CHECK YOUR EMAIL'}
            </Text>
            <Text style={{
              fontFamily: tokens.type.display,
              fontWeight: tokens.type.displayWeight,
              fontSize: 32, letterSpacing: -0.7, lineHeight: 34,
              marginTop: 6, color: p.text,
            }}>
              {step === 'email' ? 'Lost your key?' : 'Six digits, please.'}
            </Text>
            <Text style={{ fontSize: 12, color: p.textMuted, fontStyle: 'italic', marginTop: 8, lineHeight: 18 }}>
              {step === 'email'
                ? "Enter your email and we'll send a 6-digit code. No links to click — just type the code on the next page."
                : `We sent a 6-digit code to ${email}. The code expires in 60 minutes.`}
            </Text>
          </View>

          {/* ── Form ── */}
          <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16, gap: 18 }}>
            {step === 'email' ? (
              <>
                <View>
                  <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 6 }}>
                    {'EMAIL ADDRESS'}
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
                      returnKeyType="done"
                      onSubmitEditing={handleSendCode}
                      autoFocus
                      accessibilityLabel="Email address"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleSendCode}
                  disabled={!email.trim() || loading}
                  accessibilityRole="button"
                  accessibilityLabel="Send reset code"
                  style={{
                    backgroundColor: p.text, paddingVertical: 14,
                    alignItems: 'center', minHeight: 48,
                    opacity: email.trim().length > 0 && !loading ? 1 : 0.5,
                  }}
                >
                  {loading
                    ? <ActivityIndicator color={p.bg} />
                    : <Text style={{ color: p.bg, fontWeight: '700', fontSize: 12, letterSpacing: 2 }}>{'SEND CODE'}</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View>
                  <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 8 }}>
                    {'6-DIGIT CODE'}
                  </Text>
                  <TextInput
                    ref={codeRef}
                    style={{
                      borderWidth: 1, borderColor: p.text, backgroundColor: p.surface,
                      paddingVertical: 16,
                      fontFamily: tokens.type.display,
                      fontSize: 32, letterSpacing: 10,
                      textAlign: 'center', color: p.text,
                    }}
                    placeholder="000000"
                    placeholderTextColor={p.borderStrong}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={code}
                    onChangeText={setCode}
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyCode}
                    accessibilityLabel="6-digit reset code"
                  />
                  <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic', marginTop: 6 }}>
                    The code is in the email — check spam if you don't see it.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleVerifyCode}
                  disabled={code.length !== 6 || loading}
                  accessibilityRole="button"
                  accessibilityLabel="Verify code and continue"
                  style={{
                    backgroundColor: p.text, paddingVertical: 14,
                    alignItems: 'center', minHeight: 48,
                    opacity: code.length === 6 && !loading ? 1 : 0.5,
                  }}
                >
                  {loading
                    ? <ActivityIndicator color={p.bg} />
                    : <Text style={{ color: p.bg, fontWeight: '700', fontSize: 12, letterSpacing: 2 }}>{'CONTINUE'}</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSendCode}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="Resend code"
                  style={{ alignItems: 'center', paddingVertical: 12 }}
                >
                  <Text style={{ color: p.brand, fontSize: 13, fontWeight: '600', fontStyle: 'italic' }}>Resend code</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          <View style={{ height: 28 + insets.bottom }} />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
