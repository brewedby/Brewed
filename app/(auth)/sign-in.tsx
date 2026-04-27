import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  async function handleSignIn() {
    if (!canSubmit) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) Alert.alert('Sign in failed', error.message);
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      Alert.alert('Enter your email', 'Type your email address above, then tap Forgot password.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Check your email', `We've sent a password reset link to ${email.trim()}.`);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0c0a09' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
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
              Brewed by Boon
            </Text>
            <Text style={{ color: '#78716c', marginTop: 6, fontSize: 15 }}>
              Coffee Truck Management
            </Text>
          </View>

          {/* Form */}
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
                  borderRadius: 14, borderWidth: 1, borderColor: '#292524',
                  fontSize: 15,
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
                  onPress={handleForgotPassword}
                  accessibilityRole="button"
                  accessibilityLabel="Forgot password"
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
                    borderRadius: 14, borderWidth: 1, borderColor: '#292524',
                    fontSize: 15,
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
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#78716c"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign In button */}
            <TouchableOpacity
              style={{
                backgroundColor: '#b45309',
                paddingVertical: 16, borderRadius: 14,
                alignItems: 'center', marginTop: 4,
                opacity: canSubmit ? 1 : 0.5,
              }}
              onPress={handleSignIn}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityState={{ disabled: !canSubmit }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>Sign In</Text>
              )}
            </TouchableOpacity>

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
