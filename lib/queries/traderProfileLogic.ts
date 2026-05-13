// Pure status-resolution logic for useTraderProfile.
//
// Extracted from traderProfile.ts so the tsx test runner can import
// it without dragging in React Native, AsyncStorage and the Supabase
// client (the same pattern as lib/profileHelpers.ts). traderProfile.ts
// re-exports resolveStatus from its public surface.

import type { UserProfile } from '@/lib/queries/profile.types';

export type TraderProfileStatus = 'loading' | 'ready' | 'incomplete' | 'error';
export type TraderProfileSource = 'profile' | 'cache' | 'fallback';

export interface ResolveStatusInput {
  userId: string | null;
  /** Latest data from React Query — may be stale from a previous fetch. */
  live: UserProfile | null;
  /** Fallback profile read from AsyncStorage. */
  cached: UserProfile | null;
  /** Either useProfile.isLoading OR useProfile.isFetching — anything still in flight. */
  isFetching: boolean;
  /** AsyncStorage hydration still pending. */
  isCacheLoading: boolean;
  /** useProfile.isError — set when the most recent fetch threw, regardless of prior data. */
  isError: boolean;
}

export interface ResolveStatusOutput {
  status: TraderProfileStatus;
  source: TraderProfileSource;
  /** The profile selected for downstream use; null when status is loading/error. */
  chosen: UserProfile | null;
}

/**
 * Decide which profile (live, cached, or none) downstream consumers
 * should use, and what status to surface.
 *
 * Priority:
 *  1. Pre-auth (no userId)                              → loading
 *  2. Live data (even when isError=true)                → ready or incomplete, source=profile
 *  3. Cached profile (live failed, no live data)        → ready or incomplete, source=cache
 *  4. Anything still in flight (fetch or cache hydrate) → loading
 *  5. No data + isError                                 → error
 *  6. No data + no error (initial pre-fire)             → loading
 */
export function resolveStatus(input: ResolveStatusInput): ResolveStatusOutput {
  const { userId, live, cached, isFetching, isCacheLoading, isError } = input;
  if (!userId) return { status: 'loading', source: 'fallback', chosen: null };

  if (live) {
    const nameOk = (live.business_name ?? '').trim().length > 0;
    const typeOk = (live.business_type ?? '').trim().length > 0;
    return {
      status: nameOk && typeOk ? 'ready' : 'incomplete',
      source: 'profile',
      chosen: live,
    };
  }
  if (cached) {
    const nameOk = (cached.business_name ?? '').trim().length > 0;
    const typeOk = (cached.business_type ?? '').trim().length > 0;
    return {
      status: nameOk && typeOk ? 'ready' : 'incomplete',
      source: 'cache',
      chosen: cached,
    };
  }
  if (isFetching || isCacheLoading) {
    return { status: 'loading', source: 'fallback', chosen: null };
  }
  if (isError) return { status: 'error', source: 'fallback', chosen: null };
  return { status: 'loading', source: 'fallback', chosen: null };
}
