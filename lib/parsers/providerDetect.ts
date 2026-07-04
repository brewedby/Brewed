/**
 * Best-effort EPOS/POS provider detection from report content.
 *
 * Pure module — string in, provider name out. Used by both the CSV and
 * PDF import paths so the review sheet can say "Looks like a Square
 * export" instead of just "CSV".
 *
 * Detection is conservative: brand tokens only, checked against a
 * bounded sample of the file (headers + first lines). A null result is
 * normal and fine — the importer works identically without it.
 */

interface ProviderSignature {
  name: string;
  patterns: RegExp[];
}

const SIGNATURES: ProviderSignature[] = [
  // Brand names that plausibly appear in export headers/footers/filenames.
  { name: 'Square',      patterns: [/\bsquare\b/i, /\bsq[_-]/i] },
  { name: 'SumUp',       patterns: [/\bsumup\b/i, /\bsum up\b/i] },
  { name: 'Zettle',      patterns: [/\bzettle\b/i, /\bizettle\b/i] },
  { name: 'Toast',       patterns: [/\btoasttab\b/i, /\btoast pos\b/i] },
  { name: 'Loyverse',    patterns: [/\bloyverse\b/i] },
  { name: 'Lightspeed',  patterns: [/\blightspeed\b/i] },
  { name: 'Goodtill',    patterns: [/\bgoodtill\b/i, /\bthe good till\b/i] },
  { name: 'Epos Now',    patterns: [/\bepos ?now\b/i] },
  { name: 'Clover',      patterns: [/\bclover\b/i] },
  { name: 'Vend',        patterns: [/\bvend\b/i, /\blightspeed retail\b/i] },
  { name: 'Shopify POS', patterns: [/\bshopify\b/i] },
  { name: 'TouchBistro', patterns: [/\btouchbistro\b/i] },
  { name: 'Revel',       patterns: [/\brevel systems\b/i] },
];

const SAMPLE_LIMIT = 4000;

/**
 * Detect the provider from any text sample: raw CSV headers + first lines,
 * extracted PDF text, or the file name. Returns null when nothing matches.
 */
export function detectProvider(...samples: (string | null | undefined)[]): string | null {
  const text = samples.filter(Boolean).join('\n').slice(0, SAMPLE_LIMIT);
  if (!text) return null;
  for (const sig of SIGNATURES) {
    if (sig.patterns.some((re) => re.test(text))) return sig.name;
  }
  return null;
}

export type ImportConfidence = 'high' | 'medium' | 'low';

/**
 * Overall confidence of a parsed import, shown on the review sheet.
 *
 *  high   — several rows, few skips, most items matched to the catalog
 *  medium — usable but worth a glance
 *  low    — sparse or messy extraction; user should check every row
 */
export function computeImportConfidence(input: {
  acceptedRows: number;
  skippedRows: number;
  coveragePercent: number;
  sourceFormat: 'csv' | 'pdf';
}): ImportConfidence {
  const { acceptedRows, skippedRows, coveragePercent, sourceFormat } = input;
  if (acceptedRows === 0) return 'low';

  const totalRows = acceptedRows + skippedRows;
  const skipRatio = totalRows > 0 ? skippedRows / totalRows : 0;

  // PDF extraction is positional guesswork; one grade stricter than CSV.
  const minRowsForHigh = sourceFormat === 'pdf' ? 4 : 3;

  if (acceptedRows <= 1 || skipRatio > 0.5 || coveragePercent < 30) return 'low';
  if (acceptedRows >= minRowsForHigh && skipRatio < 0.2 && coveragePercent >= 70) return 'high';
  return 'medium';
}
