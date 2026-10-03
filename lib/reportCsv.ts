/**
 * Annual report CSV export — pure, so it can be tested without React
 * Native or Supabase.
 *
 * Exports EVERY event in the year (the previous export only covered the
 * top 10 by profit). This is the "export your data" path the privacy
 * summary and the account-deletion warning point users to.
 */
import type { EventCalculations, EventFinancials } from '@/types';

export interface CsvEventRow {
  name: string;
  date: string;
  end_date: string | null;
  location: string | null;
  status: string;
  companyName: string | null;
  financials: Partial<EventFinancials> | null;
  calculations: Pick<EventCalculations, 'netProfit' | 'profitMargin' | 'totalStaffingCost'> | null;
}

export const REPORT_CSV_HEADER = [
  'Event', 'Date', 'End Date', 'Location', 'Company', 'Status',
  'Gross Sales', 'Cost of Goods', 'Pitch Fee', 'Power Fee', 'Travel',
  'Camping', 'Equipment', 'Other', 'Staffing', 'Net Profit', 'Margin%',
];

/**
 * Quote a text cell. Cells starting with = + - @ (or tab/CR) are prefixed
 * with an apostrophe so Excel/Numbers/Sheets treat them as text rather
 * than formulas (CSV injection — event names come from user input and
 * from the scraped Discover directory).
 */
export function csvText(value: string | null | undefined): string {
  let v = value ?? '';
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
}

function num(v: number | null | undefined, digits = 2): string {
  return Number.isFinite(v) ? (v as number).toFixed(digits) : '0.00';
}

export function buildReportCsv(rows: CsvEventRow[]): string {
  const lines = [REPORT_CSV_HEADER.join(',')];
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  for (const r of sorted) {
    const f = r.financials ?? {};
    lines.push([
      csvText(r.name),
      r.date,
      r.end_date ?? '',
      csvText(r.location),
      csvText(r.companyName),
      r.status,
      num(f.gross_sales),
      num(f.cost_of_goods),
      num(f.pitch_fee),
      num(f.power_fee),
      num(f.travel_costs),
      num(f.camping_costs),
      num(f.equipment_costs),
      num(f.other_costs),
      num(r.calculations?.totalStaffingCost ?? f.staffing_costs),
      num(r.calculations?.netProfit),
      num(r.calculations?.profitMargin, 1),
    ].join(','));
  }
  return lines.join('\n') + '\n';
}
