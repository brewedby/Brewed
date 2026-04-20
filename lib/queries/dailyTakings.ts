import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DailyTakings } from '@/types';

export function useDailyTakings(eventId: string) {
  return useQuery({
    queryKey: ['daily_takings', eventId],
    queryFn: async (): Promise<DailyTakings[]> => {
      const { data, error } = await supabase
        .from('daily_takings')
        .select('*')
        .eq('event_id', eventId)
        .order('day_number');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!eventId,
  });
}

export function useAllDailyTakings() {
  return useQuery({
    queryKey: ['daily_takings_all'],
    queryFn: async (): Promise<DailyTakings[]> => {
      const { data, error } = await supabase
        .from('daily_takings')
        .select('*')
        .not('avg_temp_c', 'is', null)
        .not('hot_drinks_sales', 'eq', 0)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
