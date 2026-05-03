import type { EventFinancials, StaffingEntry, EventCalculations } from '@/types';
import { VAT_DIVISOR } from '@/constants';

export function calcStaffingTotal(entries: StaffingEntry[]): number {
  return entries.reduce((sum, e) => sum + e.hours_worked * e.hourly_rate, 0);
}

/**
 * Full P&L calculation supporting:
 *  - VAT breakdown (hot drinks/food at 20%, cold drinks at 0%)
 *  - Concessions company commission on net (ex-VAT) OR gross (inc-VAT) sales
 *  - Pitch fee with % refund; commission deducted from refund before payout
 *  - Power fee, camping costs as additional event costs
 *
 * effectivePitchFee = pitch_fee - refundGross + commissionAmount
 */
export function calcEventFinancials(
  f: EventFinancials,
  staffing?: StaffingEntry[],
): EventCalculations {
  // If individual staffing entries exist we sum them (hours × rate).
  // If the staffing array is empty or undefined, fall back to the aggregate
  // `staffing_costs` figure the user typed directly on the Financials tab —
  // this lets users record staffing as one lump sum without per-person detail.
  const totalStaffingCost =
    staffing && staffing.length > 0
      ? calcStaffingTotal(staffing)
      : (f.staffing_costs ?? 0);

  // --- VAT breakdown ---
  const zeroRated = f.zero_rated_sales ?? 0;
  const standardRated = f.standard_rated_sales ?? 0;
  const hasVatBreakdown = zeroRated > 0 || standardRated > 0;

  const standardRatedNet = standardRated / VAT_DIVISOR;
  const vatCollected = standardRated - standardRatedNet;
  const totalNetSales = hasVatBreakdown ? zeroRated + standardRatedNet : (f.gross_sales ?? 0);
  const totalGrossSales = hasVatBreakdown ? zeroRated + standardRated : (f.gross_sales ?? 0);

  // --- Commission & pitch fee settlement ---
  const commissionPct = f.concessions_commission_pct ?? 0;
  const refundPct = f.pitch_fee_refund_pct ?? 0;
  const pitchFee = f.pitch_fee ?? 0;
  // Default to 'net' for legacy rows where the column hasn't been backfilled.
  const commissionBasis = (f.commission_basis ?? 'net') === 'gross' ? 'gross' : 'net';
  const commissionBase = commissionBasis === 'gross' ? totalGrossSales : totalNetSales;

  const commissionAmount = commissionBase * (commissionPct / 100);
  const pitchFeeRefundGross = pitchFee * (refundPct / 100);
  const netRefund = pitchFeeRefundGross - commissionAmount;
  const effectivePitchFee = pitchFee - pitchFeeRefundGross + commissionAmount;

  // --- P&L ---
  const grossProfit = totalNetSales - (f.cost_of_goods ?? 0);

  const totalCosts =
    (f.cost_of_goods ?? 0) +
    totalStaffingCost +
    effectivePitchFee +
    (f.power_fee ?? 0) +
    (f.travel_costs ?? 0) +
    (f.camping_costs ?? 0) +
    (f.equipment_costs ?? 0) +
    (f.other_costs ?? 0);

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
  return financials.reduce((sum, f) => sum + calcEventFinancials(f).totalNetSales, 0) / financials.length;
}

export const emptyFinancials: Omit<EventFinancials, 'id' | 'event_id' | 'created_at' | 'updated_at'> = {
  gross_sales: 0, zero_rated_sales: 0, standard_rated_sales: 0,
  concessions_commission_pct: 0, commission_basis: 'net', pitch_fee_refund_pct: 0,
  cost_of_goods: 0, pitch_fee: 0, power_fee: 0,
  travel_costs: 0, camping_costs: 0, equipment_costs: 0, other_costs: 0,
  staffing_costs: 0, fresh_milk_litres: 0, alt_milk_litres: 0,
  miles_driven: null,
};
