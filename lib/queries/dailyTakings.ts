import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DailyTakings } from '@/types';
import type { EventFinancialSummary } from '@/lib/drinkSplitEngine';
import { VATABLE_CATEGORIES } from '@/types/cogs';
import type { ProductCategory } from '@/types/cogs';

// Keywords for classifying unmatched CSV line items as hot or iced
const HOT_KEYWORDS = ['latte', 'flat white', 'cappuccino', 'americano', 'hot choc', 'cortado', 'espresso', 'macchiato', 'mocha', 'tea', 'chai', 'filter', 'pour over', 'affogato', 'lungo', 'drip', 'breve'];
const COLD_KEYWORDS = ['iced', 'cold brew', 'frappe', 'smoothie', 'milkshake', 'chilled', 'frappuccino', 'cold drink'];

function isHotByKeyword(name: string): boolean {
  const lower = name.toLowerCase();
  if (COLD_KEYWORDS.some((kw) => lower.includes(kw))) return false;
  return HOT_KEYWORDS.some((kw) => lower.includes(kw));
}

function isColdByKeyword(name: string): boolean {
  return COLD_KEYWORDS.some((kw) => name.toLowerCase().includes(kw));
}

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
          date: e.date,
        }));
    },
    staleTime: 1000 * 60 * 10,
  });
}

// Reads parsed COGS CSV line items and maps them to hot/iced splits per event.
// Unmatched items are classified via product name keywords.
export function useHistoricalSalesFromCOGS() {
  return useQuery({
    queryKey: ['historical_cogs_splits'],
    queryFn: async (): Promise<EventFinancialSummary[]> => {
      const castFrom = (t: string) =>
        (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(t);

      const { data: lineItems, error: liError } = await castFrom('sales_line_items')
        .select('event_id, product_name, line_total, product_catalog:product_catalog_id(category)')
        .not('line_total', 'is', null);
      if (liError) throw liError;
      if (!lineItems || lineItems.length === 0) return [];

      const eventIds = [...new Set((lineItems as unknown as { event_id: string }[]).map((li) => li.event_id))];
      const { data: events, error: eError } = await supabase
        .from('events')
        .select('id, date')
        .in('id', eventIds);
      if (eError) throw eError;

      const eventDateMap = new Map<string, string>();
      (events ?? []).forEach((e) => eventDateMap.set(e.id, e.date));

      const byEvent = new Map<string, { hot: number; iced: number; date: string }>();

      for (const li of lineItems as unknown as {
        event_id: string;
        product_name: string;
        line_total: number | null;
        product_catalog: { category: string } | null;
      }[]) {
        const date = eventDateMap.get(li.event_id);
        if (!date || !li.line_total) continue;

        const category = (li.product_catalog?.category ?? null) as ProductCategory | null;
        const isHot = category
          ? VATABLE_CATEGORIES.includes(category)
          : isHotByKeyword(li.product_name);
        const isCold = category
          ? category === 'cold_drinks'
          : isColdByKeyword(li.product_name);

        if (!isHot && !isCold) continue;

        const existing = byEvent.get(li.event_id) ?? { hot: 0, iced: 0, date };
        byEvent.set(li.event_id, {
          hot:  isHot  ? existing.hot  + li.line_total : existing.hot,
          iced: isCold ? existing.iced + li.line_total : existing.iced,
          date,
        });
      }

      return Array.from(byEvent.values())
        .filter((e) => (e.hot + e.iced) > 0)
        .map((e) => ({
          standard_rated_sales: e.hot,
          zero_rated_sales: e.iced,
          avg_temp_c: null,
          month: parseInt(e.date.split('-')[1], 10),
          date: e.date,
        }));
    },
    staleTime: 1000 * 60 * 10,
  });
}

// Combined hook used by DrinkSplitInsightCard — merges daily takings + COGS CSV splits + event financials.
export function useAllHistoricalTakings() {
  const { data: dailyTakings = [], isLoading: l1 } = useAllDailyTakings();
  const { data: cogsData = [],    isLoading: l2 } = useHistoricalSalesFromCOGS();
  const { data: eventSplits = [], isLoading: l3 } = useHistoricalEventSplits();

  const eventFinancials = [...eventSplits, ...cogsData];
  const totalDataPoints = dailyTakings.length + eventFinancials.length;

  return {
    dailyTakings,
    eventFinancials,
    isLoading: l1 || l2 || l3,
    totalDataPoints,
  };
}

