import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

type Strength = { label: string; color: string; bars: number };

function scorePassword(pw: string): Strength {
  if (!pw) return { label: '', color: '#57534e', bars: 0 };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { label: 'Weak', color: '#ef4444', bars: 1 };
  if (score <= 3) return { label: 'Medium', color: '#f59e0b', bars: 2 };
  return { label: 'Strong', color: '#22c55e', bars: 3 };
}

export default function SignUpScreen() {
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const strength = useMemo(() => scorePassword(password), [password]);
  const passwordsMatch = confirmPassword.length === 0 || confirmPassword === password;
  const canSubmit =
    email.trim().length > 0 &&
    password.length >= 6 &&
    confirmPassword === password &&
    !loading;

  async function handleSignUp() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
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
      Alert.alert('Account created!', 'Please check your email to confirm your account.');
    }
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
            <Text className="text-3xl font-bold text-white">Create Account</Text>
            <Text className="text-stone-400 mt-1">Start tracking your events</Text>
          </View>

          <View className="gap-4">
            <View>
              <Text className="text-stone-300 mb-1.5 font-medium">Business Name</Text>
              <TextInput
                className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border border-stone-700"
                placeholder="e.g. My Trading Co Ltd"
                placeholderTextColor="#78716c"
                autoCapitalize="words"
                value={businessName}
                onChangeText={setBusinessName}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View>
              <Text className="text-stone-300 mb-1.5 font-medium">Email</Text>
              <TextInput
                ref={emailRef}
                className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border border-stone-700"
                placeholder="you@example.com"
                placeholderTextColor="#78716c"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View>
              <Text className="text-stone-300 mb-1.5 font-medium">Password</Text>
              <TextInput
                ref={passwordRef}
                className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border border-stone-700"
                placeholder="Min. 6 characters"
                placeholderTextColor="#78716c"
                secureTextEntry
                autoComplete="password-new"
                value={password}
                onChangeText={setPassword}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                blurOnSubmit={false}
              />
              {password.length > 0 && (
                <View className="mt-2 flex-row items-center gap-2">
                  <View className="flex-row gap-1 flex-1">
                    {[1, 2, 3].map((i) => (
                      <View
                        key={i}
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: i <= strength.bars ? strength.color : '#44403c',
                        }}
                      />
                    ))}
                  </View>
                  <Text style={{ color: strength.color, fontSize: 11, fontWeight: '600', minWidth: 54, textAlign: 'right' }}>
                    {strength.label}
                  </Text>
                </View>
              )}
            </View>

            <View>
              <Text className="text-stone-300 mb-1.5 font-medium">Confirm Password</Text>
              <TextInput
                ref={confirmRef}
                className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border"
                style={{ borderColor: passwordsMatch ? '#44403c' : '#dc2626' }}
                placeholder="Re-enter your password"
                placeholderTextColor="#78716c"
                secureTextEntry
                autoComplete="password-new"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
              />
              {!passwordsMatch && (
                <Text className="text-red-500 text-xs mt-1.5">Passwords don't match</Text>
              )}
            </View>

            <TouchableOpacity
              className="bg-amber-700 py-4 rounded-xl items-center mt-2"
              style={{ opacity: canSubmit ? 1 : 0.6 }}
              onPress={handleSignUp}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">Create Account</Text>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center mt-4">
              <Text className="text-stone-400">Already have an account? </Text>
              <Link href="/(auth)/sign-in">
                <Text className="text-amber-500 font-medium">Sign in</Text>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
