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

/**
 * LZWDecode filter (PDF spec 7.4.4): variable-width codes 9→12 bits,
 * MSB-first bit order, code 256 = clear-table, 257 = end-of-data.
 * PDF defaults EarlyChange=1 — the code width bumps one code early.
 * Older EPOS/report generators (and some print-to-PDF drivers) still
 * emit LZW streams, which previously fell out as "unsupported".
 */
function lzwDecode(data: string): string {
  const bytes = latin1ToBytes(data);
  const CLEAR = 256;
  const EOD = 257;

  let dict: string[] = [];
  const resetDict = () => {
    dict = new Array(258);
    for (let i = 0; i < 256; i++) dict[i] = String.fromCharCode(i);
  };
  resetDict();

  let codeWidth = 9;
  let bitBuf = 0;
  let bitCount = 0;
  let pos = 0;
  let prev: string | null = null;
  let out = '';

  const nextCode = (): number | null => {
    while (bitCount < codeWidth) {
      if (pos >= bytes.length) return null;
      bitBuf = (bitBuf << 8) | bytes[pos++];
      bitCount += 8;
    }
    bitCount -= codeWidth;
    const code = (bitBuf >> bitCount) & ((1 << codeWidth) - 1);
    return code;
  };

  try {
    for (;;) {
      const code = nextCode();
      if (code === null || code === EOD) break;
      if (code === CLEAR) {
        resetDict();
        codeWidth = 9;
        prev = null;
        continue;
      }

      let entry: string;
      if (code < dict.length && dict[code] !== undefined) {
        entry = dict[code];
      } else if (prev !== null) {
        entry = prev + prev[0]; // KwKwK case
      } else {
        break; // corrupt stream
      }

      out += entry;
      if (prev !== null) dict.push(prev + entry[0]);
      prev = entry;

      // EarlyChange=1: widen one code before the table is actually full.
      if (dict.length + 1 >= (1 << codeWidth) && codeWidth < 12) codeWidth++;
    }
  } catch {
    return '';
  }
  return out;
}

/** ASCIIHexDecode filter: hex pairs, whitespace ignored, '>' terminates. */
function asciiHexDecode(data: string): string {
  const clean = data.replace(/\s/g, '');
  const end = clean.indexOf('>');
  const hex = (end === -1 ? clean : clean.slice(0, end));
  let out = '';
  for (let i = 0; i + 1 < hex.length; i += 2) {
    const b = parseInt(hex.slice(i, i + 2), 16);
    if (isNaN(b)) return '';
    out += String.fromCharCode(b);
  }
  // Odd trailing digit is treated as if followed by 0 (PDF spec).
  if (hex.length % 2 === 1) {
    const b = parseInt(hex[hex.length - 1] + '0', 16);
    if (!isNaN(b)) out += String.fromCharCode(b);
  }
  return out;
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
 * Split a content stream into BT…ET text blocks WITHOUT a lazy regex.
 * /BT([\s\S]*?)ET/ stops at the first literal 'ET' byte pair even inside a
 * (…) string operand — '(NET SALES)', '(1 HIGH STREET)' — silently
 * discarding every row after that string in the block. This scanner only
 * treats ET as the block terminator when it is a standalone token outside
 * any string or hex-string operand.
 */
export function splitTextBlocks(content: string): string[] {
  const blocks: string[] = [];
  const n = content.length;
  const isDelim = (c: string | undefined) => c === undefined || !/[A-Za-z0-9]/.test(c);
  let i = 0;
  while (i < n - 1) {
    if (content[i] === 'B' && content[i + 1] === 'T'
        && isDelim(content[i - 1]) && isDelim(content[i + 2])) {
      let j = i + 2;
      let parenDepth = 0;   // PDF literal strings nest with balanced parens
      let inHex = false;
      let end = -1;
      while (j < n) {
        const c = content[j];
        if (parenDepth > 0) {
          if (c === '\\') { j += 2; continue; }
          if (c === '(') parenDepth++;
          else if (c === ')') parenDepth--;
          j++;
          continue;
        }
        if (inHex) {
          if (c === '>') inHex = false;
          j++;
          continue;
        }
        if (c === '(') { parenDepth = 1; j++; continue; }
        if (c === '<' && content[j + 1] !== '<') { inHex = true; j++; continue; }
        if (c === 'E' && content[j + 1] === 'T'
            && isDelim(content[j - 1]) && isDelim(content[j + 2])) {
          end = j;
          break;
        }
        j++;
      }
      if (end === -1) {
        // No clean ET (e.g. an unbalanced '(' in a malformed stream). Don't
        // swallow the entire remainder — bound this block at the next
        // standalone 'BT' so later, well-formed blocks are still recovered.
        let k = i + 2;
        while (k < n - 1 && !(content[k] === 'B' && content[k + 1] === 'T'
            && isDelim(content[k - 1]) && isDelim(content[k + 2]))) k++;
        if (k >= n - 1) { blocks.push(content.slice(i + 2)); break; }
        blocks.push(content.slice(i + 2, k));
        i = k;
        continue;
      }
      blocks.push(content.slice(i + 2, end));
      i = end + 2;
    } else {
      i++;
    }
  }
  return blocks;
}

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

  for (const block of splitTextBlocks(content)) {
    flush();
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

// Sign-aware: refund lines carry '-2 -7.00' (or accountancy '(7.00)') and
// must be netted like the CSV path, not silently dropped as non-numeric.
const MONEY_RE = /^-?[£$€]?-?[\d,]+\.?\d*$|^\([£$€]?[\d,]+\.?\d*\)$/;
const NUM_RE   = /^-?[\d,]+\.?\d*$|^\([\d,]+\.?\d*\)$/;

const SKIP_PATTERNS = [
  /^(total|grand total|subtotal|vat|tax|payment|amount due|commission|settlement|net|gross|summary|date|time|description|report|period|page\s+\d)/i,
  // Summary / deduction / tender lines. These carry negative or aggregate
  // money that, now the tokenizer is sign-aware, would otherwise import as
  // bogus product rows ("Discounts & Comps -12.00", "Card Fee -1.50").
  // A genuine product REFUND row keeps the product's own name (e.g.
  // "Flat White -2 -7.00") and is not matched here, so it still nets.
  /^(discounts?|comps?|refunds?\b|voids?|fees?\b|service charge|gratuit|tips?\b|cash\b|card\b|change\b|rounding|deposit|charge|adjustment|balance)/i,
  /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
  /^\d{4}[\/\-]\d{2}[\/\-]\d{2}/,
];

function shouldSkip(line: string): boolean {
  const t = line.trim();
  return SKIP_PATTERNS.some(re => re.test(t));
}

function parseMoney(s: string): number {
  const neg = /^\(.+\)$/.test(s.trim());
  const n = parseFloat(s.replace(/[()£$€,\s]/g, ''));
  if (isNaN(n)) return 0;
  return neg ? -n : n;
}

function parseRows(textLines: string[]): { lines: ParsedSalesLine[]; refundRowCount: number } {
  const results: ParsedSalesLine[] = [];
  let refundRowCount = 0;

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

    const numbers = numTokens.map(parseMoney).filter(n => n !== 0);
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
      // Negative integer quantities are refunds, not unit prices.
      if (qty !== Math.floor(qty) || qty === 0 || Math.abs(qty) > 10000) {
        qty = 1;
        unitPrice = numbers[0];
        lineTotal = numbers[1];
      }
    } else {
      qty = numbers[0];
      unitPrice = numbers[1];
      lineTotal = numbers[numbers.length - 1];
      if (unitPrice && Math.abs(qty * unitPrice - lineTotal) / (Math.abs(lineTotal) || 1) > 0.1) {
        unitPrice = null;
      }
    }

    if (qty === 0 || Math.abs(qty) > 10000 || lineTotal === 0) continue;
    // Refund rows stay NEGATIVE so they net against sales of the same
    // product in the merge below — the CSV path already works this way;
    // dropping them here overstated PDF-imported revenue.
    if (qty < 0 || lineTotal < 0) refundRowCount++;

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

  // Fully-refunded products carry no sales to import.
  for (const [key, line] of Array.from(merged.entries())) {
    if (line.quantity <= 0 && line.line_total <= 0) merged.delete(key);
  }

  return { lines: Array.from(merged.values()), refundRowCount };
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
    } else if (filter === 'LZWDecode') {
      content = lzwDecode(content);
      if (!content) continue;
      decoded++;
    } else if (filter === 'ASCIIHexDecode') {
      content = asciiHexDecode(content);
      if (!content) continue;
      decoded++;
    } else if (filter === null || filter === undefined) {
      decoded++;
    } else {
      // Genuinely unsupported (JBIG2/CCITT are image codecs — a report
      // made only of those is image-only by definition). Skip.
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
        'This report uses a PDF format that cannot be read on-device yet.',
        'We found the document structure but its text is stored in an encoding we cannot decode locally.',
        'Export a CSV from your EPOS provider where possible — CSV imports are instant and fully supported.',
      ],
      warnings: [], sourceFormat: 'pdf', reportDate: null, reason: 'decode_failed',
      streamsFound: rawStreams.length, streamsDecoded: decoded, extractedLineCount: 0, provider: null,
    };
  }

  const reportDate = detectDate(allTextLines);
  const provider = detectProvider(allTextLines.slice(0, 40).join('\n'));
  const { lines: salesLines, refundRowCount } = parseRows(allTextLines);

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
  if (refundRowCount > 0) {
    warnings.push(`${refundRowCount} refund line${refundRowCount === 1 ? '' : 's'} detected and netted against sales.`);
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
