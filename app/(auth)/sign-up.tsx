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
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw))   score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { label: 'Weak',   color: '#ef4444', bars: 1 };
  if (score <= 3) return { label: 'Fair',   color: '#f59e0b', bars: 2 };
  return              { label: 'Strong', color: '#22c55e', bars: 3 };
}

function PasswordInput({
  inputRef,
  value,
  onChange,
  placeholder,
  returnKeyType,
  onSubmit,
  label,
  showToggle = true,
}: {
  inputRef?: React.RefObject<TextInput | null>;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  returnKeyType?: 'next' | 'done';
  onSubmit?: () => void;
  label: string;
  showToggle?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ position: 'relative' }}>
      <TextInput
        ref={inputRef}
        style={{
          backgroundColor: '#1c1917', color: '#ffffff',
          paddingHorizontal: 16, paddingVertical: 14, paddingRight: showToggle ? 48 : 16,
          borderRadius: 14, borderWidth: 1, borderColor: '#292524', fontSize: 15,
        }}
        placeholder={placeholder}
        placeholderTextColor="#57534e"
        secureTextEntry={!show}
        autoComplete="password-new"
        value={value}
        onChangeText={onChange}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmit}
        blurOnSubmit={!onSubmit}
        accessibilityLabel={label}
      />
      {showToggle && (
        <TouchableOpacity
          onPress={() => setShow((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={show ? 'Hide password' : 'Show password'}
          style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}
        >
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color="#78716c" />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function SignUpScreen() {
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const emailRef    = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef  = useRef<TextInput>(null);

  const strength       = useMemo(() => scorePassword(password), [password]);
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

  const labelStyle = { color: '#d6d3d1', marginBottom: 8, fontWeight: '600' as const, fontSize: 14 };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0c0a09' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 48 }}>

          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
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
              Create Account
            </Text>
            <Text style={{ color: '#78716c', marginTop: 6, fontSize: 15 }}>
              Start tracking your events
            </Text>
          </View>

          <View style={{ gap: 16 }}>

            {/* Business name */}
            <View>
              <Text style={labelStyle}>Business Name</Text>
              <TextInput
                style={{
                  backgroundColor: '#1c1917', color: '#ffffff',
                  paddingHorizontal: 16, paddingVertical: 14,
                  borderRadius: 14, borderWidth: 1, borderColor: '#292524', fontSize: 15,
                }}
                placeholder="Brewed by Boon Ltd"
                placeholderTextColor="#57534e"
                autoCapitalize="words"
                value={businessName}
                onChangeText={setBusinessName}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                blurOnSubmit={false}
                accessibilityLabel="Business name"
              />
            </View>

            {/* Email */}
            <View>
              <Text style={labelStyle}>Email</Text>
              <TextInput
                ref={emailRef}
                style={{
                  backgroundColor: '#1c1917', color: '#ffffff',
                  paddingHorizontal: 16, paddingVertical: 14,
                  borderRadius: 14, borderWidth: 1, borderColor: '#292524', fontSize: 15,
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
              <Text style={labelStyle}>Password</Text>
              <PasswordInput
                inputRef={passwordRef}
                value={password}
                onChange={setPassword}
                placeholder="Min. 6 characters"
                returnKeyType="next"
                onSubmit={() => confirmRef.current?.focus()}
                label="Password"
              />
              {password.length > 0 && (
                <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 4, flex: 1 }}>
                    {[1, 2, 3].map((i) => (
                      <View
                        key={i}
                        style={{
                          flex: 1, height: 4, borderRadius: 2,
                          backgroundColor: i <= strength.bars ? strength.color : '#292524',
                        }}
                      />
                    ))}
                  </View>
                  <Text style={{ color: strength.color, fontSize: 12, fontWeight: '600', minWidth: 46 }}>
                    {strength.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Confirm password */}
            <View>
              <Text style={labelStyle}>Confirm Password</Text>
              <View style={{
                borderRadius: 14, borderWidth: 1,
                borderColor: !passwordsMatch ? '#dc2626' : '#292524',
                overflow: 'hidden',
              }}>
                <PasswordInput
                  inputRef={confirmRef}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Re-enter your password"
                  returnKeyType="done"
                  onSubmit={handleSignUp}
                  label="Confirm password"
                />
              </View>
              {!passwordsMatch && (
                <Text style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>Passwords don't match</Text>
              )}
            </View>

            {/* Create account button */}
            <TouchableOpacity
              style={{
                backgroundColor: '#b45309',
                paddingVertical: 16, borderRadius: 14,
                alignItems: 'center', marginTop: 4,
                opacity: canSubmit ? 1 : 0.5,
              }}
              onPress={handleSignUp}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel="Create account"
              accessibilityState={{ disabled: !canSubmit }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Sign in link */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
              <Text style={{ color: '#78716c', fontSize: 14 }}>Already have an account? </Text>
              <Link href="/(auth)/sign-in">
                <Text style={{ color: '#f59e0b', fontWeight: '600', fontSize: 14 }}>Sign in</Text>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
