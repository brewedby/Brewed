import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcEventFinancials } from '@/lib/calculations';
import { toISODateString } from '@/lib/formatters';
import type { CompanyWithStats, ConcessionsCompany } from '@/types';

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data: companies, error } = await supabase
        .from('concessions_companies')
        .select('*, events(id, status, date, end_date, company_id, event_financials(*))')
        .order('name');
      if (error) throw error;

      const mapped = (companies ?? []).map((company: any) => {
        const companyEvents = (company.events ?? []) as any[];
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

        const today = toISODateString(new Date());
        const completedAccepted = companyEvents.filter((e) => {
          const eventEnd = e.end_date ?? e.date;
          return e.status === 'accepted' && eventEnd <= today && e.event_financials;
        });
        const margins = completedAccepted.map((e) => {
          const calc = calcEventFinancials(e.event_financials!);
          return calc.totalNetSales > 0 ? (calc.netProfit / calc.totalNetSales) * 100 : 0;
        });
        const avgProfitMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : null;
        const completedEventCount = completedAccepted.length;

        // Strip embedded events from the returned object to keep CompanyWithStats clean
        const { events: _embedded, ...companyBase } = company;
        return {
          ...companyBase,
          totalEvents: companyEvents.length,
          acceptedEvents: acceptedEvents.length,
          totalRevenue,
          totalNetProfit,
          lastEventDate: sortedDates[0] ?? null,
          avgProfitMargin,
          completedEventCount,
        } as CompanyWithStats;
      });

      return mapped.sort((a, b) => {
        if (a.avgProfitMargin !== null && b.avgProfitMargin !== null) {
          return b.avgProfitMargin - a.avgProfitMargin;
        }
        if (a.avgProfitMargin !== null) return -1;
        if (b.avgProfitMargin !== null) return 1;
        return 0;
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
