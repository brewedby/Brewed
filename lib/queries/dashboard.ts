import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcEventFinancials } from '@/lib/calculations';
import { formatMonthLabel, toISODateString } from '@/lib/formatters';
import { EMPTY_CALCULATIONS } from '@/types';
import type { DashboardStats, MonthlyRevenue, StatusCount, ApplicationStatus, UnitWithStatus, EventWithFinancials } from '@/types';

export function useDashboard(year?: number) {
  const targetYear = year ?? new Date().getFullYear();
  return useQuery({
    queryKey: ['dashboard', targetYear],
    queryFn: async (): Promise<DashboardStats> => {
      const [eventsRes, unitsRes] = await Promise.all([
        supabase.from('events').select('*, event_financials(*), concessions_companies(*), event_units(units(*))').order('date', { ascending: false }),
        supabase.from('units').select('*').order('name'),
      ]);
      if (eventsRes.error) throw eventsRes.error;
      if (unitsRes.error) throw unitsRes.error;

      const allEventsRaw = eventsRes.data ?? [];
      const allUnits = unitsRes.data ?? [];

      // Normalise: events↔units is many-to-many via event_units
      const allEvents = allEventsRaw.map((e) => ({
        ...e,
        units: (e.event_units ?? []).map((eu) => eu.units).filter(Boolean),
      }));

      const ytdEvents = allEvents.filter((e) => e.date.startsWith(`${targetYear}`));

      const grossSalesYtd = ytdEvents.reduce((sum, e) => {
        const calc = e.event_financials ? calcEventFinancials(e.event_financials) : null;
        return sum + (calc?.totalNetSales ?? e.event_financials?.gross_sales ?? 0);
      }, 0);

      const netProfitYtd = ytdEvents.reduce((sum, e) => {
        if (!e.event_financials) return sum;
        // Only include events with actual sales — upcoming events with committed
        // costs but no sales would otherwise drag the bottom line negative.
        const hasSales =
          (e.event_financials.gross_sales ?? 0) > 0 ||
          (e.event_financials.standard_rated_sales ?? 0) > 0 ||
          (e.event_financials.zero_rated_sales ?? 0) > 0;
        if (!hasSales) return sum;
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
      const today = toISODateString(new Date());
      const upcomingEvents = (allEvents
        .filter((e) => e.date >= today && e.status === 'accepted')
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5)
        .map((e) => ({
          ...e,
          calculations: e.event_financials ? calcEventFinancials(e.event_financials) : EMPTY_CALCULATIONS,
        })) as unknown) as EventWithFinancials[];

      // Monthly revenue
      const monthlyMap = new Map<number, MonthlyRevenue>();
      for (let m = 1; m <= 12; m++) {
        monthlyMap.set(m, { month: formatMonthLabel(m, targetYear), grossSales: 0, netProfit: 0 });
      }
      ytdEvents.forEach((e) => {
        const month = parseInt(e.date.split('-')[1], 10);
        const entry = monthlyMap.get(month);
        if (!entry) return;
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

      // Unit statuses — map each unit to its current/next accepted event.
      // events↔units is many-to-many via event_units, so filter by membership, not a direct FK.
      const unitStatuses: UnitWithStatus[] = allUnits.map((unit) => {
        const unitEvent = allEvents
          .filter((e) =>
            e.status === 'accepted' &&
            e.date >= today &&
            (e.units as { id: string }[]).some((u) => u?.id === unit.id),
          )
          .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
        return {
          ...unit,
          currentEvent: unitEvent
            ? ({ ...unitEvent, calculations: unitEvent.event_financials ? calcEventFinancials(unitEvent.event_financials) : EMPTY_CALCULATIONS } as unknown as EventWithFinancials)
            : null,
        };
      });

      // Committed fees: accepted upcoming events with pitch/power fees already paid
      const todayStr = toISODateString(new Date());
      const committedFeeEvents = allEvents.filter((e) => {
        const eventEnd = e.end_date ?? e.date;
        return e.status === 'accepted' && eventEnd > todayStr && (e.event_financials?.pitch_fee ?? 0) + (e.event_financials?.power_fee ?? 0) > 0;
      });
      const committedFees = committedFeeEvents.reduce((sum, e) => {
        return sum + (e.event_financials?.pitch_fee ?? 0) + (e.event_financials?.power_fee ?? 0);
      }, 0);
      const upcomingCommitments = committedFeeEvents
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => ({
          id: e.id,
          name: e.name,
          date: e.date,
          end_date: e.end_date,
          location: e.location,
          committedFee: (e.event_financials?.pitch_fee ?? 0) + (e.event_financials?.power_fee ?? 0),
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
        totalFreshMilkLitres,
        totalAltMilkLitres,
        unitStatuses,
        committedFees,
        upcomingCommitments,
      };
    },
  });
}
