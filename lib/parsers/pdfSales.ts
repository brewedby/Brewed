/**
 * Local PDF text extraction for POS sales reports.
 *
 * Processes PDFs entirely on-device — no data is sent to any server.
 * Handles text-based PDFs (where text is selectable). Image-only PDFs
 * (scans, photos) cannot be read without OCR and return a clear message.
 *
 * Supported stream filters: none (raw), FlateDecode (zlib via pako).
 * Unsupported: LZWDecode, ASCIIHexDecode, JBIG2, CCITTFax.
 */
import pako from 'pako';
import type { ParsedSalesLine } from '@/types/cogs';
import { detectProvider } from './providerDetect';

// ── Binary helpers ───────────────────────────────────────────────────────────

function bytesToLatin1(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i]);
  }
  return s;
}

function latin1ToBytes(s: string): Uint8Array {
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
  return b;
}

// ── PDF validation ───────────────────────────────────────────────────────────

function isPdf(bytes: Uint8Array): boolean {
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

function isEncrypted(raw: string): boolean {
  return /\/Encrypt\s+\d+/.test(raw);
}

// ── Stream extraction ────────────────────────────────────────────────────────

interface RawStream {
  dict: string;
  data: string;
}

function extractStreams(raw: string): RawStream[] {
  const out: RawStream[] = [];
  // Match << dict >> stream \n data \n endstream
  const re = /<<([\s\S]{0,1000}?)>>\s*stream[\r\n]([\s\S]*?)[\r\n]endstream/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const dict = m[1];
    // Skip image objects (not text content streams)
    if (/\/Subtype\s*\/Image/i.test(dict)) continue;
    out.push({ dict, data: m[2] });
  }
  return out;
}

function streamFilter(dict: string): string | null {
  const m = dict.match(/\/Filter\s*(?:\/(\w+)|\s*\[\/(\w+)\])/);
  return (m?.[1] ?? m?.[2] ?? null);
}

function inflate(data: string): string {
  try {
    return bytesToLatin1(pako.inflate(latin1ToBytes(data)));
  } catch {
    return '';
  }
}

// ── PDF string decoding ──────────────────────────────────────────────────────

function decodePdfString(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
}

function decodeHexString(hex: string): string {
  let s = '';
  for (let i = 0; i < hex.length; i += 2) {
    s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  }
  return s;
}

// ── Text extraction from content streams ────────────────────────────────────

/**
 * Extract text from a PDF content stream.
 * Returns lines of text, reconstructing breaks from Td/TD/T* operators
 * (each positioning operator is treated as a line separator).
 */
function extractText(content: string): string[] {
  const lines: string[] = [];
  let currentLine = '';

  function flush() {
    const t = currentLine.trim();
    if (t) lines.push(t);
    currentLine = '';
  }

  // Iterate over BT...ET blocks
  const btRe = /BT([\s\S]*?)ET/g;
  let btMatch: RegExpExecArray | null;

  while ((btMatch = btRe.exec(content)) !== null) {
    flush();
    const block = btMatch[1];
    let i = 0;

    while (i < block.length) {
      // Skip whitespace
      if (/\s/.test(block[i])) { i++; continue; }

      // Literal string (text)
      if (block[i] === '(') {
        let j = i + 1;
        let str = '';
        while (j < block.length) {
          if (block[j] === '\\' && j + 1 < block.length) {
            str += block[j] + block[j + 1]; j += 2; continue;
          }
          if (block[j] === ')') { j++; break; }
          str += block[j]; j++;
        }
        currentLine += decodePdfString(str);
        i = j;
        continue;
      }

      // Hex string <hex>
      if (block[i] === '<' && block[i + 1] !== '<') {
        let j = i + 1;
        let hex = '';
        while (j < block.length && block[j] !== '>') { hex += block[j]; j++; }
        j++;
        currentLine += decodeHexString(hex);
        i = j;
        continue;
      }

      // Array [...]TJ — collect strings, skip numeric kerning values
      if (block[i] === '[') {
        let j = i + 1;
        let depth = 0;
        while (j < block.length) {
          if (block[j] === '[') { depth++; j++; continue; }
          if (block[j] === ']') { if (depth === 0) { j++; break; } depth--; j++; continue; }
          // string inside array
          if (block[j] === '(') {
            j++;
            let str = '';
            while (j < block.length) {
              if (block[j] === '\\' && j + 1 < block.length) {
                str += block[j] + block[j + 1]; j += 2; continue;
              }
              if (block[j] === ')') { j++; break; }
              str += block[j]; j++;
            }
            currentLine += decodePdfString(str);
          } else if (block[j] === '<') {
            j++;
            let hex = '';
            while (j < block.length && block[j] !== '>') { hex += block[j]; j++; }
            j++;
            currentLine += decodeHexString(hex);
          } else {
            j++;
          }
        }
        i = j;
        continue;
      }

      // Number or operator
      const numMatch = block.slice(i).match(/^-?[\d.]+/);
      if (numMatch) { i += numMatch[0].length; continue; }

      const opMatch = block.slice(i).match(/^[a-zA-Z*"']+/);
      if (opMatch) {
        const op = opMatch[0];
        i += op.length;
        // Text-positioning operators → line break
        if (op === 'Td' || op === 'TD' || op === 'T*' || op === 'Tm' || op === '"' || op === "'") {
          flush();
        }
        // Tj / TJ — text already appended via string parsing above
        continue;
      }

      i++; // skip unknown character
    }

    flush();
  }

  return lines.filter(l => l.trim().length > 0);
}

// ── Sales row parsing from extracted text ────────────────────────────────────

const MONEY_RE = /^[£$€]?[\d,]+\.?\d*$/;
const NUM_RE   = /^[\d,]+\.?\d*$/;

const SKIP_PATTERNS = [
  /^(total|grand total|subtotal|vat|tax|payment|amount due|commission|settlement|net|gross|summary|date|time|description|report|period|page\s+\d)/i,
  /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
  /^\d{4}[\/\-]\d{2}[\/\-]\d{2}/,
];

function shouldSkip(line: string): boolean {
  const t = line.trim();
  return SKIP_PATTERNS.some(re => re.test(t));
}

function parseMoney(s: string): number {
  const n = parseFloat(s.replace(/[£$€,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

function parseRows(textLines: string[]): ParsedSalesLine[] {
  const results: ParsedSalesLine[] = [];

  for (const raw of textLines) {
    const line = raw.trim();
    if (!line || line.length < 4) continue;
    if (shouldSkip(line)) continue;

    const tokens = line.split(/\s+/);
    if (tokens.length < 2) continue;

    // Find rightmost block of numeric tokens
    let numStart = tokens.length;
    while (numStart > 0 && (MONEY_RE.test(tokens[numStart - 1]) || NUM_RE.test(tokens[numStart - 1]))) {
      numStart--;
    }

    const numTokens = tokens.slice(numStart);
    const productTokens = tokens.slice(0, numStart);

    if (numTokens.length === 0 || numTokens.length > 4) continue;
    if (productTokens.length === 0) continue;

    const productName = productTokens.join(' ').trim();
    if (productName.length < 2 || productName.length > 100) continue;
    // Skip lines that are entirely numeric (unlikely to be product names)
    if (/^[\d£$€.,\s\-]+$/.test(productName)) continue;

    const numbers = numTokens.map(parseMoney).filter(n => n > 0);
    if (numbers.length === 0) continue;

    let qty: number;
    let unitPrice: number | null = null;
    let lineTotal: number;

    if (numbers.length === 1) {
      qty = 1;
      lineTotal = numbers[0];
    } else if (numbers.length === 2) {
      qty = numbers[0];
      lineTotal = numbers[1];
      if (qty !== Math.floor(qty) || qty <= 0 || qty > 10000) {
        qty = 1;
        unitPrice = numbers[0];
        lineTotal = numbers[1];
      }
    } else {
      qty = numbers[0];
      unitPrice = numbers[1];
      lineTotal = numbers[numbers.length - 1];
      if (unitPrice && Math.abs(qty * unitPrice - lineTotal) / (lineTotal || 1) > 0.1) {
        unitPrice = null;
      }
    }

    if (qty <= 0 || qty > 10000 || lineTotal <= 0) continue;

    results.push({ product_name: productName, quantity: qty, unit_price: unitPrice, line_total: lineTotal });
  }

  // Merge duplicate product names
  const merged = new Map<string, ParsedSalesLine>();
  for (const r of results) {
    const key = r.product_name.toLowerCase().replace(/\s+/g, ' ');
    const ex = merged.get(key);
    if (ex) {
      ex.quantity += r.quantity;
      ex.line_total += r.line_total;
      ex.unit_price = ex.quantity > 0 ? ex.line_total / ex.quantity : null;
    } else {
      merged.set(key, { ...r });
    }
  }
  return Array.from(merged.values());
}

// ── Date detection ───────────────────────────────────────────────────────────

function detectDate(textLines: string[]): string | null {
  const dateRes = [
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/,
    /\b(\d{4})[\/\-](\d{2})[\/\-](\d{2})\b/,
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})\b/i,
  ];
  for (const line of textLines.slice(0, 20)) {
    for (const re of dateRes) {
      const m = line.match(re);
      if (m) return m[0];
    }
  }
  return null;
}

// ── Result type ──────────────────────────────────────────────────────────────

export type PdfParseReason =
  | 'ok'
  | 'image_only'
  | 'encrypted'
  | 'not_pdf'
  | 'no_items'
  | 'totals_only'
  | 'decode_failed';

export interface PdfParseResult {
  lines: ParsedSalesLine[];
  errors: string[];
  warnings: string[];
  sourceFormat: 'pdf';
  reportDate: string | null;
  reason: PdfParseReason;
  streamsFound: number;
  streamsDecoded: number;
  extractedLineCount: number;
  /** Detected EPOS provider (computed here so raw text never leaves this module). */
  provider: string | null;
}

// ── Main entry point ─────────────────────────────────────────────────────────

export function parsePDFSalesReport(
  pdfBytes: Uint8Array,
): PdfParseResult {
  if (!isPdf(pdfBytes)) {
    return {
      lines: [], errors: ['This file does not appear to be a valid PDF.'],
      warnings: [], sourceFormat: 'pdf', reportDate: null, reason: 'not_pdf',
      streamsFound: 0, streamsDecoded: 0, extractedLineCount: 0, provider: null,
    };
  }

  const raw = bytesToLatin1(pdfBytes);

  if (isEncrypted(raw)) {
    return {
      lines: [], errors: [
        'This PDF is password-protected and cannot be read automatically.',
        'Remove the password in the Files app or your EPOS portal, then try again.',
        'Or export a CSV from your EPOS if one is available.',
      ],
      warnings: [], sourceFormat: 'pdf', reportDate: null, reason: 'encrypted',
      streamsFound: 0, streamsDecoded: 0, extractedLineCount: 0, provider: null,
    };
  }

  const rawStreams = extractStreams(raw);
  let allTextLines: string[] = [];
  let decoded = 0;

  for (const stream of rawStreams) {
    const filter = streamFilter(stream.dict);
    let content = stream.data;

    if (filter === 'FlateDecode') {
      content = inflate(content);
      if (!content) continue;
      decoded++;
    } else if (filter === null || filter === undefined) {
      decoded++;
    } else {
      // Unsupported filter — skip silently
      continue;
    }

    const lines = extractText(content);
    allTextLines = allTextLines.concat(lines);
  }

  if (allTextLines.length === 0) {
    if (rawStreams.length === 0 || decoded === 0) {
      return {
        lines: [], errors: [
          'This PDF appears to be image-based and cannot be read automatically.',
          'Scanned receipts and photo-saved PDFs cannot be processed without OCR.',
          'Try exporting a CSV from your EPOS provider instead.',
          'If your provider only offers PDF, check if they have a "text-based" export option.',
        ],
        warnings: [], sourceFormat: 'pdf', reportDate: null, reason: 'image_only',
        streamsFound: rawStreams.length, streamsDecoded: decoded, extractedLineCount: 0, provider: null,
      };
    }
    return {
      lines: [], errors: [
        'We found PDF content but could not extract readable text.',
        'The PDF may use an unsupported font encoding.',
        'Try exporting a CSV from your EPOS instead.',
      ],
      warnings: [], sourceFormat: 'pdf', reportDate: null, reason: 'decode_failed',
      streamsFound: rawStreams.length, streamsDecoded: decoded, extractedLineCount: 0, provider: null,
    };
  }

  const reportDate = detectDate(allTextLines);
  const provider = detectProvider(allTextLines.slice(0, 40).join('\n'));
  const salesLines = parseRows(allTextLines);

  if (salesLines.length === 0) {
    const allText = allTextLines.join('\n');
    const hasTotals = /\b(total|gross|net|subtotal)\b/i.test(allText);
    const hasMoney = /[£$€]?\d+\.\d{2}/.test(allText);

    if (hasTotals && hasMoney) {
      return {
        lines: [], errors: [
          'We found totals but no item-level rows in this PDF.',
          'This appears to be a summary report, not an items-sold report.',
          'Ask your EPOS provider for a "Product Sales" or "Items Sold" report.',
          'Or use the CSV export which usually includes per-product breakdown.',
        ],
        warnings: [], sourceFormat: 'pdf', reportDate, reason: 'totals_only',
        streamsFound: rawStreams.length, streamsDecoded: decoded,
        extractedLineCount: allTextLines.length, provider,
      };
    }

    return {
      lines: [], errors: [
        'We found text but could not identify product and quantity columns.',
        'The layout may not be in a recognised table format.',
        'Try exporting a CSV from your EPOS if available.',
        'Or check that this PDF shows individual products — not just a daily summary.',
      ],
      warnings: [], sourceFormat: 'pdf', reportDate, reason: 'no_items',
      streamsFound: rawStreams.length, streamsDecoded: decoded,
      extractedLineCount: allTextLines.length, provider,
    };
  }

  const warnings: string[] = [];
  if (salesLines.length < 2) {
    warnings.push('Only one item was detected. Check the product list below before importing.');
  }

  return {
    lines: salesLines,
    errors: [],
    warnings,
    sourceFormat: 'pdf',
    reportDate,
    reason: 'ok',
    streamsFound: rawStreams.length,
    streamsDecoded: decoded,
    extractedLineCount: allTextLines.length,
    provider,
  };
}
