import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DailyTakingsForm } from '@/types';

export function useUpsertDailyTakings(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: DailyTakingsForm) => {
      const { error } = await supabase
        .from('daily_takings')
        .upsert({
          event_id: eventId,
          day_date: data.day_date,
          day_number: data.day_number,
          total_takings: data.total_takings,
          hot_drinks_sales: data.hot_drinks_sales,
          iced_drinks_sales: data.iced_drinks_sales,
          avg_temp_c: data.avg_temp_c,
          weather_code: data.weather_code,
          notes: data.notes || null,
        }, { onConflict: 'event_id,day_date' });
      if (error) throw error;
    },
    onSuccess: async () => {
      const { data: allDays } = await supabase
        .from('daily_takings')
        .select('total_takings, hot_drinks_sales, iced_drinks_sales')
        .eq('event_id', eventId);

      if (allDays && allDays.length > 0) {
        const totalGross = allDays.reduce((s, d) => s + d.total_takings, 0);
        const totalHot = allDays.reduce((s, d) => s + d.hot_drinks_sales, 0);
        const totalIced = allDays.reduce((s, d) => s + d.iced_drinks_sales, 0);
        await supabase.from('event_financials').upsert({
          event_id: eventId,
          gross_sales: totalGross,
          standard_rated_sales: totalHot,
          zero_rated_sales: totalIced,
        }, { onConflict: 'event_id', ignoreDuplicates: false });
      }

      qc.invalidateQueries({ queryKey: ['daily_takings', eventId] });
      qc.invalidateQueries({ queryKey: ['daily_takings_all'] });
      qc.invalidateQueries({ queryKey: ['events', eventId] });
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
