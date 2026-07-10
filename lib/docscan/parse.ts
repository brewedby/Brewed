/**
 * Universal financial-document parser.
 *
 * Layered flow (per the scanner architecture):
 *   1. classify() — detect document kind + provider from text signals
 *   2. provider adapter — Dines / Square / Global Payments layouts
 *   3. generic key-value fallback — synonym-driven, works on any
 *      label/amount document
 *   4. every extracted figure carries confidence + verbatim source text
 *
 * Adapters receive plain text lines, so they are identical for PDF and
 * CSV inputs and testable with sanitised fixtures — no real documents
 * are ever embedded in code or tests.
 */

import {
  DocumentKind, DocLineItem, ExtractedAmount, FieldConfidence,
  LineCategory, ScannedFinancialDocument, SalesSummary,
  emptySales, VatTreatment,
} from './model';
import { completeVat, inferRate, roundPence } from './vat';

// ── Money + text helpers ─────────────────────────────────────────────────────

const MONEY_RE = /(?:-\s*)?\(?£?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?/;

export function parseMoney(s: string): number | null {
  const m = s.match(MONEY_RE);
  if (!m) return null;
  const neg = /^\s*[-(]/.test(m[0]) || /\)\s*$/.test(m[0]);
  const n = parseFloat(m[0].replace(/[£,()\s-]/g, ''));
  if (isNaN(n)) return null;
  return neg ? -n : n;
}

/**
 * Rejoin amounts that PDF line assembly split at the thousands separator
 * ("13" / "301.08" → "13,301.08"). Real Dines statements do this.
 */
export function rejoinSplitAmounts(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i].trim();
    const next = lines[i + 1]?.trim() ?? '';
    if (/^-?£?\d{1,3}$/.test(cur) && /^\d{3}(\.\d{2})?$/.test(next)) {
      out.push(`${cur},${next}`);
      i++;
      continue;
    }
    // Label ending in a partial amount + continuation ("…fees (inc. VAT" / "-510.08")
    if (/\d{1,3}$/.test(cur) && /^,?\d{3}\.\d{2}$/.test(next)) {
      out.push(cur + (next.startsWith(',') ? next : ',' + next));
      i++;
      continue;
    }
    out.push(cur);
  }
  return out;
}

function amount(value: number, confidence: FieldConfidence, sourceText: string): ExtractedAmount {
  return { value: roundPence(value), confidence, sourceText: sourceText.slice(0, 120) };
}

/** Find the first standalone money value within `span` lines after index. */
function moneyNear(lines: string[], startIdx: number, span = 3): { value: number; text: string } | null {
  for (let i = startIdx; i <= startIdx + span && i < lines.length; i++) {
    const v = parseMoney(lines[i]);
    if (v !== null) return { value: v, text: lines[i] };
  }
  return null;
}

const DATE_RANGE_RE = /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/gi;

function detectPeriod(lines: string[]): { start: string | null; end: string | null } {
  const MONTHS: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const iso = (d: string, mon: string, y: string) =>
    `${y}-${MONTHS[mon.toLowerCase().slice(0, 3)]}-${d.padStart(2, '0')}`;

  for (const line of lines.slice(0, 40)) {
    if (!/period|from|to|between/i.test(line)) continue;
    const dates = Array.from(line.matchAll(DATE_RANGE_RE));
    if (dates.length >= 2) {
      return { start: iso(dates[0][1], dates[0][2], dates[0][3]), end: iso(dates[1][1], dates[1][2], dates[1][3]) };
    }
  }
  // ISO-style dates (Global Payments headers: 2026-06-18)
  const isoDates: string[] = [];
  for (const line of lines.slice(0, 40)) {
    for (const m of line.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)) isoDates.push(m[0]);
    for (const m of line.matchAll(/\b(\d{2})-(\d{2})-(20\d{2})\b/g)) isoDates.push(`${m[3]}-${m[2]}-${m[1]}`);
  }
  if (isoDates.length > 0) {
    const sorted = isoDates.sort();
    return { start: sorted[0], end: sorted[sorted.length - 1] };
  }
  return { start: null, end: null };
}

// ── Classification ───────────────────────────────────────────────────────────

export interface Classification {
  kind: DocumentKind;
  confidence: FieldConfidence;
  provider: string | null;
}

export function classifyDocument(lines: string[]): Classification {
  const text = lines.slice(0, 120).join('\n').toLowerCase();

  let provider: string | null = null;
  if (/dines\s*app|dines\.co\.uk|dines fees/.test(text)) provider = 'Dines';
  else if (/square (fees|payment processing)|squareup/.test(text)) provider = 'Square';
  else if (/global payments/.test(text)) provider = 'Global Payments';
  else if (/sumup|goodtill/.test(text)) provider = 'SumUp';
  else if (/togather|karamu/.test(text)) provider = 'Togather';
  else if (/zettle|izettle/.test(text)) provider = 'Zettle';

  const score: Partial<Record<DocumentKind, number>> = {};
  const bump = (k: DocumentKind, n = 1) => { score[k] = (score[k] ?? 0) + n; };

  if (/deduction/.test(text)) bump('deduction_statement', 3);
  if (/summary of deductions|total deductions|payout/.test(text)) bump('deduction_statement', 2);
  if (/settlement|net total|total payments collected|due to venue|card transactions/.test(text)) bump('settlement', 2);
  if (/\binvoice\b/.test(text)) bump('fee_invoice', 3);
  if (/service charges/.test(text) && /vat/.test(text)) bump('fee_invoice', 1);
  if (/agreement|contract|terms\s*(&|and)\s*conditions|pitch agreement|supplier/.test(text)) bump('contract', 2);
  if (/signature|signing this document|cancellation/.test(text)) bump('contract', 2);
  if (/product sales report|items sold|sales by product|qty|quantity sold|hourly sales/.test(text)) bump('epos_sales', 2);
  if (/gross rev|revenue before refunds/.test(text)) bump('epos_sales', 1);

  let best: DocumentKind = 'other';
  let bestScore = 0;
  for (const [k, s] of Object.entries(score) as [DocumentKind, number][]) {
    if (s > bestScore) { best = k; bestScore = s; }
  }
  return {
    kind: best,
    confidence: bestScore >= 4 ? 'high' : bestScore >= 2 ? 'medium' : 'low',
    provider,
  };
}

// ── Generic label dictionary (shared by the fallback + adapters) ─────────────

interface LabelSpec {
  field: keyof SalesSummary | 'payout';
  patterns: RegExp[];
}

const SALES_LABELS: LabelSpec[] = [
  { field: 'grossSales', patterns: [/^gross sales/i, /^total sales$/i, /^gross revenue/i, /^total card activity/i] },
  { field: 'netSales', patterns: [/^net sales/i] },
  { field: 'salesVat', patterns: [/^vat$/i, /^taxes$/i, /^vat collected/i, /^output vat/i] },
  { field: 'refunds', patterns: [/^(total )?refunds?$/i, /^returns$/i, /^itemised returns$/i] },
  { field: 'discounts', patterns: [/^discounts( and comps)?$/i] },
  { field: 'cashSales', patterns: [/^cash( sales)?$/i, /^less cash sales/i] },
  { field: 'cardSales', patterns: [/^card( sales)?$/i, /^card value/i, /^total card activity/i] },
  {
    field: 'payout',
    patterns: [
      /^payout$/i, /^net total$/i, /^net payout/i, /^amount transferred/i,
      /^balance due/i, /^remittance total/i, /^settlement( total)?$/i, /^paid out/i, /^due to venue/i,
    ],
  },
];

const DEDUCTION_PATTERNS: { category: LineCategory; re: RegExp }[] = [
  { category: 'commission', re: /commission|revenue share|concession/i },
  { category: 'card_processing', re: /processing fee|transaction fee|card fee|dines fee|square fee|payment processing/i },
  { category: 'epos_fee', re: /\bepos\b(?! terminal)/i },
  { category: 'terminal_hire', re: /terminal/i },
  { category: 'power', re: /\bpower\b|electric/i },
  { category: 'wifi', re: /wi.?fi|internet/i },
  { category: 'pitch_fee', re: /pitch fee/i },
  { category: 'event_fee', re: /event fee|entry fee|admin fee|confirmation fee/i },
  { category: 'deposit', re: /deposit/i },
  { category: 'marketing_levy', re: /marketing|levy/i },
  { category: 'minimum_guarantee', re: /minimum guarantee/i },
  { category: 'refund_adjustment', re: /refund adjust|chargeback/i },
  { category: 'credit', re: /voucher|credit\b/i },
];

export function categoriseLine(description: string): LineCategory {
  for (const { category, re } of DEDUCTION_PATTERNS) {
    if (re.test(description)) return category;
  }
  return 'other';
}

/** VAT treatment straight from the label where the doc states it. */
function treatmentFromLabel(label: string): { treatment: VatTreatment; rate: number | null } {
  if (/inc(l|lusive)?\.?\s*(of\s*)?vat/i.test(label)) return { treatment: 'inclusive', rate: 0.20 };
  if (/(\+|plus|ex(cl)?\.?)\s*vat/i.test(label)) return { treatment: 'exclusive', rate: 0.20 };
  if (/no vat|zero.rated/i.test(label)) return { treatment: 'no_vat', rate: 0 };
  if (/exempt/i.test(label)) return { treatment: 'exempt', rate: null };
  return { treatment: 'unknown', rate: null };
}

function buildLine(
  description: string,
  rawAmount: number,
  confidence: FieldConfidence,
  sourceText: string,
): DocLineItem {
  const { treatment, rate } = treatmentFromLabel(description);
  // Statement convention: negative amounts reduce the payout. Normalise
  // to the app's convention: positive = money out, negative = credit.
  const outward = -rawAmount;
  const triple = completeVat({ amount: outward, treatment, rate });
  const category = categoriseLine(description);
  return {
    description: description.slice(0, 140),
    category,
    net: treatment === 'inclusive' || treatment === 'exclusive' ? triple.net : outward,
    vat: treatment === 'inclusive' || treatment === 'exclusive' ? triple.vat : null,
    gross: triple.gross,
    vatRate: rate,
    vatTreatment: treatment,
    reclaimability: treatment === 'inclusive' || treatment === 'exclusive' ? 'pending_review' : 'not_applicable',
    role: 'deducted_at_source',
    confidence,
    sourceText: sourceText.slice(0, 120),
  };
}

// ── Dines deduction-statement adapter ────────────────────────────────────────
// Layout (verified against a real CD-… statement): a waterfall of labels,
// each followed by its amount on the same or next lines.

function parseDinesDeductions(lines: string[], doc: ScannedFinancialDocument): void {
  const find = (re: RegExp) => lines.findIndex((l) => re.test(l));

  const grab = (re: RegExp): { value: number; text: string } | null => {
    const idx = find(re);
    if (idx === -1) return null;
    const inline = parseMoney(lines[idx].replace(re, ''));
    if (inline !== null) return { value: inline, text: lines[idx] };
    return moneyNear(lines, idx + 1, 2);
  };

  const net = grab(/^net sales/i);
  if (net) doc.sales.netSales = amount(net.value, 'high', net.text);
  const vat = grab(/^vat$/i);
  if (vat) doc.sales.salesVat = amount(vat.value, 'high', vat.text);
  const gross = grab(/^gross sales$/i);
  if (gross) doc.sales.grossSales = amount(gross.value, 'high', gross.text);
  const cash = grab(/less cash sales/i);
  if (cash) doc.sales.cashSales = amount(Math.abs(cash.value), 'medium', cash.text);

  const payout = grab(/^payout$/i);
  if (payout) doc.reportedPayout = amount(payout.value, 'high', payout.text);

  // Processing fees line ("Dines processing fees (inc. VAT) -510.08")
  const feeIdx = find(/processing fees/i);
  if (feeIdx !== -1) {
    const v = parseMoney(lines[feeIdx]) ?? moneyNear(lines, feeIdx + 1, 2)?.value ?? null;
    if (v !== null) doc.lines.push(buildLine(lines[feeIdx].replace(MONEY_RE, '').trim(), v, 'high', lines[feeIdx]));
  }

  // Commission credit ("Add commission 26.00") — a credit TO the trader.
  const commIdx = find(/^add commission/i);
  if (commIdx !== -1) {
    const v = parseMoney(lines[commIdx]) ?? moneyNear(lines, commIdx + 1, 2)?.value ?? null;
    if (v !== null) doc.lines.push(buildLine('Commission credit', v, 'medium', lines[commIdx]));
  }

  // Named deductions between "Deductions:" and "Total deductions".
  // Real statements put the description and its amount on separate lines,
  // so pair each standalone amount with the nearest unconsumed preceding
  // description line.
  // The section header is "Deductions:" (with colon) — the document TITLE
  // is "DEDUCTIONS" and must not anchor the region. Use the last matching
  // header before the total row.
  const endIdx = find(/^total deductions/i);
  let startIdx = -1;
  for (let i = (endIdx === -1 ? lines.length : endIdx) - 1; i >= 0; i--) {
    if (/^deductions:$/i.test(lines[i]) || (/^deductions$/i.test(lines[i]) && i > 5)) { startIdx = i; break; }
  }
  if (startIdx !== -1 && endIdx > startIdx) {
    const consumed = new Set<number>();
    for (let i = startIdx + 1; i < endIdx; i++) {
      const line = lines[i];
      if (/^subtotal|^note:/i.test(line)) continue;
      const v = parseMoney(line);
      if (v === null) continue;
      // An amount directly under Subtotal/Total/Note belongs to that row —
      // never pair it with an earlier description.
      if (i > 0 && /^(subtotal|total|note)/i.test(lines[i - 1])) continue;

      // Inline "description £amount" rows.
      const inlineDesc = line.replace(MONEY_RE, '').replace(/[-–]\s*$/, '').trim();
      if (inlineDesc.length >= 3) {
        doc.lines.push(buildLine(inlineDesc, v, 'medium', line));
        continue;
      }

      // Standalone amount → nearest preceding unconsumed description.
      for (let j = i - 1; j > startIdx; j--) {
        if (consumed.has(j)) continue;
        const cand = lines[j];
        if (parseMoney(cand) !== null) continue;
        if (/^subtotal|^note:|^deductions/i.test(cand)) continue;
        if (cand.replace(/[^A-Za-z]/g, '').length < 4) continue;
        consumed.add(j);
        doc.lines.push(buildLine(cand, v, 'medium', `${cand} → ${line}`));
        break;
      }
    }
    // Cross-check the stated total against our captured lines.
    const statedTotal = parseMoney(lines[endIdx]) ?? moneyNear(lines, endIdx + 1, 2)?.value ?? null;
    if (statedTotal !== null) {
      const captured = doc.lines
        .filter((l) => l.category !== 'card_processing' && l.description !== 'Commission credit')
        .reduce((s, l) => s + (l.gross ?? 0), 0);
      if (Math.abs(captured - -statedTotal) > 0.02 && Math.abs(captured - statedTotal) > 0.02) {
        doc.warnings.push(
          `The statement's deduction total (£${Math.abs(statedTotal).toFixed(2)}) doesn't match the ${doc.lines.length} line(s) detected — review and add any missing deductions.`,
        );
      }
    }
  }
}

// ── Dines card-transactions (AC) adapter ─────────────────────────────────────
// Table: Transaction Date | Card Value excl Service | Service & Tips |
// Total Card activity | Dines Fees (incl. VAT) | Due to Venue.
// The "Total" row carries the period figures in column order.

function parseDinesCardStatement(lines: string[], doc: ScannedFinancialDocument): void {
  const totalIdx = lines.findIndex((l) => /^total\b/i.test(l.trim()));
  if (totalIdx === -1) return;
  // Values may sit inline on the Total row or on the following lines.
  const values: { value: number; text: string }[] = [];
  const collect = (s: string) => {
    const re = new RegExp(MONEY_RE.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) {
      const n = parseFloat(m[0].replace(/[£,()\s-]/g, ''));
      if (!isNaN(n)) values.push({ value: n, text: s });
    }
  };
  collect(lines[totalIdx]);
  for (let i = totalIdx + 1; values.length < 5 && i < Math.min(totalIdx + 8, lines.length); i++) {
    collect(lines[i]);
  }
  // [card excl service, service+tips, total card, fees incl VAT, due to venue]
  if (values.length >= 5) {
    doc.sales.cardSales = amount(values[2].value, 'high', values[2].text);
    doc.sales.grossSales = amount(values[2].value, 'medium', values[2].text);
    doc.lines.push(buildLine('Dines fees (incl. VAT)', -values[3].value, 'high', values[3].text));
    doc.reportedPayout = amount(values[4].value, 'high', values[4].text);
  } else if (values.length > 0) {
    doc.warnings.push('The totals row did not match the expected 5-column card statement layout — review the extracted values.');
  }
}

// ── Square vertical-summary adapter (label,value CSV or text) ────────────────

function parseSquareSummary(lines: string[], doc: ScannedFinancialDocument): void {
  const pair = (label: RegExp): { value: number; text: string } | null => {
    for (const line of lines) {
      if (!label.test(line)) continue;
      const v = parseMoney(line);
      if (v !== null) return { value: v, text: line };
    }
    return null;
  };

  const gross = pair(/^"?gross sales/i);
  if (gross) doc.sales.grossSales = amount(gross.value, 'high', gross.text);
  const net = pair(/^"?net sales/i);
  if (net) doc.sales.netSales = amount(net.value, 'high', net.text);
  const taxes = pair(/^"?taxes/i);
  if (taxes) doc.sales.salesVat = amount(taxes.value, 'high', taxes.text);
  const returns = pair(/^"?returns/i);
  if (returns) doc.sales.refunds = amount(Math.abs(returns.value), 'high', returns.text);
  const discounts = pair(/^"?discounts and comps/i);
  if (discounts) doc.sales.discounts = amount(Math.abs(discounts.value), 'high', discounts.text);
  const card = pair(/^"?card"?,/i) ?? pair(/^"?card\b/i);
  if (card) doc.sales.cardSales = amount(card.value, 'high', card.text);
  const cash = pair(/^"?cash\b/i);
  if (cash && cash.value !== 0) doc.sales.cashSales = amount(cash.value, 'high', cash.text);

  const fees = pair(/square payment processing fees|^"?fees"?,/i);
  if (fees) {
    doc.lines.push(buildLine('Square payment processing fees', fees.value, 'high', fees.text));
  }

  const netTotal = pair(/^"?net total/i);
  if (netTotal) doc.reportedPayout = amount(netTotal.value, 'high', netTotal.text);

  // Square's "Gross sales" EXCLUDES the returns already? Its summary shows
  // net sales + taxes = gross; card total equals gross AFTER returns and
  // discounts. Reconciliation uses card/gross minus fees only, refunds
  // already netted — flag so the reviewer understands.
  if (returns && Math.abs(returns.value) > 0) {
    doc.warnings.push('Returns are already netted into Square\'s totals — they are shown for information and not deducted again.');
    doc.sales.refunds = amount(0, 'medium', returns.text + ' (already netted by Square)');
  }
}

// ── Global Payments daily-financial adapter ──────────────────────────────────
// Layout: label lines followed by day columns then a Total column; the
// LAST money value after each label is the total.

function parseGlobalPaymentsDaily(lines: string[], doc: ScannedFinancialDocument): void {
  const grabRow = (re: RegExp): { value: number; text: string } | null => {
    const idx = lines.findIndex((l) => re.test(l));
    if (idx === -1) return null;
    const values: number[] = [];
    let text = lines[idx];
    for (let i = idx; i < Math.min(idx + 8, lines.length); i++) {
      if (i > idx && lines.slice(idx + 1, i).some((l) => /[A-Za-z]{4,}/.test(l))) break;
      const v = parseMoney(lines[i]);
      if (v !== null) { values.push(v); text = lines[i]; }
    }
    if (values.length === 0) return null;
    return { value: values[values.length - 1], text };
  };

  const gross = grabRow(/^gross revenue/i);
  if (gross) doc.sales.grossSales = amount(gross.value, 'high', gross.text);
  const refunds = grabRow(/^total refunds/i);
  if (refunds) doc.sales.refunds = amount(Math.abs(refunds.value), 'high', refunds.text);
  const before = grabRow(/^revenue before refunds/i);
  if (before && !doc.sales.grossSales) doc.sales.grossSales = amount(before.value, 'medium', before.text);

  if (gross && refunds) {
    // Gross Revenue is already net of refunds on these reports.
    doc.warnings.push('Refunds are already deducted in Gross Revenue on this report — shown for information.');
    doc.sales.refunds = amount(0, 'medium', refunds.text + ' (already netted)');
  }
}

// ── Fee-invoice adapter (net / VAT / gross rows) ─────────────────────────────
// Dines invoices list "date description  £net £vat £gross" style rows.
// All three amounts on one (possibly rejoined) row → exact VAT capture.

function parseFeeInvoice(lines: string[], doc: ScannedFinancialDocument): void {
  const moneyAll = (s: string): number[] => {
    const out: number[] = [];
    const re = new RegExp(MONEY_RE.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) {
      const neg = /^[-(]/.test(m[0].trim()) || /\)$/.test(m[0].trim());
      const n = parseFloat(m[0].replace(/[£,()\s-]/g, ''));
      if (!isNaN(n)) out.push(neg ? -n : n);
    }
    return out;
  };

  for (const line of lines) {
    if (!/commission|fee|charge|hire/i.test(line)) continue;
    const values = moneyAll(line);
    if (values.length < 2) continue;
    const desc = line.replace(new RegExp(MONEY_RE.source, 'g'), '').replace(/\d{1,2}\s+\w{3}\s+\d{4}/, '').trim();
    if (desc.length < 3) continue;

    if (values.length >= 3) {
      // net / vat / gross — verify they add up before trusting the split.
      const [net, vat, gross] = values.slice(-3);
      const addsUp = Math.abs(net + vat - gross) < 0.02;
      const rate = addsUp ? inferRate(net, vat) : null;
      doc.lines.push({
        description: desc.slice(0, 140),
        category: categoriseLine(desc),
        net: addsUp ? net : gross,
        vat: addsUp ? vat : null,
        gross,
        vatRate: rate,
        vatTreatment: addsUp && vat > 0 ? 'exclusive' : 'unknown',
        reclaimability: addsUp && vat > 0 ? 'pending_review' : 'not_applicable',
        role: 'invoiced_separately',
        confidence: addsUp ? 'high' : 'low',
        sourceText: line.slice(0, 120),
      });
    } else {
      doc.lines.push(buildLine(desc, -values[values.length - 1], 'low', line));
    }
  }
}

// ── Generic key-value fallback ───────────────────────────────────────────────

function parseGeneric(lines: string[], doc: ScannedFinancialDocument): void {
  for (const spec of SALES_LABELS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match against the LABEL portion only — inline rows ("Refunds £50.00")
      // must still satisfy end-anchored patterns.
      const label = line.replace(new RegExp(MONEY_RE.source, 'g'), '').replace(/^"|"$/g, '').trim();
      if (!spec.patterns.some((p) => p.test(label))) continue;
      const v = parseMoney(line) ?? moneyNear(lines, i + 1, 2)?.value ?? null;
      if (v === null) continue;
      if (spec.field === 'payout') {
        if (!doc.reportedPayout) doc.reportedPayout = amount(v, 'medium', line);
      } else if (!doc.sales[spec.field]) {
        doc.sales[spec.field] = amount(Math.abs(v), 'medium', line);
      }
      break;
    }
  }

  // Fee-looking lines with amounts become candidate deductions.
  for (const line of lines) {
    if (!/fee|commission|charge|levy|hire/i.test(line)) continue;
    if (SALES_LABELS.some((s) => s.patterns.some((p) => p.test(line)))) continue;
    const v = parseMoney(line);
    if (v === null) continue;
    const desc = line.replace(MONEY_RE, '').trim();
    if (desc.length < 3) continue;
    // Plain fee lines state charges as positive amounts (no statement
    // sign convention) — negate so buildLine's flip yields money-out.
    doc.lines.push(buildLine(desc, -v, 'low', line));
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────

/** Personal data is never needed for financial reconciliation — scrub
 *  emails and card-number-length digit runs before anything downstream
 *  (review screen, stored source_text) can see them. */
export function scrubPII(line: string): string {
  return line
    .replace(/[\w.+-]+@[\w-]+\.[\w.]{2,}/g, '[redacted]')
    .replace(/\b\d{13,19}\b/g, '[redacted]');
}

export function scanFinancialText(rawLines: string[]): ScannedFinancialDocument {
  const lines = rejoinSplitAmounts(rawLines.map((l) => scrubPII(l.trim())).filter(Boolean));
  const cls = classifyDocument(lines);
  const period = detectPeriod(lines);

  const refMatch = lines.slice(0, 30).join('\n').match(/\b(?:ref|reference|document)\s*:?\s*([A-Z]{2}-?[\dA-Z-]{4,})/i);

  const doc: ScannedFinancialDocument = {
    kind: cls.kind,
    kindConfidence: cls.confidence,
    provider: cls.provider,
    documentRef: refMatch?.[1] ?? null,
    periodStart: period.start,
    periodEnd: period.end,
    sales: emptySales(),
    lines: [],
    reportedPayout: null,
    warnings: [],
    textLines: lines,
  };

  const isDinesCardStatement = cls.provider === 'Dines'
    && lines.slice(0, 30).some((l) => /card transactions/i.test(l))
    && !lines.slice(0, 30).some((l) => /^deductions$/i.test(l) || /summary of deductions/i.test(l));

  if (isDinesCardStatement) {
    doc.kind = 'settlement';
    parseDinesCardStatement(lines, doc);
  } else if (cls.provider === 'Dines' && (cls.kind === 'deduction_statement' || cls.kind === 'settlement')) {
    parseDinesDeductions(lines, doc);
  } else if (cls.provider === 'Dines' && cls.kind === 'fee_invoice') {
    parseFeeInvoice(lines, doc);
  } else if (cls.provider === 'Square') {
    parseSquareSummary(lines, doc);
  } else if (cls.provider === 'Global Payments') {
    parseGlobalPaymentsDaily(lines, doc);
  }

  // Fallback fills anything the adapter didn't capture.
  const capturedAnything = doc.reportedPayout || doc.lines.length > 0
    || Object.values(doc.sales).some(Boolean);
  if (!capturedAnything) parseGeneric(lines, doc);

  // Derive VAT rate on fee lines where a sibling invoice pattern exists
  // (net + VAT + gross on one line).
  for (const line of doc.lines) {
    if (line.vatTreatment === 'unknown' && line.net !== null && line.vat !== null && line.vat !== 0) {
      const rate = inferRate(line.net, line.vat);
      if (rate !== null) { line.vatRate = rate; line.vatTreatment = 'exclusive'; }
    }
  }

  if (!doc.reportedPayout && (cls.kind === 'deduction_statement' || cls.kind === 'settlement')) {
    doc.warnings.push('No final payout amount was detected — add it manually if the document states one.');
  }

  return doc;
}
