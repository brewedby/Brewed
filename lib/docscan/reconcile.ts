/**
 * Payout reconciliation — compares the provider-reported payout with the
 * amount the app derives from the same document's own figures.
 *
 * Expected payout =
 *     gross eligible sales (card where cash is paid direct)
 *   − refunds not already netted
 *   − every line with role 'deducted_at_source' (credits are negative
 *     lines, so they add back automatically)
 *
 * Verified against the real Dines CD statement:
 *   13,301.08 gross − 510.08 fees + 26.00 commission credit
 *   − 3,113.20 organiser deductions = 9,703.80 payout ✓
 */

import type { DocLineItem, ExtractedAmount, SalesSummary } from './model';
import { roundPence } from './vat';

export type ReconciliationStatus =
  | 'reconciled'          // |difference| ≤ tolerance
  | 'rounding_difference' // ≤ £1 — likely provider rounding
  | 'requires_review'     // ≤ 5% of payout — something specific is off
  | 'does_not_reconcile'  // larger — figures are inconsistent
  | 'missing_information';// no reported payout or no usable sales figure

export interface Reconciliation {
  expectedPayout: number | null;
  reportedPayout: number | null;
  difference: number | null;   // reported − expected
  status: ReconciliationStatus;
  explanation: string;
}

const TOLERANCE = 0.02;       // two pence — penny rounding per line
const ROUNDING_BAND = 1.0;

export function reconcilePayout(input: {
  sales: SalesSummary;
  lines: DocLineItem[];
  reportedPayout: ExtractedAmount | null;
}): Reconciliation {
  const { sales, lines, reportedPayout } = input;

  // Eligible sales base: prefer explicit card sales (cash never reaches
  // the payout), fall back to gross sales.
  const base = sales.cardSales?.value ?? sales.grossSales?.value ?? null;
  if (base === null) {
    return {
      expectedPayout: null,
      reportedPayout: reportedPayout?.value ?? null,
      difference: null,
      status: 'missing_information',
      explanation: 'No gross or card sales figure was found, so an expected payout cannot be calculated.',
    };
  }

  // Refunds: only subtract when the doc reports them separately from the
  // sales base (Square nets returns before "gross sales"; Global Payments
  // reports them as their own column).
  const refunds = sales.refunds?.value ?? 0;

  let deductions = 0;
  for (const line of lines) {
    if (line.role !== 'deducted_at_source') continue;
    deductions += line.gross ?? line.net ?? 0;
  }

  const expected = roundPence(base - refunds - deductions);
  const reported = reportedPayout?.value ?? null;

  if (reported === null) {
    return {
      expectedPayout: expected,
      reportedPayout: null,
      difference: null,
      status: 'missing_information',
      explanation: 'The document does not state a final payout amount to reconcile against.',
    };
  }

  const diff = roundPence(reported - expected);
  const abs = Math.abs(diff);

  let status: ReconciliationStatus;
  let explanation: string;
  if (abs <= TOLERANCE) {
    status = 'reconciled';
    explanation = 'The reported payout matches the calculated amount.';
  } else if (abs <= ROUNDING_BAND) {
    status = 'rounding_difference';
    explanation = `The reported payout differs by £${abs.toFixed(2)} — likely provider rounding.`;
  } else if (abs <= Math.max(5, Math.abs(reported) * 0.05)) {
    status = 'requires_review';
    explanation = `The reported payout differs by £${abs.toFixed(2)} from the calculated amount. Check for a missing fee, credit or refund line.`;
  } else {
    status = 'does_not_reconcile';
    explanation = `The reported payout differs by £${abs.toFixed(2)} — the document's own figures do not add up to its stated payout. Review every line before importing.`;
  }

  return { expectedPayout: expected, reportedPayout: reported, difference: diff, status, explanation };
}

export const RECONCILIATION_LABELS: Record<ReconciliationStatus, string> = {
  reconciled: 'Reconciled',
  rounding_difference: 'Small rounding difference',
  requires_review: 'Requires review',
  does_not_reconcile: 'Does not reconcile',
  missing_information: 'Missing information',
};
