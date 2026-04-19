import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP / forgot-password flow
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const otpRef = useRef<TextInput>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;
  const canVerify = otpCode.trim().length === 6 && !verifyingOtp;

  async function handleSignIn() {
    if (!canSubmit) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) Alert.alert('Sign in failed', error.message);
  }

  async function handleSendOtp() {
    if (!email.trim()) {
      Alert.alert('Enter your email', 'Type your email address above then tap "Forgot password?" again.');
      return;
    }
    setSendingOtp(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    setSendingOtp(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setOtpSent(true);
      setOtpCode('');
      setTimeout(() => otpRef.current?.focus(), 300);
    }
  }

  async function handleVerifyOtp() {
    if (!canVerify) return;
    setVerifyingOtp(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otpCode.trim(),
      type: 'email',
    });
    setVerifyingOtp(false);
    if (error) {
      Alert.alert('Invalid code', 'That code is incorrect or has expired. Try requesting a new one.');
    }
    // on success the auth listener in _layout.tsx redirects automatically
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-stone-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-12">
          <View className="items-center mb-10">
            <View
              style={{
                width: 84,
                height: 84,
                borderRadius: 24,
                backgroundColor: '#78350f',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18,
                elevation: 6,
                shadowColor: '#b45309',
                shadowOpacity: 0.45,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: 10,
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  borderWidth: 2,
                  borderColor: 'rgba(251, 191, 36, 0.25)',
                }}
              />
              <Ionicons name="cafe" size={44} color="#fbbf24" />
            </View>
            <Text className="text-3xl font-bold text-white">Brewed by Boon</Text>
            <Text className="text-stone-400 mt-1">Coffee Truck Management</Text>
          </View>

          <View className="gap-4">
            <View>
              <Text className="text-stone-300 mb-1.5 font-medium">Email</Text>
              <TextInput
                className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border border-stone-700"
                placeholder="you@example.com"
                placeholderTextColor="#78716c"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={(v) => { setEmail(v); setOtpSent(false); setOtpCode(''); }}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View>
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-stone-300 font-medium">Password</Text>
                <TouchableOpacity
                  onPress={otpSent ? handleSendOtp : handleSendOtp}
                  disabled={sendingOtp}
                  accessibilityRole="button"
                >
                  <Text className="text-amber-500 text-xs font-medium">
                    {sendingOtp ? 'Sending…' : otpSent ? 'Resend code' : 'Forgot password?'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                ref={passwordRef}
                className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border border-stone-700"
                placeholder="••••••••"
                placeholderTextColor="#78716c"
                secureTextEntry
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
              />
            </View>

            {otpSent && (
              <View>
                <Text className="text-stone-300 mb-1.5 font-medium">
                  6-digit code from your email
                </Text>
                <TextInput
                  ref={otpRef}
                  className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border border-amber-700 tracking-widest text-center text-xl"
                  placeholder="000000"
                  placeholderTextColor="#78716c"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyOtp}
                />
                <TouchableOpacity
                  className="bg-amber-700 py-4 rounded-xl items-center mt-3"
                  style={{ opacity: canVerify ? 1 : 0.6 }}
                  onPress={handleVerifyOtp}
                  disabled={!canVerify}
                  accessibilityRole="button"
                >
                  {verifyingOtp
                    ? <ActivityIndicator color="#fff" />
                    : <Text className="text-white font-semibold text-base">Sign in with code</Text>}
                </TouchableOpacity>
                <Text className="text-stone-500 text-xs text-center mt-2">
                  Check your inbox — the code expires in 1 hour
                </Text>
              </View>
            )}

            {!otpSent && (
              <TouchableOpacity
                className="bg-amber-700 py-4 rounded-xl items-center mt-2"
                style={{ opacity: canSubmit ? 1 : 0.6 }}
                onPress={handleSignIn}
                disabled={!canSubmit}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold text-base">Sign In</Text>
                )}
              </TouchableOpacity>
            )}

            <View className="flex-row justify-center mt-4">
              <Text className="text-stone-400">Don't have an account? </Text>
              <Link href="/(auth)/sign-up">
                <Text className="text-amber-500 font-medium">Sign up</Text>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
