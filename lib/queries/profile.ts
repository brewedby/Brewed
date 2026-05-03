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
      return {
        id: data.id,
        business_name: data.business_name,
        business_type: data.business_type ?? 'Coffee',
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
    // Re-check entitlement every 5 min so a renewal/cancellation reflects without restart
    refetchInterval: 1000 * 60 * 5,
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
