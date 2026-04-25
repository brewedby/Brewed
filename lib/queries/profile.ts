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

export interface UserProfile {
  id: string;
  business_name: string | null;
  business_type: string;
  currency: string;
  custom_metrics: Metric[];
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, business_name, business_type, currency, custom_metrics')
        .eq('id', userId)
        .single();
      if (error) return null;
      return {
        ...data,
        business_type: data.business_type ?? 'Coffee',
        currency: data.currency ?? 'GBP',
        custom_metrics: (data.custom_metrics ?? []) as Metric[],
      };
    },
    enabled: !!userId,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<Omit<UserProfile, 'id'>> }) => {
      const { error } = await supabase.from('profiles').upsert({ id: userId, ...updates });
      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}
