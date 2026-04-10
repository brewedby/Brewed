import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcEventFinancials } from '@/lib/calculations';
import { EMPTY_CALCULATIONS } from '@/types';
import type { EventWithFinancials, EventDetail, ApplicationStatus } from '@/types';

export interface EventFilters {
  status?: ApplicationStatus | 'all';
  year?: number;
  companyId?: string;
  unitId?: string;
}

export function useEvents(filters?: EventFilters) {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('*, event_financials(*), concessions_companies(*), units(*)')
        .order('date', { ascending: false });

      if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
      if (filters?.year) query = query.gte('date', `${filters.year}-01-01`).lte('date', `${filters.year}-12-31`);
      if (filters?.companyId) query = query.eq('company_id', filters.companyId);
      if (filters?.unitId) query = query.eq('unit_id', filters.unitId);

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((event) => ({
        ...event,
        calculations: event.event_financials
          ? calcEventFinancials(event.event_financials)
          : EMPTY_CALCULATIONS,
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
        .select('*, event_financials(*), concessions_companies(*), units(*), staffing_entries(*), infrastructure_items(*)')
        .eq('id', id)
        .single();

      if (error) throw error;

      const staffing = data.staffing_entries ?? [];
      return {
        ...data,
        calculations: data.event_financials
          ? calcEventFinancials(data.event_financials, staffing)
          : EMPTY_CALCULATIONS,
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
      qc.invalidateQueries({ queryKey: ['units'] });
    },
  });
}
