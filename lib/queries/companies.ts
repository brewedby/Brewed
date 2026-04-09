import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcEventFinancials } from '@/lib/calculations';
import type { CompanyWithStats, ConcessionsCompany } from '@/types';

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data: companies, error } = await supabase
        .from('concessions_companies')
        .select('*')
        .order('name');
      if (error) throw error;

      const { data: events, error: evError } = await supabase
        .from('events')
        .select('*, event_financials(*)');
      if (evError) throw evError;

      return (companies ?? []).map((company) => {
        const companyEvents = (events ?? []).filter((e) => e.company_id === company.id);
        const acceptedEvents = companyEvents.filter((e) => e.status === 'accepted');
        const totalRevenue = companyEvents.reduce(
          (sum, e) => sum + (e.event_financials?.gross_sales ?? 0),
          0
        );
        const totalNetProfit = companyEvents.reduce((sum, e) => {
          if (!e.event_financials) return sum;
          return sum + calcEventFinancials(e.event_financials).netProfit;
        }, 0);
        const sortedDates = companyEvents.map((e) => e.date).sort().reverse();
        return {
          ...company,
          totalEvents: companyEvents.length,
          acceptedEvents: acceptedEvents.length,
          totalRevenue,
          totalNetProfit,
          lastEventDate: sortedDates[0] ?? null,
        } as CompanyWithStats;
      });
    },
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: ['companies', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('concessions_companies')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as ConcessionsCompany;
    },
    enabled: !!id,
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('concessions_companies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
