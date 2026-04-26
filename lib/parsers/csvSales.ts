import type { ParsedSalesLine, ParseResult } from '@/types/cogs';

// Column name aliases used by common POS systems
// Ordered from most specific to least specific — first match wins
const PRODUCT_ALIASES = [
  'product name', 'item name', 'product', 'item', 'name',
  'description', 'menu item', 'sku name', 'article',
];
const QUANTITY_ALIASES = [
  'quantity sold', 'qty sold', 'units sold', 'quantity', 'qty',
  'count', 'sold', 'items sold', 'no of items',
];
const UNIT_PRICE_ALIASES = [
  'unit price', 'price per unit', 'item price', 'unit cost',
  'selling price', 'price', 'rate',
];
const TOTAL_ALIASES = [
  'gross sales', 'net sales', 'net revenue', 'gross revenue',
  'line total', 'line amount', 'total', 'amount', 'revenue',
  'sales excl. tax', 'sales excl tax', 'subtotal',
];

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9. ]/g, '').trim();
}

function findColumn(headers: string[], aliases: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9 .]/g, '').trim());
  for (const alias of aliases) {
    const exact = lower.indexOf(alias);
    if (exact !== -1) return exact;
  }
  // Partial match — alias is contained within header or vice versa
  for (const alias of aliases) {
    const partial = lower.findIndex((h) => h.includes(alias) || alias.includes(h));
    if (partial !== -1) return partial;
  }
  return -1;
}

/**
 * Parses a single CSV line respecting quoted fields.
 */
function parseLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Handle escaped double-quotes ("")
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if ((ch === ',' || ch === '\t') && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

/**
 * Parse a currency/number string — strips £$€ commas etc.
 */
function parseMoney(s: string | undefined): number {
  if (!s) return 0;
  const clean = s.replace(/[£$€,\s]/g, '');
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

/**
 * Detect the CSV delimiter (comma or tab).
 */
function detectDelimiter(firstLine: string): ',' | '\t' {
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return tabs > commas ? '\t' : ',';
}

export function parseCSVSalesReport(content: string): ParseResult {
  // Normalise line endings
  const rawLines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines = rawLines.filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return {
      lines: [],
      errors: ['File appears to be empty or has no data rows'],
      rawHeaders: [],
      sourceFormat: 'csv',
    };
  }

  // SumUp exports sometimes start with metadata rows before the header
  // Find the header row by looking for a line that contains a product-like word
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
  const headers = parseLine(lines[headerIndex]);

  const productCol  = findColumn(headers, PRODUCT_ALIASES);
  const qtyCol      = findColumn(headers, QUANTITY_ALIASES);
  const priceCol    = findColumn(headers, UNIT_PRICE_ALIASES);
  const totalCol    = findColumn(headers, TOTAL_ALIASES);

  const errors: string[] = [];
  if (productCol === -1) errors.push(`Could not find a product name column. Headers found: ${headers.join(', ')}`);
  if (qtyCol === -1)     errors.push('Could not find a quantity column');
  if (totalCol === -1 && priceCol === -1) errors.push('Could not find a total or unit price column');

  if (productCol === -1) {
    return { lines: [], errors, rawHeaders: headers, sourceFormat: 'csv' };
  }

  const parsedLines: ParsedSalesLine[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.every((c) => !c.trim())) continue; // skip blank rows

    const productName = cols[productCol]?.trim() ?? '';
    if (!productName) continue;

    const qty      = qtyCol !== -1 ? parseMoney(cols[qtyCol]) : 1;
    const unitPrice = priceCol !== -1 ? parseMoney(cols[priceCol]) : null;
    let lineTotal   = totalCol !== -1 ? parseMoney(cols[totalCol]) : 0;

    // Derive total from price × qty if total column missing or zero
    if (!lineTotal && unitPrice && qty) lineTotal = unitPrice * qty;
    // Derive unit price from total / qty if price column missing
    const resolvedUnitPrice = unitPrice ?? (qty > 0 ? lineTotal / qty : null);

    if (isNaN(qty) || qty < 0) continue;
    if (lineTotal < 0) lineTotal = Math.abs(lineTotal); // some POS exports refunds as negative

    parsedLines.push({
      product_name: productName,
      quantity: qty,
      unit_price: resolvedUnitPrice,
      line_total: lineTotal,
    });
  }

  // Merge duplicate product names (some systems emit one row per transaction)
  const merged = new Map<string, ParsedSalesLine>();
  for (const line of parsedLines) {
    const key = normalise(line.product_name);
    const existing = merged.get(key);
    if (existing) {
      existing.quantity   += line.quantity;
      existing.line_total += line.line_total;
      // Recalculate blended unit price
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
