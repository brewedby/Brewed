import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcEventFinancials } from '@/lib/calculations';
import { formatMonthLabel } from '@/lib/formatters';
import type { DashboardStats, MonthlyRevenue, StatusCount, ApplicationStatus } from '@/types';

export function useDashboard(year?: number) {
  const targetYear = year ?? new Date().getFullYear();
  return useQuery({
    queryKey: ['dashboard', targetYear],
    queryFn: async (): Promise<DashboardStats> => {
      const { data: events, error } = await supabase
        .from('events')
        .select('*, event_financials(*), concessions_companies(*)')
        .order('date', { ascending: false });
      if (error) throw error;

      const allEvents = events ?? [];
      const ytdEvents = allEvents.filter((e) =>
        e.date.startsWith(`${targetYear}`)
      );

      const grossSalesYtd = ytdEvents.reduce(
        (sum, e) => sum + (e.event_financials?.gross_sales ?? 0),
        0
      );
      const netProfitYtd = ytdEvents.reduce((sum, e) => {
        if (!e.event_financials) return sum;
        return sum + calcEventFinancials(e.event_financials).netProfit;
      }, 0);

      const acceptedYtd = ytdEvents.filter((e) => e.status === 'accepted').length;
      const decidedYtd = ytdEvents.filter(
        (e) => e.status === 'accepted' || e.status === 'rejected'
      ).length;
      const acceptanceRate = decidedYtd > 0 ? (acceptedYtd / decidedYtd) * 100 : 0;

      const eventsWithSales = ytdEvents.filter((e) => (e.event_financials?.gross_sales ?? 0) > 0);
      const avgRevenuePerEvent =
        eventsWithSales.length > 0
          ? grossSalesYtd / eventsWithSales.length
          : 0;

      const today = new Date().toISOString().split('T')[0];
      const upcomingEvents = allEvents
        .filter((e) => e.date >= today && e.status === 'accepted')
        .slice(0, 5)
        .map((e) => ({
          ...e,
          calculations: e.event_financials
            ? calcEventFinancials(e.event_financials)
            : { standardRatedNet: 0, vatCollected: 0, totalNetSales: 0, commissionAmount: 0, pitchFeeRefundGross: 0, netRefund: 0, effectivePitchFee: 0, grossProfit: 0, totalCosts: 0, netProfit: 0, profitMargin: 0, totalStaffingCost: 0 },
        }));

      const monthlyMap = new Map<number, MonthlyRevenue>();
      for (let m = 1; m <= 12; m++) {
        monthlyMap.set(m, { month: formatMonthLabel(m, targetYear), grossSales: 0, netProfit: 0 });
      }
      ytdEvents.forEach((e) => {
        const month = parseInt(e.date.split('-')[1], 10);
        const entry = monthlyMap.get(month)!;
        entry.grossSales += e.event_financials?.gross_sales ?? 0;
        if (e.event_financials) {
          entry.netProfit += calcEventFinancials(e.event_financials).netProfit;
        }
      });

      const statusMap = new Map<ApplicationStatus, number>();
      allEvents.forEach((e) => {
        statusMap.set(e.status as ApplicationStatus, (statusMap.get(e.status as ApplicationStatus) ?? 0) + 1);
      });
      const statusBreakdown: StatusCount[] = Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        count,
      }));

      return {
        totalEventsYtd: ytdEvents.length,
        grossSalesYtd,
        netProfitYtd,
        acceptanceRate,
        avgRevenuePerEvent,
        upcomingEvents,
        monthlyRevenue: Array.from(monthlyMap.values()),
        statusBreakdown,
      };
    },
  });
}
