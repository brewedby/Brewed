import type { EventFinancials, StaffingEntry, EventCalculations } from '@/types';

export function calcStaffingTotal(entries: StaffingEntry[]): number {
  return entries.reduce((sum, e) => sum + e.hours_worked * e.hourly_rate, 0);
}

/**
 * Core calculation. Handles both old events (gross_sales only) and new events
 * with VAT breakdown + commission/pitch-fee refund model.
 *
 * Commission flow:
 *   - Commission % is applied to net (ex-VAT) sales
 *   - Organiser refunds (refund %) of the pitch fee paid
 *   - They deduct the commission from that refund before paying it back
 *   - effectivePitchFee = pitch_fee - refundGross + commissionAmount
 */
export function calcEventFinancials(
  f: EventFinancials,
  staffing?: StaffingEntry[],
): EventCalculations {
  const totalStaffingCost = staffing ? calcStaffingTotal(staffing) : f.staffing_costs;

  // --- VAT breakdown ---
  const zeroRated = f.zero_rated_sales ?? 0;
  const standardRated = f.standard_rated_sales ?? 0;
  const hasVatBreakdown = zeroRated > 0 || standardRated > 0;

  const standardRatedNet = standardRated / 1.2;
  const vatCollected = standardRated - standardRatedNet;
  // If no VAT breakdown entered yet, fall back to legacy gross_sales
  const totalNetSales = hasVatBreakdown ? zeroRated + standardRatedNet : f.gross_sales;

  // --- Commission & pitch fee settlement ---
  const commissionPct = f.concessions_commission_pct ?? 0;
  const refundPct = f.pitch_fee_refund_pct ?? 0;

  const commissionAmount = totalNetSales * (commissionPct / 100);
  const pitchFeeRefundGross = f.pitch_fee * (refundPct / 100);
  const netRefund = pitchFeeRefundGross - commissionAmount;
  // effectivePitchFee = what the pitch actually costs after refund and commission
  const effectivePitchFee = f.pitch_fee - pitchFeeRefundGross + commissionAmount;

  // --- P&L ---
  const grossProfit = totalNetSales - f.cost_of_goods;

  const totalCosts =
    f.cost_of_goods +
    (totalStaffingCost) +
    effectivePitchFee +
    f.travel_costs +
    f.equipment_costs +
    f.other_costs;

  const netProfit = totalNetSales - totalCosts;
  const profitMargin = totalNetSales === 0 ? 0 : (netProfit / totalNetSales) * 100;

  return {
    standardRatedNet,
    vatCollected,
    totalNetSales,
    commissionAmount,
    pitchFeeRefundGross,
    netRefund,
    effectivePitchFee,
    grossProfit,
    totalCosts,
    netProfit,
    profitMargin,
    totalStaffingCost,
  };
}

// Convenience shorthands kept for dashboard/reports queries that pass a plain financials object
export function calcGrossProfit(f: EventFinancials): number {
  return calcEventFinancials(f).grossProfit;
}
export function calcTotalCosts(f: EventFinancials): number {
  return calcEventFinancials(f).totalCosts;
}
export function calcNetProfit(f: EventFinancials): number {
  return calcEventFinancials(f).netProfit;
}
export function calcProfitMargin(f: EventFinancials): number {
  return calcEventFinancials(f).profitMargin;
}

export function calcAvgRevenuePerEvent(financials: EventFinancials[]): number {
  if (financials.length === 0) return 0;
  const total = financials.reduce((sum, f) => sum + (calcEventFinancials(f).totalNetSales), 0);
  return total / financials.length;
}

export const emptyFinancials: Omit<EventFinancials, 'id' | 'event_id' | 'created_at' | 'updated_at'> = {
  gross_sales: 0,
  zero_rated_sales: 0,
  standard_rated_sales: 0,
  concessions_commission_pct: 0,
  pitch_fee_refund_pct: 0,
  cost_of_goods: 0,
  pitch_fee: 0,
  travel_costs: 0,
  equipment_costs: 0,
  other_costs: 0,
  staffing_costs: 0,
};
