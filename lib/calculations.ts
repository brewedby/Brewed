import type { EventFinancials, StaffingEntry, EventCalculations } from '@/types';

export function calcStaffingTotal(entries: StaffingEntry[]): number {
  return entries.reduce((sum, e) => sum + e.hours_worked * e.hourly_rate, 0);
}

export function calcGrossProfit(f: EventFinancials): number {
  return f.gross_sales - f.cost_of_goods;
}

export function calcTotalCosts(f: EventFinancials): number {
  return (
    f.cost_of_goods +
    f.staffing_costs +
    f.pitch_fee +
    f.travel_costs +
    f.equipment_costs +
    f.other_costs
  );
}

export function calcNetProfit(f: EventFinancials): number {
  return f.gross_sales - calcTotalCosts(f);
}

export function calcProfitMargin(f: EventFinancials): number {
  if (f.gross_sales === 0) return 0;
  return (calcNetProfit(f) / f.gross_sales) * 100;
}

export function calcEventFinancials(f: EventFinancials, staffing?: StaffingEntry[]): EventCalculations {
  const totalStaffingCost = staffing ? calcStaffingTotal(staffing) : f.staffing_costs;
  const effectiveFinancials = staffing ? { ...f, staffing_costs: totalStaffingCost } : f;
  return {
    grossProfit: calcGrossProfit(effectiveFinancials),
    totalCosts: calcTotalCosts(effectiveFinancials),
    netProfit: calcNetProfit(effectiveFinancials),
    profitMargin: calcProfitMargin(effectiveFinancials),
    totalStaffingCost,
  };
}

export function calcAvgRevenuePerEvent(financials: EventFinancials[]): number {
  if (financials.length === 0) return 0;
  const total = financials.reduce((sum, f) => sum + f.gross_sales, 0);
  return total / financials.length;
}

export const emptyFinancials: Omit<EventFinancials, 'id' | 'event_id' | 'created_at' | 'updated_at'> = {
  gross_sales: 0,
  cost_of_goods: 0,
  pitch_fee: 0,
  travel_costs: 0,
  equipment_costs: 0,
  other_costs: 0,
  staffing_costs: 0,
};
