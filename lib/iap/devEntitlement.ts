/**
 * Development-only entitlement override.
 *
 * Lets a developer force the app to behave as 'none' | 'trader' | 'pro'
 * to test gating WITHOUT touching the server or buying sandbox
 * subscriptions.
 *
 * SHIPPING SAFETY — three independent layers make this impossible to
 * leak into production as unrestricted access:
 *
 *   1. Every function body is behind `if (!__DEV__) return …`. In a
 *      release bundle __DEV__ is compile-time false, so Metro's dead-code
 *      elimination strips the override paths entirely.
 *   2. The override lives only in AsyncStorage on the developer's own
 *      device — there is no server flag, no remote config, no way to set
 *      it for another user.
 *   3. It can only LOWER or simulate a tier for gating tests; the layout
 *      paywall still uses the server-derived isEntitled, so a production
 *      build could never unlock paid features through this file even if
 *      layers 1–2 failed.
 *
 * Usage (dev builds only, e.g. from a debugger console):
 *   setDevTierOverride('trader')  → app gates as a Trader subscriber
 *   setDevTierOverride('none')    → app gates as unsubscribed
 *   setDevTierOverride(null)      → clear, back to real server state
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SubscriptionTier } from './entitlements';

const KEY = '@devTierOverride:v1';

const VALID: SubscriptionTier[] = ['none', 'trader', 'pro'];

export async function getDevTierOverride(): Promise<SubscriptionTier | null> {
  if (!__DEV__) return null;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw && (VALID as string[]).includes(raw) ? (raw as SubscriptionTier) : null;
  } catch {
    return null;
  }
}

export async function setDevTierOverride(tier: SubscriptionTier | null): Promise<void> {
  if (!__DEV__) return;
  try {
    if (tier === null) await AsyncStorage.removeItem(KEY);
    else if ((VALID as string[]).includes(tier)) await AsyncStorage.setItem(KEY, tier);
  } catch {
    // dev tool — failures are irrelevant
  }
}
