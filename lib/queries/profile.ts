import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { normalizeTradeType } from '@/lib/tradeTypeConfig';
import {
  mapProfileRow,
  isExplicitTradeTypeFor,
  POSTGREST_NO_ROWS,
  type ProfileRow,
} from '@/lib/profileHelpers';
import type {
  Metric,
  SubscriptionStatus,
  UserProfile,
} from '@/lib/queries/profile.types';

// Re-export types + pure helpers so existing call sites importing
// from this module keep working unchanged. The pure helpers live in
// lib/profileHelpers.ts so the test suite can require them without
// dragging in the Supabase client (which needs env vars at import
// time and would otherwise crash the tsx runner).
export type { Metric, SubscriptionStatus, UserProfile };
export { mapProfileRow, isExplicitTradeTypeFor };

const PROFILE_FIELDS = `
  id,
  business_name,
  business_type,
  currency,
  custom_metrics,
  subscription_status,
  subscription_product_id,
  subscription_expires_at,
  subscription_will_renew,
  reviewer_grandfathered
`;

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async (): Promise<UserProfile> => {
      if (!userId) {
        // Should not happen because enabled: !!userId, but be explicit.
        throw new Error('useProfile called without a userId');
      }
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_FIELDS)
        .eq('id', userId)
        .single<ProfileRow>();

      // Self-heal: the auth-trigger that creates a profile row on
      // signup doesn't fire for every account (manual SQL, OAuth flows
      // that bypass the trigger, accounts created before the trigger
      // existed). Previously, a missing row caused this function to
      // silently return null, which left every downstream consumer
      // falling through to the 'Other' fallback while the user thought
      // their saves were succeeding.
      //
      // Use UPSERT (not INSERT) so a race condition — the row being
      // created between our SELECT and this write — doesn't produce a
      // duplicate-key error. ON CONFLICT DO UPDATE SET id=id is a
      // no-op for existing rows; RETURNING * still returns the row.
      // RLS policy "Users can insert own profile" gates this on
      // auth.uid() = id, so this can only touch the caller's row.
      if (error && error.code === POSTGREST_NO_ROWS) { // PGRST116
        const { data: healed, error: healError } = await supabase
          .from('profiles')
          .upsert({ id: userId }, { onConflict: 'id' })
          .select(PROFILE_FIELDS)
          .single<ProfileRow>();
        if (healError) throw healError;
        if (!healed) {
          throw new Error('Profile self-heal upsert returned no row');
        }
        return mapProfileRow(healed);
      }
      // Any other error is real — surface it to React Query so the UI
      // can render an error state instead of silently rendering the
      // "Other" fallback.
      if (error) throw error;
      if (!data) {
        throw new Error('Profile select returned no row and no error');
      }
      return mapProfileRow(data);
    },
    enabled: !!userId,
    // The profile is the source of truth for business_name, business_type
    // and entitlement state. We need the entitlement to refresh after a
    // sub renewal/cancellation, but constant refetches re-fire hydration
    // effects in screens like Settings. Strategy:
    //   • staleTime: 5 min — within this window, switching tabs uses cache
    //   • refetchInterval: 5 min — entitlement updates within 5 min of change
    //   • refetchOnWindowFocus: false — don't refetch every time the app
    //     comes back to foreground (was firing the hydration effect)
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

type EditableProfileFields = Pick<UserProfile, 'business_name' | 'business_type' | 'currency' | 'custom_metrics'>;

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<EditableProfileFields> }) => {
      // Upsert so a missing profile row gets recovered transparently.
      // Previously we used UPDATE — which silently matched zero rows
      // for users whose auth-trigger didn't fire, leaving the picker
      // in a state where "Saved — Coffee forecast loading…" appeared
      // but the row was never actually written. Upsert with onConflict
      // on the PK collapses both paths: existing row → update, missing
      // row → insert. RLS policies cover both ("Users can update own
      // profile" / "Users can insert own profile") and both gate on
      // auth.uid() = id, so this can still only touch the caller's row.
      // Subscription columns are excluded — the DB trigger blocks them
      // anyway, and they're not in EditableProfileFields.
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: userId, ...updates }, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      // Verify the server actually applied each requested field. Without
      // this check a successful round-trip can still leave the DB
      // unchanged: a stale auth.uid() can let the upsert match zero
      // rows (returning the old SELECT row via PostgREST), or a future
      // RLS column-policy / BEFORE-UPDATE trigger could silently
      // rewrite the value. We compare per-field so a silent miswrite
      // on ANY editable column ("Saved!" alert but business name still
      // blank on next view) surfaces as an error rather than passing.
      for (const key of Object.keys(updates) as Array<keyof EditableProfileFields>) {
        const sent = updates[key];
        const got = (data as Record<string, unknown>)[key];
        if (sent === undefined) continue;

        if (key === 'business_type') {
          // Canonicalise via normalizeTradeType so a server that
          // title-cases ("coffee" → "Coffee") doesn't trip the check.
          const sentNorm = normalizeTradeType(sent as string);
          const gotNorm = normalizeTradeType(got as string | null);
          if (sentNorm !== gotNorm) {
            throw new Error(
              `Server did not persist business_type='${String(sent)}' — ` +
              `read back '${String(got)}'. Check RLS policy and triggers on profiles table.`
            );
          }
          continue;
        }

        if (key === 'business_name' || key === 'currency') {
          // Plain string comparison (trim defensively — the server
          // shouldn't be adding whitespace but if it does, the user
          // still entered what they entered).
          const sentStr = typeof sent === 'string' ? sent.trim() : '';
          const gotStr = typeof got === 'string' ? got.trim() : '';
          if (sentStr !== gotStr) {
            throw new Error(
              `Server did not persist ${key}='${sentStr}' — ` +
              `read back '${gotStr}'. Check RLS policy and triggers on profiles table.`
            );
          }
          continue;
        }

        // custom_metrics: shape comparison is fragile, so just verify
        // the array length matches what we sent. A trigger that
        // replaced the array would show a different length.
        if (key === 'custom_metrics') {
          const sentLen = Array.isArray(sent) ? sent.length : -1;
          const gotLen = Array.isArray(got) ? got.length : -1;
          if (sentLen !== gotLen) {
            throw new Error(
              `Server did not persist custom_metrics (length ${sentLen} → ${gotLen}). ` +
              `Check RLS policy and triggers on profiles table.`
            );
          }
          continue;
        }
      }
      return data;
    },
    onSuccess: async (_, { userId }) => {
      // Await the refetch so callers using mutateAsync see fresh data
      // before they navigate away.
      await qc.invalidateQueries({ queryKey: ['profile', userId] });
      await qc.refetchQueries({ queryKey: ['profile', userId] });
    },
  });
}
