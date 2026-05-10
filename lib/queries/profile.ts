import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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
      // Defensive default: nullish coalescing (??) misses empty strings and
      // whitespace-only values that legacy rows can have. Treat any
      // "no usable value" state as "Coffee" so the prediction engine and
      // every other consumer get a canonical key. The user's explicit
      // choice of Other / Burgers / etc. is a non-empty string and never
      // hits this default.
      const rawBusinessType = (data.business_type ?? '').toString().trim();
      const businessType = rawBusinessType.length > 0 ? rawBusinessType : 'Coffee';

      return {
        id: data.id,
        business_name: data.business_name,
        business_type: businessType,
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
