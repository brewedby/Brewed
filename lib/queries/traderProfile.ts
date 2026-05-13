// Single shared resolver for "what trade is this user running?"
//
// Before this hook, COGS and PredictionInsightCard each called
// useProfile() directly and gated on  !profileLoading && !profileError
// && !!profile. That gate had two flaws:
//
//   1. React Query keeps the last successful `data` across background
//      refetches, but still flips `isError` to true when the refetch
//      fails. The naive AND-gate then rendered the "Couldn't load your
//      trader profile" banner even though we had perfectly good
//      profile data sitting in `data` from the prior fetch.
//
//   2. There was no fallback for cold-start failures. If the very
//      first useProfile fetch failed (network blip, JWT race after
//      sign-in, RLS issue), the user was locked out of COGS and the
//      forecast until React Query's refetchInterval (5 min) kicked in.
//
// useTraderProfile() fixes both:
//
//   • Treats live `data` as authoritative whenever it exists, even if
//     `isError` is also set — that means a refetch failure no longer
//     hides the categories the user has been seeing for the last
//     5 minutes.
//
//   • Mirrors every successful profile to AsyncStorage under a key
//     scoped by userId. When the live fetch errors and React Query
//     has no data of its own (cold-start case), the cached profile is
//     used and we mark `source: 'cache'` so the UI can render a
//     subtle "showing cached data" hint without locking the user out.
//
//   • Returns an explicit four-state status — `loading | ready |
//     incomplete | error` — so callers can branch cleanly. `incomplete`
//     means the fetch succeeded but the user has not yet picked a
//     trade type; the UI should prompt them to choose, not render the
//     'Other' fallback categories.
//
// Persistence rules (Part 3 requirements):
//
//   • The hook never writes to the network; only useUpdateProfile()
//     mutates the DB. Cache writes mirror successful reads only.
//   • AsyncStorage key is `@traderProfile:<userId>`; cross-account
//     collisions are impossible.
//   • Sign-out does NOT clear the AsyncStorage cache — it stays
//     namespaced by userId, so the next sign-in for the same user has
//     an immediate fallback and the user isn't briefly locked into
//     "Couldn't load" while the network round-trips.

import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/queries/profile';
import { getTradeConfig, normalizeTradeType } from '@/lib/tradeTypeConfig';
import {
  resolveStatus,
  type TraderProfileStatus,
  type TraderProfileSource,
} from '@/lib/queries/traderProfileLogic';
import type { UserProfile } from '@/lib/queries/profile.types';

// Re-export the pure logic types/function so the public surface stays unchanged.
export { resolveStatus } from '@/lib/queries/traderProfileLogic';
export type { TraderProfileStatus, TraderProfileSource };

export interface ResolvedTraderProfile {
  status: TraderProfileStatus;
  userId: string | null;
  /** The full profile if available (from live fetch or cache), else null. */
  profile: UserProfile | null;
  businessName: string | null;
  /** Canonical key from normalizeTradeType, e.g. 'Coffee'. 'Other' is a fallback only. */
  tradeType: string;
  /** Trade config's display label (e.g. 'Coffee' or 'General'). */
  displayLabel: string;
  source: TraderProfileSource;
  /** Real fetch error from React Query, only set when status === 'error'. */
  error: Error | null;
  /** Force a fresh refetch — invalidates the cache, then refetches. */
  retry: () => Promise<void>;
}

const CACHE_KEY_PREFIX = '@traderProfile:';
const cacheKey = (userId: string) => `${CACHE_KEY_PREFIX}${userId}`;

async function readCachedProfile(userId: string): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    // AsyncStorage corruption / JSON parse — treat as no cache.
    return null;
  }
}

async function writeCachedProfile(userId: string, profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(userId), JSON.stringify(profile));
  } catch {
    // Non-fatal: we just don't have an offline fallback.
  }
}

export function useTraderProfile(): ResolvedTraderProfile {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  const {
    data: profile,
    isLoading: profileLoading,
    isFetching: profileFetching,
    isError: profileIsError,
    error: profileError,
    refetch: refetchProfile,
  } = useProfile(userId ?? undefined);

  const [cached, setCached] = useState<UserProfile | null>(null);
  const [cacheLoading, setCacheLoading] = useState(true);

  // Hydrate AsyncStorage cache whenever the userId changes.
  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setCached(null);
      setCacheLoading(false);
      return;
    }
    setCacheLoading(true);
    readCachedProfile(userId).then((p) => {
      if (!cancelled) {
        setCached(p);
        setCacheLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [userId]);

  // Mirror every successful profile fetch to AsyncStorage so we have
  // an offline fallback for the next cold start.
  useEffect(() => {
    if (!userId || !profile) return;
    writeCachedProfile(userId, profile);
    // Update in-memory cached state too so subsequent error states
    // immediately have access to the latest data.
    setCached(profile);
  }, [userId, profile]);

  // Surface fetch errors to the Metro console (dev-only). Without this
  // we can't tell why useProfile failed on a user's device; with it,
  // Metro logs show the underlying Supabase error code so we can fix
  // the root cause instead of guessing.
  //
  // Supabase's PostgrestError is a plain object (NOT an Error instance)
  // with { code, message, details, hint }. String() on it gives the
  // unhelpful "[object Object]" — so we destructure deliberately.
  useEffect(() => {
    if (!__DEV__) return;
    if (!profileIsError) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = profileError as any;
    const code    = e?.code    ?? null;
    const message = e?.message ?? (e instanceof Error ? e.message : String(e));
    const details = e?.details ?? null;
    const hint    = e?.hint    ?? null;
    // eslint-disable-next-line no-console
    console.warn('[useTraderProfile] profile fetch error:', { code, message, details, hint });
  }, [profileIsError, profileError]);

  const retry = useCallback(async () => {
    if (!userId) return;
    await qc.invalidateQueries({ queryKey: ['profile', userId] });
    await refetchProfile();
  }, [qc, userId, refetchProfile]);

  const { status, source, chosen } = resolveStatus({
    userId,
    live: profile ?? null,
    cached,
    isFetching: profileLoading || profileFetching,
    isCacheLoading: cacheLoading,
    isError: profileIsError,
  });

  const rawBusinessType = chosen?.business_type ?? '';
  const tradeType = normalizeTradeType(rawBusinessType);
  const displayLabel = getTradeConfig(tradeType).label;

  return {
    status,
    userId,
    profile: chosen,
    businessName: chosen?.business_name ?? null,
    tradeType,
    displayLabel,
    source,
    error: status === 'error' && profileError instanceof Error ? profileError : null,
    retry,
  };
}
