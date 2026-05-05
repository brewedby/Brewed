// Pulls together every signal the prediction engine could learn from
// for the current user's accepted past events:
//   • weather snapshot (avg_temp_c, weather_code on events; falls back
//     to the average of daily_takings.avg_temp_c if the event-level
//     snapshot hasn't been backfilled yet)
//   • outcome totals (event_financials.standard_rated_sales /
//     zero_rated_sales / gross_sales)
//   • drink split (daily_takings.hot_drinks_sales / iced_drinks_sales)
//   • per-product / per-category quantities from sales_line_items
//
// We deliberately don't read or surface unit_cost / cost_of_goods here:
// COGS is user-owned data and the prediction engine must not learn from
// or write to it.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ProductCategory } from '@/types/cogs';

export interface EventObservation {
  eventId: string;
  date: string;          // ISO yyyy-mm-dd
  endDate: string | null;
  location: string | null;
  // Weather
  avgTempC: number | null;
  weatherCode: number | null;
  weatherSummary: string | null;
  // Aggregate revenue (ex-VAT semantics — standard rated stripped)
  standardRatedSales: number;
  zeroRatedSales: number;
  grossSalesFallback: number;     // when no VAT split was entered
  // Drink split (£) — coffee learning signal
  hotDrinksSales: number;
  icedDrinksSales: number;
  daysWithTakings: number;        // how many daily_takings rows had data
  // Per-category quantities & revenue (from sales_line_items)
  qtyByCategory: Partial<Record<ProductCategory, number>>;
  revenueByCategory: Partial<Record<ProductCategory, number>>;
  totalLineItems: number;
}

/**
 * Returns one EventObservation per the user's accepted past events.
 * `staleTime` is generous (15 min) — we don't need real-time freshness;
 * predictions tolerate slightly stale history.
 */
export function useEventObservations() {
  return useQuery({
    queryKey: ['event_observations'],
    staleTime: 1000 * 60 * 15,
    queryFn: async (): Promise<EventObservation[]> => {
      // Pull everything we need in three parallel calls. Keep the SELECT
      // lists tight so we don't exfiltrate unnecessary data.
      const eventsP = supabase
        .from('events')
        .select(
          'id, date, end_date, location, avg_temp_c, weather_code, weather_summary, ' +
          'event_financials(standard_rated_sales, zero_rated_sales, gross_sales)',
        )
        .eq('status', 'accepted')
        .order('date', { ascending: false });

      const dailyP = supabase
        .from('daily_takings')
        .select('event_id, day_date, total_takings, hot_drinks_sales, iced_drinks_sales, avg_temp_c, weather_code');

      const lineItemsP = (supabase as unknown as {
        from: (t: string) => ReturnType<typeof supabase.from>;
      })
        .from('sales_line_items')
        .select('event_id, quantity, line_total, product_catalog:product_catalog_id(category)');

      const [eventsRes, dailyRes, liRes] = await Promise.all([eventsP, dailyP, lineItemsP]);
      if (eventsRes.error) throw eventsRes.error;
      // daily_takings or sales_line_items errors are non-fatal — predictions
      // can still be made from event-level data alone.

      type EventRow = {
        id: string;
        date: string;
        end_date: string | null;
        location: string | null;
        avg_temp_c: number | null;
        weather_code: number | null;
        weather_summary: string | null;
        event_financials: {
          standard_rated_sales: number | null;
          zero_rated_sales: number | null;
          gross_sales: number | null;
        } | null;
      };
      const events = (eventsRes.data ?? []) as unknown as EventRow[];

      type DailyRow = {
        event_id: string;
        day_date: string;
        total_takings: number;
        hot_drinks_sales: number;
        iced_drinks_sales: number;
        avg_temp_c: number | null;
        weather_code: number | null;
      };
      const dailyRows = (dailyRes.data ?? []) as unknown as DailyRow[];

      type LineRow = {
        event_id: string;
        quantity: number;
        line_total: number | null;
        product_catalog: { category: string } | null;
      };
      const lineRows = (liRes.data ?? []) as unknown as LineRow[];

      // Index daily takings by event for O(1) lookup
      const dailyByEvent = new Map<string, DailyRow[]>();
      for (const d of dailyRows) {
        const arr = dailyByEvent.get(d.event_id) ?? [];
        arr.push(d);
        dailyByEvent.set(d.event_id, arr);
      }

      // Index line items by event
      const linesByEvent = new Map<string, LineRow[]>();
      for (const li of lineRows) {
        const arr = linesByEvent.get(li.event_id) ?? [];
        arr.push(li);
        linesByEvent.set(li.event_id, arr);
      }

      return events.map<EventObservation>((e) => {
        const days = dailyByEvent.get(e.id) ?? [];
        const lines = linesByEvent.get(e.id) ?? [];

        // Weather: prefer event-level snapshot, otherwise mean of daily rows.
        let avgTempC = e.avg_temp_c;
        let weatherCode = e.weather_code;
        if (avgTempC === null && days.length > 0) {
          const tempReadings = days
            .map((d) => d.avg_temp_c)
            .filter((t): t is number => t !== null);
          if (tempReadings.length > 0) {
            avgTempC = tempReadings.reduce((a, b) => a + b, 0) / tempReadings.length;
          }
          if (weatherCode === null) {
            const codes = days
              .map((d) => d.weather_code)
              .filter((c): c is number => c !== null);
            if (codes.length > 0) {
              const counts = new Map<number, number>();
              for (const c of codes) counts.set(c, (counts.get(c) ?? 0) + 1);
              let top = codes[0]; let topN = 0;
              for (const [c, n] of counts) if (n > topN) { top = c; topN = n; }
              weatherCode = top;
            }
          }
        }

        // Drink split totals
        let hot = 0, iced = 0, daysWithTakings = 0;
        for (const d of days) {
          if (d.total_takings > 0) daysWithTakings++;
          hot  += d.hot_drinks_sales  ?? 0;
          iced += d.iced_drinks_sales ?? 0;
        }

        // Per-category aggregates from line items
        const qtyByCategory: Partial<Record<ProductCategory, number>> = {};
        const revenueByCategory: Partial<Record<ProductCategory, number>> = {};
        for (const li of lines) {
          const cat = (li.product_catalog?.category ?? 'other') as ProductCategory;
          qtyByCategory[cat]     = (qtyByCategory[cat]     ?? 0) + (li.quantity ?? 0);
          revenueByCategory[cat] = (revenueByCategory[cat] ?? 0) + (li.line_total ?? 0);
        }

        return {
          eventId: e.id,
          date: e.date,
          endDate: e.end_date,
          location: e.location,
          avgTempC,
          weatherCode,
          weatherSummary: e.weather_summary,
          standardRatedSales: e.event_financials?.standard_rated_sales ?? 0,
          zeroRatedSales: e.event_financials?.zero_rated_sales ?? 0,
          grossSalesFallback: e.event_financials?.gross_sales ?? 0,
          hotDrinksSales: hot,
          icedDrinksSales: iced,
          daysWithTakings,
          qtyByCategory,
          revenueByCategory,
          totalLineItems: lines.length,
        };
      });
    },
  });
}
