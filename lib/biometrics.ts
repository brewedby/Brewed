/**
 * Face ID / Touch ID app lock.
 *
 * Design: the Supabase session stays persisted as normal ("Keep me signed
 * in"); when the lock is on, the app content is covered on cold start and
 * after RELOCK_AFTER_MS in the background until the user passes a
 * biometric (or device-passcode) check. See components/shared/AppLock.tsx.
 *
 * Why not "sign in with Face ID"? The previous design stored a Supabase
 * refresh token in SecureStore and replayed it from the sign-in screen.
 * It could never work: every path back to the sign-in screen (sign-out,
 * remember-me off) had to wipe that token, and when a session expired on
 * its own the stored token had long since been rotated by auto-refresh,
 * so the replay always failed with "Session expired". No refresh token is
 * stored by this module any more; the legacy keys are purged on sight.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const APP_LOCK_KEY = 'brewed_app_lock';
// Legacy keys from the refresh-token design — deleted, never read.
const LEGACY_KEYS = ['brewed_refresh_token', 'brewed_biometric_enabled'];
export const REMEMBER_ME_KEY = 'brewed_remember_me';

export { RELOCK_AFTER_MS, shouldRelock } from './appLockLogic';

export async function isBiometricAvailable(): Promise<boolean> {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && isEnrolled;
}

export async function getBiometricType(): Promise<'face' | 'touch' | 'none'> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'touch';
  return 'none';
}

export function biometricLabel(type: 'face' | 'touch' | 'none'): string {
  return type === 'touch' ? 'Touch ID' : 'Face ID';
}

export async function isAppLockEnabled(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(APP_LOCK_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function enableAppLock(): Promise<void> {
  await SecureStore.setItemAsync(APP_LOCK_KEY, 'true');
  await purgeLegacyKeys();
}

/**
 * Turn the app lock off and purge any legacy stored refresh token.
 * Called on sign-out so the next account on this device starts unlocked
 * and opts in for itself.
 */
export async function disableBiometric(): Promise<void> {
  await SecureStore.deleteItemAsync(APP_LOCK_KEY);
  await purgeLegacyKeys();
}

async function purgeLegacyKeys(): Promise<void> {
  for (const key of LEGACY_KEYS) {
    try { await SecureStore.deleteItemAsync(key); } catch { /* absent */ }
  }
}

export type UnlockResult = 'success' | 'cancelled' | 'unavailable';

/**
 * Prompt for Face ID / Touch ID, falling back to the device passcode.
 * 'unavailable' means the device has no biometrics AND no passcode, so a
 * lock cannot be enforced — the caller should not trap the user.
 */
export async function authenticate(promptMessage: string): Promise<UnlockResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    if (result.success) return 'success';
    if (result.error === 'not_enrolled' || result.error === 'passcode_not_set' || result.error === 'not_available') {
      return 'unavailable';
    }
    return 'cancelled';
  } catch {
    return 'cancelled';
  }
}
