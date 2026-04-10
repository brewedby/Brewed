import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcEventFinancials } from '@/lib/calculations';
import { formatMonthLabel } from '@/lib/formatters';
import { EMPTY_CALCULATIONS } from '@/types';
import type { DashboardStats, MonthlyRevenue, StatusCount, ApplicationStatus, UnitWithStatus } from '@/types';

export function useDashboard(year?: number) {
  const targetYear = year ?? new Date().getFullYear();
  return useQuery({
    queryKey: ['dashboard', targetYear],
    queryFn: async (): Promise<DashboardStats> => {
      const [eventsRes, unitsRes] = await Promise.all([
        supabase.from('events').select('*, event_financials(*), concessions_companies(*), units(*)').order('date', { ascending: false }),
        supabase.from('units').select('*').order('name'),
      ]);
      if (eventsRes.error) throw eventsRes.error;

      const allEvents = eventsRes.data ?? [];
      const allUnits = unitsRes.data ?? [];

      const ytdEvents = allEvents.filter((e) => e.date.startsWith(`${targetYear}`));

      const grossSalesYtd = ytdEvents.reduce((sum, e) => {
        const calc = e.event_financials ? calcEventFinancials(e.event_financials) : null;
        return sum + (calc?.totalNetSales ?? e.event_financials?.gross_sales ?? 0);
      }, 0);

      const netProfitYtd = ytdEvents.reduce((sum, e) => {
        if (!e.event_financials) return sum;
        return sum + calcEventFinancials(e.event_financials).netProfit;
      }, 0);

      const acceptedYtd = ytdEvents.filter((e) => e.status === 'accepted').length;
      const decidedYtd = ytdEvents.filter((e) => e.status === 'accepted' || e.status === 'rejected').length;
      const acceptanceRate = decidedYtd > 0 ? (acceptedYtd / decidedYtd) * 100 : 0;
      const eventsWithSales = ytdEvents.filter((e) => (e.event_financials?.gross_sales ?? 0) > 0);
      const avgRevenuePerEvent = eventsWithSales.length > 0 ? grossSalesYtd / eventsWithSales.length : 0;

      // Milk totals YTD (accepted events only)
      const acceptedYtdEvents = ytdEvents.filter((e) => e.status === 'accepted');
      const totalFreshMilkLitres = acceptedYtdEvents.reduce((sum, e) => sum + (e.event_financials?.fresh_milk_litres ?? 0), 0);
      const totalAltMilkLitres = acceptedYtdEvents.reduce((sum, e) => sum + (e.event_financials?.alt_milk_litres ?? 0), 0);

      // Upcoming events
      const today = new Date().toISOString().split('T')[0];
      const upcomingEvents = allEvents
        .filter((e) => e.date >= today && e.status === 'accepted')
        .slice(0, 5)
        .map((e) => ({
          ...e,
          calculations: e.event_financials ? calcEventFinancials(e.event_financials) : EMPTY_CALCULATIONS,
        }));

      // Monthly revenue
      const monthlyMap = new Map<number, MonthlyRevenue>();
      for (let m = 1; m <= 12; m++) {
        monthlyMap.set(m, { month: formatMonthLabel(m, targetYear), grossSales: 0, netProfit: 0 });
      }
      ytdEvents.forEach((e) => {
        const month = parseInt(e.date.split('-')[1], 10);
        const entry = monthlyMap.get(month)!;
        if (e.event_financials) {
          const calc = calcEventFinancials(e.event_financials);
          entry.grossSales += calc.totalNetSales;
          entry.netProfit += calc.netProfit;
        }
      });

      // Status breakdown
      const statusMap = new Map<ApplicationStatus, number>();
      allEvents.forEach((e) => {
        statusMap.set(e.status as ApplicationStatus, (statusMap.get(e.status as ApplicationStatus) ?? 0) + 1);
      });
      const statusBreakdown: StatusCount[] = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

      // Unit statuses — map each unit to its current/next accepted event
      const unitStatuses: UnitWithStatus[] = allUnits.map((unit) => {
        const unitEvent = allEvents
          .filter((e) => e.unit_id === unit.id && e.status === 'accepted' && e.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
        return {
          ...unit,
          currentEvent: unitEvent
            ? { ...unitEvent, calculations: unitEvent.event_financials ? calcEventFinancials(unitEvent.event_financials) : EMPTY_CALCULATIONS }
            : null,
        };
      });

      return {
        totalEventsYtd: ytdEvents.length,
        grossSalesYtd,
        netProfitYtd,
        acceptanceRate,
        avgRevenuePerEvent,
        upcomingEvents,
        monthlyRevenue: Array.from(monthlyMap.values()),
        statusBreakdown,
        totalFreshMilkLitres,
        totalAltMilkLitres,
        unitStatuses,
      };
    },
  });
}
