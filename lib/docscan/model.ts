/**
 * Common financial-document schema — the provider-agnostic data model
 * every parsing adapter normalises into. Pure types + constants, no I/O.
 *
 * Design rules (from analysing real Dines / Square / Global Payments /
 * Togather documents):
 *  - Every deduction is an individual line item with its own VAT treatment.
 *    Real docs mix VAT-inclusive fees (Dines processing), VAT-exclusive
 *    fees (EPOS hire "+ VAT"), and unlabelled amounts in one statement.
 *  - Original values from the source document are preserved verbatim
 *    alongside the normalised net/vat/gross trio.
 *  - Nothing here asserts reclaimability — that stays a user-editable
 *    status with "check with your accountant" wording in the UI.
 */

export type DocumentKind =
  | 'epos_sales'          // items-sold / product sales report
  | 'settlement'          // payment processor settlement (Square summary, Dines AC)
  | 'deduction_statement' // organiser deduction/settlement statement (Dines CD)
  | 'fee_invoice'         // supplier fee invoice (Dines IN)
  | 'contract'            // event contract / trading agreement
  | 'other';

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  epos_sales: 'EPOS sales report',
  settlement: 'Settlement report',
  deduction_statement: 'Deduction statement',
  fee_invoice: 'Fee invoice',
  contract: 'Event contract',
  other: 'Financial document',
};

export type VatTreatment =
  | 'inclusive'   // stored gross includes VAT at `vatRate`
  | 'exclusive'   // stored net excludes VAT at `vatRate`
  | 'no_vat'      // zero-rated / no VAT applies
  | 'exempt'      // VAT-exempt supply
  | 'outside'     // outside the scope of VAT
  | 'unknown';    // source doc doesn't say — needs user review

export type Reclaimability =
  | 'reclaimable'
  | 'partially_reclaimable'
  | 'non_reclaimable'
  | 'pending_review'
  | 'not_applicable';

export type LineCategory =
  | 'commission'
  | 'card_processing'
  | 'epos_fee'
  | 'terminal_hire'
  | 'power'
  | 'wifi'
  | 'pitch_fee'
  | 'event_fee'
  | 'deposit'
  | 'staffing'
  | 'waste'
  | 'water'
  | 'gas'
  | 'equipment_hire'
  | 'refund_adjustment'
  | 'marketing_levy'
  | 'minimum_guarantee'
  | 'credit'
  | 'other';

export const LINE_CATEGORY_LABELS: Record<LineCategory, string> = {
  commission: 'Commission',
  card_processing: 'Card processing',
  epos_fee: 'EPOS fee',
  terminal_hire: 'Terminal hire',
  power: 'Power',
  wifi: 'Wi-Fi',
  pitch_fee: 'Pitch fee',
  event_fee: 'Event fee',
  deposit: 'Deposit',
  staffing: 'Staffing',
  waste: 'Waste disposal',
  water: 'Water',
  gas: 'Gas',
  equipment_hire: 'Equipment hire',
  refund_adjustment: 'Refund adjustment',
  marketing_levy: 'Marketing levy',
  minimum_guarantee: 'Minimum guarantee',
  credit: 'Credit / adjustment',
  other: 'Other',
};

/** How the charge affects the payout maths. */
export type SettlementRole =
  | 'deducted_at_source' // taken before the payout (most statement lines)
  | 'invoiced_separately'
  | 'already_paid'
  | 'outstanding'
  | 'informational';

export type FieldConfidence = 'high' | 'medium' | 'low';

export interface ExtractedAmount {
  value: number;
  confidence: FieldConfidence;
  /** Verbatim text the value came from, for the review screen. */
  sourceText: string;
}

export interface DocLineItem {
  description: string;
  category: LineCategory;
  /** Positive = money OUT (deduction); negative = credit to the trader. */
  net: number | null;
  vat: number | null;
  gross: number | null;
  vatRate: number | null;      // 0.20, 0.05, 0 — null when unknown
  vatTreatment: VatTreatment;
  reclaimability: Reclaimability;
  role: SettlementRole;
  confidence: FieldConfidence;
  sourceText: string;
}

export interface SalesSummary {
  grossSales: ExtractedAmount | null;
  refunds: ExtractedAmount | null;
  discounts: ExtractedAmount | null;
  netSales: ExtractedAmount | null;
  salesVat: ExtractedAmount | null;   // output VAT collected on sales
  cashSales: ExtractedAmount | null;
  cardSales: ExtractedAmount | null;
}

export interface ScannedFinancialDocument {
  kind: DocumentKind;
  kindConfidence: FieldConfidence;
  provider: string | null;
  documentRef: string | null;
  periodStart: string | null;  // ISO date where detected
  periodEnd: string | null;
  sales: SalesSummary;
  lines: DocLineItem[];
  /** Provider-reported final payout ("Payout", "Net total", "Due to Venue"…). */
  reportedPayout: ExtractedAmount | null;
  warnings: string[];
  /** Raw text lines — kept in memory for the review screen ONLY, never
   *  persisted and never logged. */
  textLines: string[];
}

export function emptySales(): SalesSummary {
  return {
    grossSales: null, refunds: null, discounts: null, netSales: null,
    salesVat: null, cashSales: null, cardSales: null,
  };
}

/** UK VAT rates offered in the review UI. Custom rates are allowed. */
export const VAT_RATES = [0.20, 0.05, 0] as const;
