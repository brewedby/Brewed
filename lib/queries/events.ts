import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcEventFinancials } from '@/lib/calculations';
import type { EventWithFinancials, EventDetail, ApplicationStatus } from '@/types';

export interface EventFilters {
  status?: ApplicationStatus | 'all';
  year?: number;
  companyId?: string;
}

export function useEvents(filters?: EventFilters) {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select(`
          *,
          event_financials(*),
          concessions_companies(*)
        `)
        .order('date', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.year) {
        query = query
          .gte('date', `${filters.year}-01-01`)
          .lte('date', `${filters.year}-12-31`);
      }
      if (filters?.companyId) {
        query = query.eq('company_id', filters.companyId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((event) => ({
        ...event,
        event_financials: event.event_financials,
        concessions_companies: event.concessions_companies,
        calculations: event.event_financials
          ? calcEventFinancials(event.event_financials)
          : { grossProfit: 0, totalCosts: 0, netProfit: 0, profitMargin: 0, totalStaffingCost: 0 },
      })) as EventWithFinancials[];
    },
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          event_financials(*),
          concessions_companies(*),
          staffing_entries(*),
          infrastructure_items(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const staffing = data.staffing_entries ?? [];
      return {
        ...data,
        calculations: data.event_financials
          ? calcEventFinancials(data.event_financials, staffing)
          : { grossProfit: 0, totalCosts: 0, netProfit: 0, profitMargin: 0, totalStaffingCost: 0 },
      } as EventDetail;
    },
    enabled: !!id,
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
