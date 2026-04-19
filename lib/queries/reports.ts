import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcEventFinancials, HMRC_MILEAGE_RATE } from '@/lib/calculations';
import { formatMonthLabel } from '@/lib/formatters';
import { EMPTY_CALCULATIONS } from '@/types';
import type { ReportData, MonthlyBreakdown, CompanyPerformance, ApplicationStatus } from '@/types';

export function useReports(year: number) {
  return useQuery({
    queryKey: ['reports', year],
    queryFn: async (): Promise<ReportData> => {
      const { data: events, error } = await supabase
        .from('events')
        .select('*, event_financials(*), concessions_companies(*)')
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`)
        .order('date');
      if (error) throw error;

      const { data: companies, error: cError } = await supabase
        .from('concessions_companies')
        .select('*');
      if (cError) throw cError;

      const allEvents = events ?? [];
      const allCompanies = companies ?? [];

      const totalGross = allEvents.reduce((s, e) => s + (e.event_financials?.gross_sales ?? 0), 0);
      const totalNet = allEvents.reduce((s, e) => {
        if (!e.event_financials) return s;
        return s + calcEventFinancials(e.event_financials).netProfit;
      }, 0);
      const avgMargin = totalGross > 0 ? (totalNet / totalGross) * 100 : 0;

      const monthlyMap = new Map<number, MonthlyBreakdown>();
      for (let m = 1; m <= 12; m++) {
        monthlyMap.set(m, {
          month: m,
          monthLabel: formatMonthLabel(m, year),
          eventCount: 0,
          grossSales: 0,
          totalCosts: 0,
          netProfit: 0,
          profitMargin: 0,
        });
      }
      allEvents.forEach((e) => {
        const month = parseInt(e.date.split('-')[1], 10);
        const entry = monthlyMap.get(month)!;
        entry.eventCount += 1;
        entry.grossSales += e.event_financials?.gross_sales ?? 0;
        if (e.event_financials) {
          const calc = calcEventFinancials(e.event_financials);
          entry.totalCosts += calc.totalCosts;
          entry.netProfit += calc.netProfit;
        }
      });
      monthlyMap.forEach((entry) => {
        entry.profitMargin = entry.grossSales > 0 ? (entry.netProfit / entry.grossSales) * 100 : 0;
      });

      const totalFreshMilkLitres = allEvents.reduce((s, e) => s + (e.event_financials?.fresh_milk_litres ?? 0), 0);
      const totalAltMilkLitres = allEvents.reduce((s, e) => s + (e.event_financials?.alt_milk_litres ?? 0), 0);
      const totalMilesDriven = allEvents.reduce((s, e) => s + (e.event_financials?.miles_driven ?? 0), 0);
      const totalMileageAllowance = totalMilesDriven * HMRC_MILEAGE_RATE;

      const topEvents = [...allEvents]
        .filter((e) => e.event_financials)
        .sort(
          (a, b) =>
            calcEventFinancials(b.event_financials!).netProfit -
            calcEventFinancials(a.event_financials!).netProfit
        )
        .slice(0, 10)
        .map((e) => ({
          ...e,
          calculations: calcEventFinancials(e.event_financials!),
        }));

      const companyPerformance: CompanyPerformance[] = allCompanies.map((company) => {
        const companyEvents = allEvents.filter((e) => e.company_id === company.id);
        const accepted = companyEvents.filter((e) => e.status === 'accepted').length;
        const decided = companyEvents.filter(
          (e) => e.status === 'accepted' || e.status === 'rejected'
        ).length;
        return {
          company,
          totalEvents: companyEvents.length,
          acceptedEvents: accepted,
          totalRevenue: companyEvents.reduce((s, e) => s + (e.event_financials?.gross_sales ?? 0), 0),
          acceptanceRate: decided > 0 ? (accepted / decided) * 100 : 0,
        };
      }).filter((cp) => cp.totalEvents > 0);

      return {
        year,
        totalGross,
        totalNet,
        totalEvents: allEvents.length,
        avgMargin,
        totalFreshMilkLitres,
        totalAltMilkLitres,
        totalMilesDriven,
        totalMileageAllowance,
        monthly: Array.from(monthlyMap.values()),
        topEvents,
        companyPerformance,
      };
    },
  });
}
