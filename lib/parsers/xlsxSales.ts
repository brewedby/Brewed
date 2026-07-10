/**
 * Local XLSX (Excel workbook) reader for sales report import.
 *
 * Runs entirely on-device: a minimal ZIP central-directory reader (with
 * pako inflateRaw for deflated entries) plus a small SpreadsheetML cell
 * parser. The extracted grid is converted to CSV text and fed through
 * parseCSVSalesReport, so header detection, column aliases, refund
 * netting and diagnostics are identical to a real CSV import.
 *
 * Deliberately NOT a general XLSX library:
 *  - first worksheet only (POS exports are single-sheet)
 *  - shared strings + inline strings + numeric cells
 *  - no formula evaluation (cached <v> values are used, which is what
 *    Excel writes for exported reports)
 *  - no styles/dates conversion beyond the raw stored value
 *
 * Legacy binary .xls (BIFF, not a zip) is out of scope — callers keep
 * showing the Save-As-CSV guidance for it.
 */

import pako from 'pako';
import { parseCSVSalesReport } from './csvSales';
import type { ParseResult } from '@/types/cogs';

// ── Minimal ZIP reader ───────────────────────────────────────────────────────

interface ZipEntry {
  name: string;
  method: number;       // 0 = stored, 8 = deflate
  compressedSize: number;
  localHeaderOffset: number;
}

function readU16(b: Uint8Array, o: number): number { return b[o] | (b[o + 1] << 8); }
function readU32(b: Uint8Array, o: number): number {
  return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
}

const EOCD_SIG = 0x06054b50;
const CDIR_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;

function findEntries(bytes: Uint8Array): ZipEntry[] | null {
  // End-of-central-directory: scan backwards (comment can pad the tail).
  let eocd = -1;
  const scanFrom = Math.max(0, bytes.length - 22 - 65535);
  for (let i = bytes.length - 22; i >= scanFrom; i--) {
    if (readU32(bytes, i) === EOCD_SIG) { eocd = i; break; }
  }
  if (eocd === -1) return null;

  const entryCount = readU16(bytes, eocd + 10);
  let offset = readU32(bytes, eocd + 16);
  const entries: ZipEntry[] = [];

  for (let n = 0; n < entryCount; n++) {
    if (readU32(bytes, offset) !== CDIR_SIG) return null;
    const method = readU16(bytes, offset + 10);
    const compressedSize = readU32(bytes, offset + 20);
    const nameLen = readU16(bytes, offset + 28);
    const extraLen = readU16(bytes, offset + 30);
    const commentLen = readU16(bytes, offset + 32);
    const localHeaderOffset = readU32(bytes, offset + 42);
    let name = '';
    for (let i = 0; i < nameLen; i++) name += String.fromCharCode(bytes[offset + 46 + i]);
    entries.push({ name, method, compressedSize, localHeaderOffset });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function extractEntry(bytes: Uint8Array, entry: ZipEntry): string | null {
  const o = entry.localHeaderOffset;
  if (readU32(bytes, o) !== LOCAL_SIG) return null;
  // Local header name/extra lengths can differ from the central copy.
  const nameLen = readU16(bytes, o + 26);
  const extraLen = readU16(bytes, o + 28);
  const dataStart = o + 30 + nameLen + extraLen;
  const data = bytes.slice(dataStart, dataStart + entry.compressedSize);

  try {
    if (entry.method === 0) {
      let s = '';
      for (let i = 0; i < data.length; i++) s += String.fromCharCode(data[i]);
      return decodeUtf8Latin(s);
    }
    if (entry.method === 8) {
      const inflated = pako.inflateRaw(data);
      let s = '';
      for (let i = 0; i < inflated.length; i++) s += String.fromCharCode(inflated[i]);
      return decodeUtf8Latin(s);
    }
  } catch {
    return null;
  }
  return null; // unsupported compression method
}

/** XLSX entries are UTF-8; re-decode the byte-per-char string properly. */
function decodeUtf8Latin(s: string): string {
  try {
    // eslint-disable-next-line no-undef
    return decodeURIComponent(escape(s));
  } catch {
    return s; // already ASCII-safe
  }
}

// ── SpreadsheetML parsing ────────────────────────────────────────────────────

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&amp;/g, '&');
}

function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  const siRe = /<si[\s>]([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = siRe.exec(xml)) !== null) {
    // Concatenate every <t> run (rich text splits one string across runs).
    let text = '';
    const tRe = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
    let t: RegExpExecArray | null;
    while ((t = tRe.exec(m[1])) !== null) text += decodeXmlEntities(t[1]);
    strings.push(text);
  }
  return strings;
}

function colIndex(cellRef: string): number {
  let idx = 0;
  for (const ch of cellRef) {
    if (ch >= 'A' && ch <= 'Z') idx = idx * 26 + (ch.charCodeAt(0) - 64);
    else break;
  }
  return idx - 1;
}

function parseSheetRows(xml: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  const rowRe = /<row[\s>]([\s\S]*?)<\/row>/g;
  let rm: RegExpExecArray | null;

  while ((rm = rowRe.exec(xml)) !== null) {
    const cells: string[] = [];
    const cellRe = /<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm: RegExpExecArray | null;

    while ((cm = cellRe.exec(rm[1])) !== null) {
      const attrs = cm[1];
      const inner = cm[2] ?? '';
      const refMatch = attrs.match(/r="([A-Z]+)\d+"/);
      const col = refMatch ? colIndex(refMatch[1]) : cells.length;
      const type = attrs.match(/t="(\w+)"/)?.[1] ?? 'n';

      let value = '';
      if (type === 'inlineStr') {
        const t = inner.match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/);
        value = t ? decodeXmlEntities(t[1]) : '';
      } else {
        const v = inner.match(/<v>([\s\S]*?)<\/v>/);
        const raw = v ? decodeXmlEntities(v[1]) : '';
        value = type === 's' ? (shared[parseInt(raw, 10)] ?? '') : raw;
      }

      while (cells.length < col) cells.push('');
      cells[col] = value;
    }
    rows.push(cells);
  }
  return rows;
}

// ── CSV bridge ───────────────────────────────────────────────────────────────

function toCsv(rows: string[][]): string {
  return rows
    .map((row) => row.map((cell) => {
      if (/[",\n\r]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
      return cell;
    }).join(','))
    .join('\n');
}

// ── Entry point ──────────────────────────────────────────────────────────────

export interface XlsxParseOutcome {
  ok: boolean;
  /** Populated when ok — same shape the CSV path produces. */
  result: ParseResult | null;
  /** Populated when !ok — a user-facing reason. */
  error: string | null;
}

export function parseXLSXSalesReport(
  bytes: Uint8Array,
  fileSizeBytes: number | null = null,
): XlsxParseOutcome {
  // ZIP magic: PK\x03\x04
  if (!(bytes[0] === 0x50 && bytes[1] === 0x4b)) {
    return {
      ok: false, result: null,
      error: 'This file is not a readable Excel workbook. If it came from an older system as .xls, open it in Excel or Numbers and use File → Save As → CSV.',
    };
  }

  const entries = findEntries(bytes);
  if (!entries) {
    return {
      ok: false, result: null,
      error: 'This Excel file appears damaged or uses an unsupported layout. Re-export it, or export a CSV from your EPOS provider instead.',
    };
  }

  // First worksheet: prefer sheet1, else the lowest-numbered sheet file.
  const sheets = entries
    .filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  if (sheets.length === 0) {
    return {
      ok: false, result: null,
      error: 'No worksheet was found inside this Excel file. Re-export it, or export a CSV from your EPOS provider instead.',
    };
  }

  const sheetXml = extractEntry(bytes, sheets[0]);
  if (!sheetXml) {
    return {
      ok: false, result: null,
      error: 'The worksheet inside this Excel file could not be decompressed. Export a CSV from your EPOS provider instead.',
    };
  }

  const sharedEntry = entries.find((e) => e.name === 'xl/sharedStrings.xml');
  const shared = sharedEntry ? parseSharedStrings(extractEntry(bytes, sharedEntry) ?? '') : [];

  const rows = parseSheetRows(sheetXml, shared);
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim().length > 0));
  if (nonEmpty.length === 0) {
    return {
      ok: false, result: null,
      error: 'The first worksheet in this Excel file is empty. Check the export, or use a CSV export instead.',
    };
  }

  // Hand off to the battle-tested CSV pipeline.
  const result = parseCSVSalesReport(toCsv(nonEmpty), fileSizeBytes);
  return { ok: true, result, error: null };
}
