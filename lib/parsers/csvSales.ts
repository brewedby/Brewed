import type { ParsedSalesLine, ParseDiagnostics, ParseResult } from '@/types/cogs';

// Column name aliases used by common POS systems (Square, SumUp, Toast, Lightspeed,
// Goodtill, Loyverse, Vend). Ordered most-specific → least-specific so the first
// match wins.
const PRODUCT_ALIASES = [
  'product name', 'item name', 'product', 'item', 'name',
  'description', 'menu item', 'sku name', 'article', 'category item',
];
const QUANTITY_ALIASES = [
  'quantity sold', 'qty sold', 'units sold', 'items sold',
  'quantity', 'qty', 'count', 'sold', 'no of items', 'nb',
];
const UNIT_PRICE_ALIASES = [
  'unit price', 'price per unit', 'item price', 'unit cost',
  'selling price', 'price', 'rate', 'amount per unit',
];
// "Net sales" wins over "gross sales" because Square's "Gross Sales" includes
// VAT (Net Sales + Tax). We want pre-tax for matching prices in the catalog.
const TOTAL_ALIASES = [
  'net sales', 'product sales', 'gross sales', 'net revenue', 'gross revenue',
  'line total', 'line amount', 'total', 'amount', 'revenue',
  'sales excl. tax', 'sales excl tax', 'subtotal', 'turnover',
];

// Header detection vocabulary — any of these tokens in a single line marks
// it as the likely header row. Wider than the alias lists so non-canonical
// exports still snap to the right row.
const HEADER_HINTS = [
  'product', 'item', 'sku', 'name', 'description', 'menu',
  'quantity', 'qty', 'count', 'units', 'sold',
  'price', 'amount', 'total', 'sales', 'revenue', 'subtotal',
  'category', 'tax', 'vat',
];

/** Convert any value to a safe string for parsing. */
function asString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  return String(v);
}

function normalise(s: unknown): string {
  return asString(s).toLowerCase().replace(/[^a-z0-9. ]/g, '').trim();
}

function findColumn(headers: string[], aliases: string[]): number {
  const lower = headers.map((h) => normalise(h));
  for (const alias of aliases) {
    const exact = lower.indexOf(alias);
    if (exact !== -1) return exact;
  }
  for (const alias of aliases) {
    const partial = lower.findIndex((h) => h.length > 0 && (h.includes(alias) || alias.includes(h)));
    if (partial !== -1) return partial;
  }
  return -1;
}

/**
 * Parse a single CSV line respecting quoted fields, escaped quotes, and the
 * caller-detected delimiter. Always returns string[] (never sparse).
 */
function parseLine(line: string, delimiter: ',' | '\t' | ';' = ','): string[] {
  const safeLine = asString(line);
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < safeLine.length; i++) {
    const ch = safeLine[i];
    if (ch === '"') {
      if (inQuotes && safeLine[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

/** Currency / number parser. Tolerates £$€, thousands separators, parentheses
 *  for negatives, and stray spaces. */
function parseMoney(s: unknown): number {
  const str = asString(s).trim();
  if (!str) return 0;
  // (12.34) → -12.34 (accountancy negative)
  const neg = /^\(.+\)$/.test(str);
  const clean = str.replace(/[()£$€,\s]/g, '');
  const n = parseFloat(clean);
  if (isNaN(n)) return 0;
  return neg ? -n : n;
}

/** Detect the CSV delimiter on the candidate header line. */
function detectDelimiter(line: string): ',' | '\t' | ';' {
  const safe = asString(line);
  const tabs       = (safe.match(/\t/g) ?? []).length;
  const commas     = (safe.match(/,/g)  ?? []).length;
  const semicolons = (safe.match(/;/g)  ?? []).length;
  if (tabs >= 2 && tabs > commas && tabs > semicolons) return '\t';
  if (semicolons > commas) return ';';
  return ',';
}

/** Strip a UTF-8 BOM from the start of the content if present. */
function stripBOM(s: string): string {
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
}

/** Score a line for "looks like a column-header row". A row that's mostly
 *  short alphabetic tokens with header-vocabulary hits scores higher than
 *  a metadata/title row or a numeric data row. */
function headerScore(line: string, delimiter: ',' | ';' | '\t'): number {
  const lower = line.toLowerCase();
  let score = 0;
  for (const hint of HEADER_HINTS) if (lower.includes(hint)) score += 2;
  // bonus for having multiple delimiters (a real header row is multi-column)
  const cells = parseLine(line, delimiter);
  if (cells.length >= 4) score += 2;
  if (cells.length >= 6) score += 2;
  // penalty for currency / digits in most cells (looks like a data row)
  let numericCells = 0;
  for (const c of cells) if (/^[-£$€]?[0-9]+([.,][0-9]+)*$/.test(c.trim())) numericCells++;
  if (numericCells >= Math.max(2, cells.length / 2)) score -= 4;
  return score;
}

/** Pick the most likely header row in the first 10 non-empty lines. */
function findHeaderRow(lines: string[]): { index: number; delimiter: ',' | ';' | '\t' } {
  let bestIndex = 0;
  let bestScore = -Infinity;
  let bestDelim: ',' | ';' | '\t' = ',';
  const scanLimit = Math.min(10, lines.length);
  for (let i = 0; i < scanLimit; i++) {
    const delim = detectDelimiter(lines[i]);
    const score = headerScore(lines[i], delim);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
      bestDelim = delim;
    }
  }
  return { index: bestIndex, delimiter: bestDelim };
}

function emptyDiagnostics(fileSizeBytes: number | null): ParseDiagnostics {
  return {
    fileSizeBytes,
    rawLineCount: 0,
    nonEmptyLineCount: 0,
    detectedDelimiter: null,
    headerRowIndex: null,
    detectedHeaders: [],
    parsedRowCount: 0,
    acceptedRowCount: 0,
    skippedRowCount: 0,
    skipReasons: {},
  };
}

export function parseCSVSalesReport(
  content: string,
  fileSizeBytes: number | null = null,
): ParseResult {
  const safe = stripBOM(asString(content));
  const rawLines = safe.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines = rawLines.filter((l) => l.trim().length > 0);

  const diagnostics: ParseDiagnostics = {
    ...emptyDiagnostics(fileSizeBytes),
    rawLineCount: rawLines.length,
    nonEmptyLineCount: lines.length,
  };

  if (lines.length === 0) {
    return {
      lines: [],
      errors: [
        'The file is empty.',
        'Try exporting the report again from your EPOS system.',
      ],
      rawHeaders: [],
      sourceFormat: 'csv',
      diagnostics,
    };
  }

  const { index: headerIndex, delimiter } = findHeaderRow(lines);
  diagnostics.detectedDelimiter = delimiter;
  diagnostics.headerRowIndex = headerIndex;

  if (lines.length - headerIndex < 2) {
    return {
      lines: [],
      errors: [
        'The file has a header row but no data rows.',
        'Make sure the export includes individual line items, not just a summary.',
      ],
      rawHeaders: [],
      sourceFormat: 'csv',
      diagnostics,
    };
  }

  const headers = parseLine(lines[headerIndex], delimiter);
  diagnostics.detectedHeaders = headers;

  if (headers.length === 0) {
    return {
      lines: [],
      errors: [
        'Could not read any column headers from the file.',
        'The file may use an unsupported layout or encoding.',
        'Try re-exporting as CSV from your EPOS provider.',
      ],
      rawHeaders: [],
      sourceFormat: 'csv',
      diagnostics,
    };
  }

  const productCol = findColumn(headers, PRODUCT_ALIASES);
  const qtyCol     = findColumn(headers, QUANTITY_ALIASES);
  const priceCol   = findColumn(headers, UNIT_PRICE_ALIASES);
  const totalCol   = findColumn(headers, TOTAL_ALIASES);

  const errors: string[] = [];
  if (productCol === -1) {
    const preview = headers.slice(0, 8).join(', ') + (headers.length > 8 ? '…' : '');
    errors.push(
      "We couldn't find a product/item column.",
      `Detected columns: ${preview}.`,
      'Try exporting an "Items Sold" or "Product Sales" report from your EPOS.',
    );
  }
  if (productCol !== -1 && qtyCol === -1 && totalCol === -1 && priceCol === -1) {
    errors.push("Found a product column but no quantity, price or total column.");
  }

  if (productCol === -1) {
    return { lines: [], errors, rawHeaders: headers, sourceFormat: 'csv', diagnostics };
  }

  const expectedCols = headers.length;
  const parsedLines: ParsedSalesLine[] = [];
  const skipReasons: Record<string, number> = {};
  const bumpSkip = (reason: string) => { skipReasons[reason] = (skipReasons[reason] ?? 0) + 1; };
  let parsedRowCount = 0;

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) { bumpSkip('blank'); continue; }
    parsedRowCount++;

    let cols = parseLine(raw, delimiter);
    if (cols.every((c) => !c.trim())) { bumpSkip('blank'); continue; }

    // Square sometimes writes prices like £1,234.40 unquoted, splitting one
    // money cell into two. When a row has more cells than expected, repair.
    if (cols.length > expectedCols) {
      cols = repairOverColumns(cols, expectedCols, productCol);
    }

    const productName = asString(cols[productCol]).trim();
    if (!productName) { bumpSkip('no_product_name'); continue; }

    // Skip Square / Toast totals/footer rows that re-appear at the bottom
    // of an export. They almost always have an empty SKU + "TOTAL" name.
    if (/^(total|grand total|subtotal)$/i.test(productName)) {
      bumpSkip('summary_row');
      continue;
    }

    const qty       = qtyCol   !== -1 ? parseMoney(cols[qtyCol])   : 1;
    const unitPrice = priceCol !== -1 ? parseMoney(cols[priceCol]) : null;
    let lineTotal   = totalCol !== -1 ? parseMoney(cols[totalCol]) : 0;

    if (!lineTotal && unitPrice && qty) lineTotal = unitPrice * qty;
    const resolvedUnitPrice = unitPrice ?? (qty > 0 ? lineTotal / qty : null);

    if (isNaN(qty) || qty < 0) { bumpSkip('invalid_quantity'); continue; }
    if (qty === 0 && lineTotal === 0) { bumpSkip('zero_row'); continue; }
    if (lineTotal < 0) lineTotal = Math.abs(lineTotal);

    parsedLines.push({
      product_name: productName,
      quantity: qty,
      unit_price: resolvedUnitPrice,
      line_total: lineTotal,
    });
  }

  diagnostics.parsedRowCount = parsedRowCount;
  diagnostics.acceptedRowCount = parsedLines.length;
  diagnostics.skippedRowCount = parsedRowCount - parsedLines.length;
  diagnostics.skipReasons = skipReasons;

  // Merge duplicate product names (some POSs emit one row per transaction).
  const merged = new Map<string, ParsedSalesLine>();
  for (const line of parsedLines) {
    const key = normalise(line.product_name);
    const existing = merged.get(key);
    if (existing) {
      existing.quantity   += line.quantity;
      existing.line_total += line.line_total;
      existing.unit_price = existing.quantity > 0 ? existing.line_total / existing.quantity : null;
    } else {
      merged.set(key, { ...line });
    }
  }

  // If we got data rows but parsed nothing usable, surface a helpful message
  // rather than the misleading "file is empty".
  if (merged.size === 0 && parsedRowCount > 0) {
    errors.push(
      `Found ${parsedRowCount} data row(s) but none had a usable product/quantity.`,
      `Detected columns: ${headers.slice(0, 8).join(', ')}${headers.length > 8 ? '…' : ''}.`,
      'Check that the export contains individual items, not just a summary.',
    );
  }

  return {
    lines: Array.from(merged.values()),
    errors,
    rawHeaders: headers,
    sourceFormat: 'csv',
    diagnostics,
  };
}

/**
 * Square exports occasionally write `£1,234.40` unquoted, which splits a
 * single money column across two CSV cells. When a row has more columns
 * than the header expected, walk left-to-right from productCol+1 and
 * re-merge sequences of `£<digits>` / `<digits>(<.digits>)?` into one cell.
 */
function repairOverColumns(
  cols: string[],
  expected: number,
  productCol: number,
): string[] {
  let cells = [...cols];
  let i = Math.max(0, productCol + 1);
  while (cells.length > expected && i < cells.length - 1) {
    const a = cells[i];
    const b = cells[i + 1];
    const looksLikeMoneyStart = /^[-£$€]?[0-9]+(,[0-9]+)*$/.test(a.trim());
    const looksLikeMoneyTail  = /^[0-9]{3}(\.[0-9]+)?$/.test(b.trim());
    if (looksLikeMoneyStart && looksLikeMoneyTail) {
      cells.splice(i, 2, `${a},${b}`);
    } else {
      i++;
    }
  }
  return cells;
}
