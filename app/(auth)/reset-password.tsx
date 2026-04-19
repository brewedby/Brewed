import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const confirmRef = useRef<TextInput>(null);
  const router = useRouter();

  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length >= 6 && password === confirm && !loading;

  async function handleReset() {
    if (!canSubmit) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Password updated', 'Your password has been changed. Please sign in.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/sign-in') },
      ]);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-stone-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-white text-2xl font-bold mb-2">Set new password</Text>
        <Text className="text-stone-400 mb-8">Choose a new password for your account.</Text>

        <Text className="text-stone-300 mb-1.5 font-medium">New password</Text>
        <TextInput
          className="bg-stone-800 text-white px-4 py-3.5 rounded-xl border border-stone-700 mb-4"
          placeholder="At least 6 characters"
          placeholderTextColor="#78716c"
          secureTextEntry
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
          blurOnSubmit={false}
        />

        <Text className="text-stone-300 mb-1.5 font-medium">Confirm password</Text>
        <TextInput
          ref={confirmRef}
          className={`bg-stone-800 text-white px-4 py-3.5 rounded-xl border mb-2 ${mismatch ? 'border-red-500' : 'border-stone-700'}`}
          placeholder="Repeat your new password"
          placeholderTextColor="#78716c"
          secureTextEntry
          autoComplete="new-password"
          value={confirm}
          onChangeText={setConfirm}
          returnKeyType="done"
          onSubmitEditing={handleReset}
        />

        {mismatch && (
          <Text className="text-red-400 text-sm mb-4">Passwords don't match</Text>
        )}

        <TouchableOpacity
          className="bg-amber-700 py-4 rounded-xl items-center mt-4"
          style={{ opacity: canSubmit ? 1 : 0.6 }}
          onPress={handleReset}
          disabled={!canSubmit}
          accessibilityRole="button"
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-white font-semibold text-base">Update password</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
