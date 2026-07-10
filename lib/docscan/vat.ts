/**
 * THE VAT calculation layer. Every screen and parser computes VAT through
 * these functions — no other module may derive net/vat/gross on its own.
 *
 * All functions work in pounds with penny-rounding (round-half-away-from-
 * zero to 2dp) applied once at the end of each derivation, so chained
 * calculations can't accumulate drift.
 */

import type { DocLineItem, VatTreatment } from './model';

export function roundPence(v: number): number {
  // The epsilon absorbs float representation error (1.005 is stored as
  // 1.00499…) so half-penny values round away from zero as accountants expect.
  return Math.sign(v) * Math.round(Math.abs(v) * 100 + 1e-9) / 100;
}

export interface VatTriple {
  net: number;
  vat: number;
  gross: number;
}

/**
 * Complete a net/vat/gross triple from whatever the document provided.
 *
 *  - inclusive:  gross known → net = gross / (1+rate), vat = gross − net
 *  - exclusive:  net known   → vat = net × rate, gross = net + vat
 *  - no_vat / exempt / outside: vat = 0, net = gross = the known amount
 *  - unknown: amounts pass through untouched (vat 0) — the review screen
 *    forces the user to resolve the treatment before totals rely on it.
 *
 * Negative amounts (credits/refunds) flow through symmetrically.
 */
export function completeVat(input: {
  amount: number;
  treatment: VatTreatment;
  rate: number | null; // 0.20 etc.; ignored for no-VAT treatments
}): VatTriple {
  const { amount, treatment } = input;
  const rate = input.rate ?? 0;

  switch (treatment) {
    case 'inclusive': {
      if (rate <= 0) return { net: roundPence(amount), vat: 0, gross: roundPence(amount) };
      const net = amount / (1 + rate);
      return { net: roundPence(net), vat: roundPence(amount - net), gross: roundPence(amount) };
    }
    case 'exclusive': {
      if (rate <= 0) return { net: roundPence(amount), vat: 0, gross: roundPence(amount) };
      const vat = amount * rate;
      return { net: roundPence(amount), vat: roundPence(vat), gross: roundPence(amount + vat) };
    }
    case 'no_vat':
    case 'exempt':
    case 'outside':
    case 'unknown':
      return { net: roundPence(amount), vat: 0, gross: roundPence(amount) };
  }
}

/** Derive the rate from a known net+vat pair (e.g. Dines invoice rows). */
export function inferRate(net: number, vat: number): number | null {
  if (net === 0) return null;
  const rate = vat / net;
  // Snap to standard UK rates when within a rounding penny's tolerance.
  for (const std of [0.20, 0.05]) {
    if (Math.abs(rate - std) < 0.005) return std;
  }
  if (Math.abs(rate) < 0.001) return 0;
  return roundPence(rate * 100) / 100; // custom rate, 2dp
}

export interface VatPosition {
  /** Output VAT collected on sales. */
  outputVat: number;
  /** Input VAT recorded on fees/deductions (all VAT-bearing lines). */
  inputVatRecorded: number;
  /** Input VAT on lines the user marked reclaimable / partially. */
  inputVatPotentiallyReclaimable: number;
  /** outputVat − potentially reclaimable input VAT. Informational only. */
  netPosition: number;
}

/**
 * Event-level VAT position. "Potentially reclaimable" is deliberate
 * wording — eligibility is for the user's accountant to confirm, and the
 * UI must present it that way.
 */
export function calcVatPosition(
  outputVat: number,
  lines: DocLineItem[],
): VatPosition {
  let inputVatRecorded = 0;
  let reclaimable = 0;
  for (const line of lines) {
    const vat = line.vat ?? 0;
    if (vat === 0) continue;
    if (line.role === 'informational') continue;
    // Credits (negative lines) net off input VAT.
    inputVatRecorded += vat;
    if (line.reclaimability === 'reclaimable') reclaimable += vat;
    else if (line.reclaimability === 'partially_reclaimable') reclaimable += vat / 2;
  }
  return {
    outputVat: roundPence(outputVat),
    inputVatRecorded: roundPence(inputVatRecorded),
    inputVatPotentiallyReclaimable: roundPence(reclaimable),
    netPosition: roundPence(outputVat - reclaimable),
  };
}
