import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DailyTakingsForm } from '@/types';

export function useUpsertDailyTakings(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    // The financials re-aggregation lives INSIDE mutationFn so a failure
    // rejects the mutation and reaches the card's catch/Alert. As an
    // onSuccess side-effect with its errors ignored, a failed SELECT or
    // upsert left the day saved but the event P&L, dashboard and reports
    // silently showing stale sales figures.
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

      const { data: allDays, error: readErr } = await supabase
        .from('daily_takings')
        .select('total_takings, hot_drinks_sales, iced_drinks_sales')
        .eq('event_id', eventId);
      if (readErr) {
        throw new Error(`Day saved, but event totals could not be refreshed (${readErr.message}). Pull to refresh and re-save this day.`);
      }

      if (allDays && allDays.length > 0) {
        const totalGross = allDays.reduce((s, d) => s + d.total_takings, 0);
        const totalHot = allDays.reduce((s, d) => s + d.hot_drinks_sales, 0);
        const totalIced = allDays.reduce((s, d) => s + d.iced_drinks_sales, 0);
        const { error: upsertErr } = await supabase.from('event_financials').upsert({
          event_id: eventId,
          gross_sales: totalGross,
          standard_rated_sales: totalHot,
          zero_rated_sales: totalIced,
        }, { onConflict: 'event_id', ignoreDuplicates: false });
        if (upsertErr) {
          throw new Error(`Day saved, but the event's financials could not be updated (${upsertErr.message}). Re-save this day when you have signal.`);
        }
      }
    },
    onSettled: () => {
      // Repaint even on failure — the day row itself may have saved.
      qc.invalidateQueries({ queryKey: ['daily_takings', eventId] });
      qc.invalidateQueries({ queryKey: ['daily_takings_all'] });
      qc.invalidateQueries({ queryKey: ['events', eventId] });
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
