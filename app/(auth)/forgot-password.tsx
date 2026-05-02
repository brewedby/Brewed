import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, TouchableWithoutFeedback, Keyboard, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export default function ForgotPasswordScreen() {
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
      Alert.alert(
        'Could not send code',
        'No account found with that email address. Double-check the address and try again.',
      );
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
    // OTP verified — user is now signed in; route to reset-password
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

            <TouchableOpacity
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 16 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 36, alignSelf: 'flex-start' }}
            >
              <Ionicons name="chevron-back" size={18} color="#78716c" />
              <Text style={{ color: '#78716c', fontSize: 15 }}>{step === 'code' ? 'Back' : 'Sign In'}</Text>
            </TouchableOpacity>

            <View style={{
              width: 56, height: 56, borderRadius: 16,
              backgroundColor: '#78350f',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
            }}>
              <Ionicons name={step === 'code' ? 'mail' : 'key'} size={26} color="#fbbf24" />
            </View>

            {step === 'email' ? (
              <>
                <Text style={{ color: '#ffffff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 }}>
                  Reset password
                </Text>
                <Text style={{ color: '#78716c', fontSize: 15, lineHeight: 22, marginBottom: 32 }}>
                  Enter your email and we'll send a 6-digit code to reset your password. No links — just enter the code in the next step.
                </Text>

                <Text style={{ color: '#d6d3d1', fontWeight: '600', fontSize: 14, marginBottom: 8 }}>
                  Email address
                </Text>
                <TextInput
                  style={{
                    backgroundColor: '#1c1917', color: '#ffffff',
                    paddingHorizontal: 16, paddingVertical: 14,
                    borderRadius: 14, borderWidth: 1, borderColor: '#292524',
                    fontSize: 16, marginBottom: 24,
                  }}
                  placeholder="you@example.com"
                  placeholderTextColor="#57534e"
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

                <TouchableOpacity
                  style={{
                    backgroundColor: '#b45309',
                    paddingVertical: 16, borderRadius: 14, alignItems: 'center',
                    opacity: email.trim().length > 0 && !loading ? 1 : 0.5,
                  }}
                  onPress={handleSendCode}
                  disabled={!email.trim() || loading}
                  accessibilityRole="button"
                  accessibilityLabel="Send reset code"
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>Send code</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={{ color: '#ffffff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 }}>
                  Check your email
                </Text>
                <Text style={{ color: '#78716c', fontSize: 15, lineHeight: 22, marginBottom: 4 }}>
                  We sent a 6-digit code to
                </Text>
                <Text style={{ color: '#d6d3d1', fontSize: 15, fontWeight: '600', marginBottom: 32 }}>
                  {email}
                </Text>

                <Text style={{ color: '#d6d3d1', fontWeight: '600', fontSize: 14, marginBottom: 8 }}>
                  6-digit code
                </Text>
                <TextInput
                  ref={codeRef}
                  style={{
                    backgroundColor: '#1c1917', color: '#ffffff',
                    paddingHorizontal: 16, paddingVertical: 16,
                    borderRadius: 14, borderWidth: 1, borderColor: '#292524',
                    fontSize: 32, fontWeight: '700', letterSpacing: 10,
                    textAlign: 'center', marginBottom: 8,
                  }}
                  placeholder="000000"
                  placeholderTextColor="#44403c"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={setCode}
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyCode}
                  accessibilityLabel="6-digit reset code"
                />
                <Text style={{ color: '#57534e', fontSize: 13, marginBottom: 28 }}>
                  The code is in the email — check your spam folder if you don't see it.
                </Text>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#b45309',
                    paddingVertical: 16, borderRadius: 14, alignItems: 'center',
                    opacity: code.length === 6 && !loading ? 1 : 0.5,
                  }}
                  onPress={handleVerifyCode}
                  disabled={code.length !== 6 || loading}
                  accessibilityRole="button"
                  accessibilityLabel="Verify code and continue"
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>Continue</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ alignItems: 'center', paddingVertical: 16 }}
                  onPress={handleSendCode}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="Resend code"
                >
                  <Text style={{ color: '#f59e0b', fontSize: 14, fontWeight: '500' }}>Resend code</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
