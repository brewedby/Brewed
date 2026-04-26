import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DailyTakings } from '@/types';
import type { EventFinancialSummary } from '@/lib/drinkSplitEngine';

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

export function useHistoricalEventSplits() {
  return useQuery({
    queryKey: ['historical_event_splits'],
    queryFn: async (): Promise<EventFinancialSummary[]> => {
      const { data, error } = await supabase
        .from('events')
        .select('date, event_financials(standard_rated_sales, zero_rated_sales)')
        .eq('status', 'accepted')
        .not('event_financials', 'is', null);
      if (error) throw error;

      return (data ?? [])
        .filter((e) => {
          const f = e.event_financials;
          return f && (f.standard_rated_sales + f.zero_rated_sales) > 0;
        })
        .map((e) => ({
          standard_rated_sales: e.event_financials?.standard_rated_sales ?? 0,
          zero_rated_sales: e.event_financials?.zero_rated_sales ?? 0,
          avg_temp_c: null,
          month: parseInt(e.date.split('-')[1], 10),
        }));
    },
    staleTime: 1000 * 60 * 10,
  });
}

