import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';

const REFRESH_TOKEN_KEY = 'brewed_refresh_token';
const BIOMETRIC_ENABLED_KEY = 'brewed_biometric_enabled';
export const REMEMBER_ME_KEY = 'brewed_remember_me';

export async function isBiometricAvailable(): Promise<boolean> {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && isEnrolled;
}

export async function isBiometricEnabled(): Promise<boolean> {
  const flag = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return flag === 'true';
}

export async function getBiometricType(): Promise<'face' | 'touch' | 'none'> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'touch';
  return 'none';
}

export async function enableBiometric(refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
}

export async function disableBiometric(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
}

export async function signInWithBiometric(): Promise<{ success: boolean; error?: string }> {
  const isEnabled = await isBiometricEnabled();
  if (!isEnabled) return { success: false, error: 'not_configured' };

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Sign in to Brewed',
    cancelLabel: 'Use password',
    disableDeviceFallback: false,
  });

  if (!result.success) return { success: false, error: 'cancelled' };

  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    await disableBiometric();
    return { success: false, error: 'no_token' };
  }

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    await disableBiometric();
    return { success: false, error: 'session_expired' };
  }

  // Supabase rotates refresh tokens — always store the latest
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.session.refresh_token);
  return { success: true };
}
