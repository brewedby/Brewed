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
        .select('*, event_financials(*), concessions_companies(*), event_units(units(*))')
        .order('date', { ascending: false });

      if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
      if (filters?.year) query = query.gte('date', `${filters.year}-01-01`).lte('date', `${filters.year}-12-31`);
      if (filters?.companyId) query = query.eq('company_id', filters.companyId);

      const { data, error } = await query;
      if (error) throw error;

      let mapped = (data ?? []).map((event) => ({
        ...event,
        units: (event.event_units ?? []).map((eu) => eu.units).filter(Boolean),
        calculations: event.event_financials
          ? calcEventFinancials(event.event_financials)
          : EMPTY_CALCULATIONS,
      })) as EventWithFinancials[];

      // events↔units is many-to-many via event_units; filter client-side after mapping
      if (filters?.unitId) {
        mapped = mapped.filter((e) => e.units.some((u) => u.id === filters.unitId));
      }

      return mapped;
    },
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, event_financials(*), concessions_companies(*), event_units(units(*)), staffing_entries(*), infrastructure_items(*)')
        .eq('id', id)
        .single();

      if (error) throw error;

      const staffing = data.staffing_entries ?? [];
      return {
        ...data,
        units: (data.event_units ?? []).map((eu) => eu.units).filter(Boolean),
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
