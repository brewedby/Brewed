import type { ParsedSalesLine, ParseResult } from '@/types/cogs';

// Column name aliases used by common POS systems
// Ordered from most specific to least specific — first match wins
const PRODUCT_ALIASES = [
  'product name', 'item name', 'product', 'item', 'name',
  'description', 'menu item', 'sku name', 'article',
];
const QUANTITY_ALIASES = [
  'quantity sold', 'qty sold', 'units sold', 'items sold',
  'quantity', 'qty', 'count', 'sold', 'no of items',
];
const UNIT_PRICE_ALIASES = [
  'unit price', 'price per unit', 'item price', 'unit cost',
  'selling price', 'price', 'rate',
];
// "Net sales" wins over "gross sales" because Square's "Gross Sales" includes
// VAT (Net Sales + Tax). We want pre-tax for matching prices in the catalog.
const TOTAL_ALIASES = [
  'net sales', 'product sales', 'gross sales', 'net revenue', 'gross revenue',
  'line total', 'line amount', 'total', 'amount', 'revenue',
  'sales excl. tax', 'sales excl tax', 'subtotal',
];

/** Convert any value to a safe string for parsing. Catches numbers, booleans,
 *  null, undefined, etc. so downstream string ops never throw. */
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
  // Partial match — alias is contained within header or vice versa
  for (const alias of aliases) {
    const partial = lower.findIndex((h) => h.length > 0 && (h.includes(alias) || alias.includes(h)));
    if (partial !== -1) return partial;
  }
  return -1;
}

/**
 * Parse a single CSV line respecting quoted fields, escaped quotes, and
 * tab/semicolon-separated values. Always returns a string[] (never sparse/with holes).
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

/** Parse a currency / number string. Robust to numbers, undefined, and
 *  Square's £1,234.40 formatting (commas as thousands separators). */
function parseMoney(s: unknown): number {
  const str = asString(s);
  if (!str) return 0;
  const clean = str.replace(/[£$€,\s]/g, '');
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

/** Detect the CSV delimiter (comma, semicolon, or tab) by counting on the header row. */
function detectDelimiter(firstLine: string): ',' | '\t' | ';' {
  const safe = asString(firstLine);
  const tabs       = (safe.match(/\t/g)  ?? []).length;
  const commas     = (safe.match(/,/g)   ?? []).length;
  const semicolons = (safe.match(/;/g)   ?? []).length;
  if (tabs > commas && tabs > semicolons) return '\t';
  if (semicolons > commas) return ';';
  return ',';
}

/** Strip a UTF-8 BOM from the start of the content if present. Square and
 *  Excel CSV exports occasionally include one and it confuses the parser. */
function stripBOM(s: string): string {
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
}

export function parseCSVSalesReport(content: string): ParseResult {
  // Normalise line endings + strip BOM
  const safe = stripBOM(asString(content));
  const rawLines = safe.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines = rawLines.filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return {
      lines: [],
      errors: [
        'The file is empty.',
        'Try exporting the report again from your EPOS system.',
      ],
      rawHeaders: [],
      sourceFormat: 'csv',
    };
  }

  if (lines.length < 2) {
    return {
      lines: [],
      errors: [
        'The file has a header row but no data rows.',
        'Make sure you export the full sales report including individual line items, not just a summary.',
      ],
      rawHeaders: [],
      sourceFormat: 'csv',
    };
  }

  // Some POS exports (SumUp, Square reports) prefix the header with a
  // metadata row. Find the first row that looks like column headers.
  let headerIndex = 0;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const lower = lines[i].toLowerCase();
    if (
      lower.includes('product') || lower.includes('item') ||
      lower.includes('quantity') || lower.includes('qty') ||
      lower.includes('name') || lower.includes('description')
    ) {
      headerIndex = i;
      break;
    }
  }

  const delimiter = detectDelimiter(lines[headerIndex]);
  const headers = parseLine(lines[headerIndex], delimiter);

  if (headers.length === 0) {
    return {
      lines: [],
      errors: [
        'Could not read any column headers from the file.',
        'The file may use an unsupported layout or encoding.',
        'Try exporting as CSV from your EPOS provider.',
      ],
      rawHeaders: [],
      sourceFormat: 'csv',
    };
  }

  const productCol  = findColumn(headers, PRODUCT_ALIASES);
  const qtyCol      = findColumn(headers, QUANTITY_ALIASES);
  const priceCol    = findColumn(headers, UNIT_PRICE_ALIASES);
  const totalCol    = findColumn(headers, TOTAL_ALIASES);

  const errors: string[] = [];
  if (productCol === -1) {
    errors.push(
      `We found text but could not identify a product name column (looked for: ${PRODUCT_ALIASES.slice(0, 5).join(', ')}).`,
      `Column headers detected: ${headers.slice(0, 8).join(', ')}${headers.length > 8 ? '…' : ''}.`,
      'Try exporting as a "Items Sold" or "Product Sales" report from your EPOS.',
    );
  }
  if (qtyCol === -1) {
    errors.push(`No recognised quantity column found (looked for: ${QUANTITY_ALIASES.slice(0, 4).join(', ')}).`);
  }
  if (totalCol === -1 && priceCol === -1) {
    errors.push('No recognised price or total column found.');
  }

  if (productCol === -1) {
    return { lines: [], errors, rawHeaders: headers, sourceFormat: 'csv' };
  }

  const expectedCols = headers.length;
  const parsedLines: ParsedSalesLine[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    let cols = parseLine(lines[i], delimiter);
    if (cols.every((c) => !c.trim())) continue; // skip blank rows

    // Square sometimes writes prices like £1,234.40 unquoted, which splits
    // a row into more cells than there are headers. When we see this, try
    // re-parsing the line by treating numeric runs as money tokens.
    if (cols.length > expectedCols) {
      cols = repairOverColumns(cols, expectedCols, productCol);
    }

    const productName = asString(cols[productCol]).trim();
    if (!productName) continue;

    const qty       = qtyCol   !== -1 ? parseMoney(cols[qtyCol])   : 1;
    const unitPrice = priceCol !== -1 ? parseMoney(cols[priceCol]) : null;
    let lineTotal   = totalCol !== -1 ? parseMoney(cols[totalCol]) : 0;

    if (!lineTotal && unitPrice && qty) lineTotal = unitPrice * qty;
    const resolvedUnitPrice = unitPrice ?? (qty > 0 ? lineTotal / qty : null);

    if (isNaN(qty) || qty < 0) continue;
    if (lineTotal < 0) lineTotal = Math.abs(lineTotal);

    parsedLines.push({
      product_name: productName,
      quantity: qty,
      unit_price: resolvedUnitPrice,
      line_total: lineTotal,
    });
  }

  // Merge duplicate product names (some POSs emit one row per transaction)
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

  return {
    lines: Array.from(merged.values()),
    errors,
    rawHeaders: headers,
    sourceFormat: 'csv',
  };
}

/**
 * Square exports occasionally write `£1,234.40` unquoted, which splits a
 * single price column across two CSV cells. When a row has more columns
 * than the header expected, walk left-to-right and re-merge sequences of
 * `£<digits>` / `<digits><digits>` into one cell so column indices line
 * up again.
 *
 * Heuristic: starting at productCol+1, while we have more cells than
 * expected, find adjacent cells that together form a single number
 * (left starts with £/digit, right is purely digits and decimal) and
 * concatenate them.
 */
function repairOverColumns(
  cols: string[],
  expected: number,
  productCol: number,
): string[] {
  // Type is widened to string here because detectDelimiter may return ';'
  // but parseLine already handled it; repairOverColumns works on the split result.
  let cells = [...cols];
  // Don't touch the product name column or earlier — names can contain anything.
  let i = Math.max(0, productCol + 1);
  while (cells.length > expected && i < cells.length - 1) {
    const a = cells[i];
    const b = cells[i + 1];
    // Left can already contain commas from a previous merge (e.g. £1,234)
    const looksLikeMoneyStart = /^[-£$€]?[0-9]+(,[0-9]+)*$/.test(a.trim());
    const looksLikeMoneyTail  = /^[0-9]{3}(\.[0-9]+)?$/.test(b.trim());
    if (looksLikeMoneyStart && looksLikeMoneyTail) {
      cells.splice(i, 2, `${a},${b}`);
      // don't advance i — there might be another split next to this
    } else {
      i++;
    }
  }
  return cells;
}
