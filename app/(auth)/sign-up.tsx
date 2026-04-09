import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function SignUpScreen() {
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { business_name: businessName } },
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
            <View className="w-20 h-20 rounded-2xl bg-amber-700 items-center justify-center mb-4">
              <Text className="text-4xl">☕</Text>
            </View>
            <Text className="text-3xl font-bold text-white">Create Account</Text>
            <Text className="text-stone-400 mt-1">Start tracking your events</Text>
          </View>

          <View className="gap-4">
            <View>
              <Text className="text-stone-300 mb-1.5 font-medium">Business Name</Text>
              <TextInput
                className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border border-stone-700"
                placeholder="Brewed by Boon Ltd"
                placeholderTextColor="#78716c"
                autoCapitalize="words"
                value={businessName}
                onChangeText={setBusinessName}
              />
            </View>

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
                onChangeText={setEmail}
              />
            </View>

            <View>
              <Text className="text-stone-300 mb-1.5 font-medium">Password</Text>
              <TextInput
                className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border border-stone-700"
                placeholder="Min. 6 characters"
                placeholderTextColor="#78716c"
                secureTextEntry
                autoComplete="password-new"
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity
              className="bg-amber-700 py-4 rounded-xl items-center mt-2"
              onPress={handleSignUp}
              disabled={loading}
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
