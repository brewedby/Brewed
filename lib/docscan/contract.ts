/**
 * Contract-term extraction — turns an event contract's text into
 * CANDIDATE forecast costs for user review. Nothing here touches live
 * financials; every extracted term must be confirmed on the review
 * screen before it becomes a planned cost, and planned costs never mix
 * with actuals (is_forecast flag).
 *
 * Built against real Togather agreements (Isle of Wight, Love Supreme).
 * Layout: a fee table ("Fee", "Deposit", "Admin Fee", "EPOS terminals",
 * "WiFi", "Power", "Confirmation Fee") with amounts and VAT hints, plus
 * a commission percentage in prose ("Sales commission …%").
 */

import type { DocLineItem, ScannedFinancialDocument } from './model';
import { categoriseLine } from './parse';
import { completeVat } from './vat';

const FEE_LABELS = /^(sales commission|commission|deposit|admin fee|confirmation fee|epos terminals?|terminal hire|wi.?fi( fee)?|power( fee)?|pitch fee|event fee|minimum guarantee)/i;

const PCT_RE = /(\d{1,2}(?:\.\d{1,2})?)\s*%/;
const AMOUNT_RE = /£\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?/;

export interface ContractTerms {
  eventName: string | null;
  organiser: string | null;
  commissionPct: number | null;
  /** Whether commission applies before or after VAT, where stated. */
  commissionBasis: 'incl_vat' | 'excl_vat' | 'unknown';
  candidateCosts: DocLineItem[];
  warnings: string[];
}

export function extractContractTerms(doc: ScannedFinancialDocument): ContractTerms {
  const lines = doc.textLines;
  const joined = lines.join('\n');

  // Event name: "…your place at <Event>" heading (PandaDoc pattern).
  const nameM = joined.match(/your place at\s+(?:the\s+)?([A-Z][\w' ]{3,60}?)(?:\n|$|\.)/i);
  const eventName = nameM ? nameM[1].trim() : null;

  // Commission: percentage near a commission/revenue-share label.
  let commissionPct: number | null = null;
  let commissionBasis: ContractTerms['commissionBasis'] = 'unknown';
  for (let i = 0; i < lines.length; i++) {
    if (!/commission|revenue share/i.test(lines[i])) continue;
    // The percentage may sit on the label line or the following lines.
    for (let j = i; j <= i + 2 && j < lines.length; j++) {
      const pct = lines[j].match(PCT_RE);
      if (!pct) continue;
      commissionPct = parseFloat(pct[1]);
      if (/incl?\.?\s*vat/i.test(lines[j])) commissionBasis = 'incl_vat';
      else if (/ex(cl)?\.?\s*vat/i.test(lines[j])) commissionBasis = 'excl_vat';
      break;
    }
    if (commissionPct !== null) break;
  }

  const warnings: string[] = [];
  const candidateCosts: DocLineItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!FEE_LABELS.test(line.trim())) continue;

    // Amount on the label line or within the following two lines.
    let amountText: string | null = null;
    let source = line;
    for (let j = i; j <= i + 2 && j < lines.length; j++) {
      const m = lines[j].match(AMOUNT_RE);
      if (m) { amountText = m[0]; source = lines[j]; break; }
    }

    const label = line.trim().slice(0, 80);
    if (!amountText) {
      // Percentage-only (commission) or separately-collected (power) rows
      // are real obligations with no fixed amount — surface as warnings,
      // never as invented numbers.
      if (/commission/i.test(label) && commissionPct !== null) {
        warnings.push(`Commission of ${commissionPct}% (${commissionBasis === 'unknown' ? 'VAT basis not stated — check the contract' : commissionBasis === 'incl_vat' ? 'on sales incl. VAT' : 'on sales excl. VAT'}) — applied to actual sales, not a fixed cost.`);
      } else {
        warnings.push(`"${label}" appears in the fee table without a readable amount — add it manually if it applies.`);
      }
      continue;
    }

    const value = parseFloat(amountText.replace(/[£,\s]/g, ''));
    if (isNaN(value) || value <= 0) continue;

    const context = `${line} ${lines[i + 1] ?? ''}`;
    const exclVat = /\+\s*vat|plus vat|ex(cl)?\.?\s*vat/i.test(context);
    const inclVat = /incl?\.?\s*(of\s*)?vat/i.test(context);
    const treatment = exclVat ? 'exclusive' as const : inclVat ? 'inclusive' as const : 'unknown' as const;
    const rate = treatment === 'unknown' ? null : 0.20;
    const triple = completeVat({ amount: value, treatment, rate });
    const refundable = /refundable(?!.*non)/i.test(context) && !/non.?refundable/i.test(context);

    candidateCosts.push({
      description: label + (refundable ? ' (refundable)' : ''),
      category: categoriseLine(label),
      net: triple.net,
      vat: treatment === 'unknown' ? null : triple.vat,
      gross: triple.gross,
      vatRate: rate,
      vatTreatment: treatment,
      reclaimability: treatment === 'unknown' ? 'pending_review' : 'pending_review',
      role: 'outstanding',
      confidence: treatment === 'unknown' ? 'low' : 'medium',
      sourceText: source.slice(0, 120),
    });
  }

  if (candidateCosts.length === 0 && commissionPct === null) {
    warnings.push('No fee table could be read from this contract — add the agreed costs manually.');
  }

  return {
    eventName,
    organiser: doc.provider,
    commissionPct,
    commissionBasis,
    candidateCosts,
    warnings,
  };
}

// ── Forecast vs actual comparison ────────────────────────────────────────────

export interface CategoryVariance {
  category: string;
  forecastGross: number;
  actualGross: number;
  difference: number;      // actual − forecast
  pctVariance: number | null;
  status: 'as_expected' | 'over' | 'under' | 'unplanned' | 'missing';
}

/**
 * Compare contract-forecast lines against imported actual deductions,
 * grouped by category. Pure function — screens render the result.
 */
export function compareForecastToActual(
  forecast: { category: string; gross: number | null }[],
  actual: { category: string; gross: number | null }[],
): CategoryVariance[] {
  const sum = (rows: { category: string; gross: number | null }[]) => {
    const by = new Map<string, number>();
    for (const r of rows) {
      // Credits (negative) net against costs within the category.
      by.set(r.category, (by.get(r.category) ?? 0) + (r.gross ?? 0));
    }
    return by;
  };
  const f = sum(forecast);
  const a = sum(actual);

  const categories = new Set([...f.keys(), ...a.keys()]);
  const out: CategoryVariance[] = [];
  for (const cat of categories) {
    const fv = Math.round(((f.get(cat) ?? 0)) * 100) / 100;
    const av = Math.round(((a.get(cat) ?? 0)) * 100) / 100;
    const diff = Math.round((av - fv) * 100) / 100;
    let status: CategoryVariance['status'];
    if (fv === 0 && av !== 0) status = 'unplanned';
    else if (av === 0 && fv !== 0) status = 'missing';
    else if (Math.abs(diff) <= Math.max(0.02, Math.abs(fv) * 0.01)) status = 'as_expected';
    else status = diff > 0 ? 'over' : 'under';
    out.push({
      category: cat,
      forecastGross: fv,
      actualGross: av,
      difference: diff,
      pctVariance: fv !== 0 ? Math.round((diff / Math.abs(fv)) * 1000) / 10 : null,
      status,
    });
  }
  return out.sort((x, y) => Math.abs(y.difference) - Math.abs(x.difference));
}
