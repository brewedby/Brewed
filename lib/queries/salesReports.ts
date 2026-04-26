import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { SalesReport, SalesLineItemWithProduct } from '@/types/cogs';

function reportsTable() {
  return (supabase as unknown as {
    from: (t: string) => ReturnType<typeof supabase.from>;
  }).from('sales_reports');
}

function lineItemsTable() {
  return (supabase as unknown as {
    from: (t: string) => ReturnType<typeof supabase.from>;
  }).from('sales_line_items');
}

export function useSalesReports(eventId: string) {
  return useQuery({
    queryKey: ['sales_reports', eventId],
    queryFn: async (): Promise<SalesReport[]> => {
      const { data, error } = await reportsTable()
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SalesReport[];
    },
    enabled: !!eventId,
  });
}

export function useSalesLineItems(reportId: string) {
  return useQuery({
    queryKey: ['sales_line_items', reportId],
    queryFn: async (): Promise<SalesLineItemWithProduct[]> => {
      const { data, error } = await lineItemsTable()
        .select('*, product_catalog(*)')
        .eq('sales_report_id', reportId)
        .order('line_total', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SalesLineItemWithProduct[];
    },
    enabled: !!reportId,
  });
}
