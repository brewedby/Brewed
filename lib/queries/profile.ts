import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { normalizeTradeType } from '@/lib/tradeTypeConfig';

export interface Metric {
  id: string;
  name: string;
  unit: string;
  enabled: boolean;
  builtin?: boolean;
  [key: string]: unknown;
}

export type SubscriptionStatus =
  | 'none'
  | 'active'
  | 'in_grace_period'
  | 'in_billing_retry'
  | 'expired'
  | 'revoked';

export interface UserProfile {
  id: string;
  business_name: string | null;
  business_type: string;
  currency: string;
  custom_metrics: Metric[];
  subscription_status: SubscriptionStatus;
  subscription_product_id: string | null;
  subscription_expires_at: string | null;
  subscription_will_renew: boolean;
  reviewer_grandfathered: boolean;
}

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
    queryFn: async (): Promise<UserProfile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_FIELDS)
        .eq('id', userId)
        .single();
      if (error) return null;
      // Return business_type as stored. Previously this loader coerced
      // empty/whitespace to 'Coffee' as a "defensive default" — but that
      // hid the real DB state from every downstream consumer (including
      // the picker's dev strip) and quietly disagreed with the central
      // resolver, which canonicalises empty → 'Other'. Now the resolver
      // is the single fallback authority; the loader just surfaces what
      // the DB actually has so silent miswrites stop being invisible.
      const rawBusinessType =
        typeof data.business_type === 'string' ? data.business_type : '';

      return {
        id: data.id,
        business_name: data.business_name,
        business_type: rawBusinessType,
        currency: data.currency ?? 'GBP',
        custom_metrics: (data.custom_metrics ?? []) as Metric[],
        subscription_status: (data.subscription_status ?? 'none') as SubscriptionStatus,
        subscription_product_id: data.subscription_product_id ?? null,
        subscription_expires_at: data.subscription_expires_at ?? null,
        subscription_will_renew: data.subscription_will_renew ?? false,
        reviewer_grandfathered: data.reviewer_grandfathered ?? false,
      };
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
      // The profile row is auto-created on signup by an auth trigger, so a
      // plain UPDATE is safer than UPSERT — it never accidentally inserts a
      // partial row, and surfaces RLS / column errors instead of no-op-ing.
      // Subscription columns are excluded — the DB trigger blocks client writes anyway.
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      // Verify the server actually applied each requested field. Without
      // this check a successful round-trip can still leave the DB
      // unchanged: a stale auth.uid() can let the UPDATE match zero rows
      // (returning the old SELECT row via PostgREST), or a future RLS
      // column-policy / BEFORE-UPDATE trigger could silently rewrite the
      // value. We canonicalise both sides via normalizeTradeType so a
      // server that title-cases ("coffee" → "Coffee") doesn't trip the
      // check.
      for (const key of Object.keys(updates) as Array<keyof EditableProfileFields>) {
        const sent = updates[key];
        const got = (data as Record<string, unknown>)[key];
        if (sent === undefined) continue;
        if (key === 'business_type') {
          const sentNorm = normalizeTradeType(sent as string);
          const gotNorm = normalizeTradeType(got as string | null);
          if (sentNorm !== gotNorm) {
            throw new Error(
              `Server did not persist business_type='${String(sent)}' — ` +
              `read back '${String(got)}'. Check RLS policy and triggers on profiles table.`
            );
          }
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
