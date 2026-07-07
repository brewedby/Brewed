/**
 * Tests for the extended import formats: LZW/ASCIIHex PDF streams and
 * local XLSX workbooks.
 *
 * Run with:  npx tsx lib/__tests__/importFormats.test.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import pako from 'pako';

interface Test { name: string; pass: boolean; detail: string }
const results: Test[] = [];
function expect(name: string, cond: boolean, detail: string = '') {
  results.push({ name, pass: cond, detail });
}

import { parsePDFSalesReport } from '../parsers/pdfSales';
import { parseXLSXSalesReport } from '../parsers/xlsxSales';

function strToBytes(s: string): Uint8Array {
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
  return b;
}

// ── 1. ASCIIHexDecode PDF stream ─────────────────────────────────────────────
{
  const content = 'BT (Flat White  12  3.50  42.00)Tj T* (Espresso  8  2.60  20.80)Tj ET';
  const hex = Array.from(content).map((c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('') + '>';
  const pdf = [
    '%PDF-1.4\n',
    `4 0 obj\n<< /Length ${hex.length} /Filter /ASCIIHexDecode >>\nstream\n${hex}\nendstream\nendobj\n`,
    '%%EOF',
  ].join('');
  const result = parsePDFSalesReport(strToBytes(pdf));
  expect('asciihex_stream_decoded', result.reason === 'ok', `reason=${result.reason} errors=${result.errors.join(' | ')}`);
  const fw = result.lines.find((l) => l.product_name.toLowerCase().includes('flat white'));
  expect('asciihex_items_extracted', !!fw && fw.quantity === 12, `qty=${fw?.quantity}`);
}

// ── 2. LZWDecode PDF stream ──────────────────────────────────────────────────
// Encode with a matching PDF-spec LZW encoder (9→12 bit codes, MSB-first,
// EarlyChange=1) so the test proves round-trip correctness.
function lzwEncode(input: string): Uint8Array {
  const CLEAR = 256, EOD = 257;
  const dict = new Map<string, number>();
  const resetDict = () => {
    dict.clear();
    for (let i = 0; i < 256; i++) dict.set(String.fromCharCode(i), i);
  };
  resetDict();
  let nextCode = 258;
  let codeWidth = 9;
  const out: number[] = [];
  let bitBuf = 0, bitCount = 0;
  const emit = (code: number) => {
    bitBuf = (bitBuf << codeWidth) | code;
    bitCount += codeWidth;
    while (bitCount >= 8) {
      bitCount -= 8;
      out.push((bitBuf >> bitCount) & 0xff);
    }
  };

  emit(CLEAR);
  let w = '';
  for (const ch of input) {
    const wc = w + ch;
    if (dict.has(wc)) { w = wc; continue; }
    emit(dict.get(w)!);
    dict.set(wc, nextCode++);
    // EarlyChange=1: encoder widens when the NEXT code wouldn't fit.
    if (nextCode + 1 > (1 << codeWidth) && codeWidth < 12) codeWidth++;
    w = ch;
  }
  if (w) emit(dict.get(w)!);
  emit(EOD);
  if (bitCount > 0) out.push((bitBuf << (8 - bitCount)) & 0xff);
  return new Uint8Array(out);
}
{
  const content = 'BT (Oat Latte  15  4.10  61.50)Tj T* (Mocha  6  3.90  23.40)Tj ET';
  const enc = lzwEncode(content);
  let encStr = '';
  for (let i = 0; i < enc.length; i++) encStr += String.fromCharCode(enc[i]);
  const pdf = [
    '%PDF-1.4\n',
    `4 0 obj\n<< /Length ${encStr.length} /Filter /LZWDecode >>\nstream\n${encStr}\nendstream\nendobj\n`,
    '%%EOF',
  ].join('');
  const result = parsePDFSalesReport(strToBytes(pdf));
  expect('lzw_stream_decoded', result.reason === 'ok', `reason=${result.reason} errors=${result.errors.join(' | ')}`);
  const latte = result.lines.find((l) => l.product_name.toLowerCase().includes('oat latte'));
  expect('lzw_items_extracted', !!latte && latte.quantity === 15, `qty=${latte?.quantity}`);
}

// ── 3. Unsupported-format message wording ────────────────────────────────────
{
  const pdfSrc = fs.readFileSync(path.join(__dirname, '..', 'parsers', 'pdfSales.ts'), 'utf8');
  expect('decode_failed_uses_requested_wording',
    pdfSrc.includes('cannot be read on-device yet') && pdfSrc.includes('Export a CSV from your EPOS provider where possible'),
    'decode-failed message must use the launch-spec wording');
}

// ── 4. XLSX — minimal zip builders ───────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function u16(v: number): number[] { return [v & 0xff, (v >> 8) & 0xff]; }
function u32(v: number): number[] { return [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff]; }

function buildZip(files: { name: string; content: string; deflate?: boolean }[]): Uint8Array {
  const chunks: number[] = [];
  const central: number[] = [];
  const encoder = (s: string) => Array.from(s).map((c) => c.charCodeAt(0) & 0xff);

  for (const f of files) {
    const raw = new Uint8Array(encoder(f.content));
    const data = f.deflate ? pako.deflateRaw(raw) : raw;
    const method = f.deflate ? 8 : 0;
    const crc = crc32(raw);
    const nameBytes = encoder(f.name);
    const offset = chunks.length;

    chunks.push(...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(method), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(raw.length), ...u16(nameBytes.length), ...u16(0),
      ...nameBytes, ...Array.from(data));

    central.push(...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(method), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(raw.length), ...u16(nameBytes.length), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...nameBytes);
  }

  const cdStart = chunks.length;
  chunks.push(...central);
  chunks.push(...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
    ...u32(central.length), ...u32(cdStart), ...u16(0));
  return new Uint8Array(chunks);
}

const SHEET_XML = `<?xml version="1.0"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>
<row r="2"><c r="A2" t="s"><v>3</v></c><c r="B2"><v>14</v></c><c r="C2"><v>49.00</v></c></row>
<row r="3"><c r="A3" t="inlineStr"><is><t>Iced Latte</t></is></c><c r="B3"><v>9</v></c><c r="C3"><v>38.25</v></c></row>
</sheetData></worksheet>`;

const SHARED_XML = `<?xml version="1.0"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="4" uniqueCount="4">
<si><t>Item</t></si><si><t>Qty</t></si><si><t>Net Sales</t></si><si><t>Flat White</t></si></sst>`;

// ── 5. XLSX with stored (uncompressed) entries ───────────────────────────────
{
  const zip = buildZip([
    { name: 'xl/worksheets/sheet1.xml', content: SHEET_XML },
    { name: 'xl/sharedStrings.xml', content: SHARED_XML },
  ]);
  const outcome = parseXLSXSalesReport(zip);
  expect('xlsx_stored_ok', outcome.ok, outcome.error ?? '');
  const lines = outcome.result?.lines ?? [];
  const fw = lines.find((l) => l.product_name === 'Flat White');
  const iced = lines.find((l) => l.product_name === 'Iced Latte');
  expect('xlsx_shared_string_product', !!fw && fw.quantity === 14 && Math.abs(fw.line_total - 49) < 0.001,
    `qty=${fw?.quantity} total=${fw?.line_total}`);
  expect('xlsx_inline_string_product', !!iced && iced.quantity === 9,
    `qty=${iced?.quantity}`);
}

// ── 6. XLSX with deflated entries (the real-world case) ─────────────────────
{
  const zip = buildZip([
    { name: 'xl/worksheets/sheet1.xml', content: SHEET_XML, deflate: true },
    { name: 'xl/sharedStrings.xml', content: SHARED_XML, deflate: true },
  ]);
  const outcome = parseXLSXSalesReport(zip);
  expect('xlsx_deflated_ok', outcome.ok, outcome.error ?? '');
  expect('xlsx_deflated_rows', (outcome.result?.lines.length ?? 0) === 2,
    `lines=${outcome.result?.lines.length}`);
}

// ── 7. XLSX failure modes ────────────────────────────────────────────────────
{
  const notZip = parseXLSXSalesReport(strToBytes('This is not a zip file at all'));
  expect('xlsx_non_zip_rejected', !notZip.ok && /not a readable Excel/i.test(notZip.error ?? ''), notZip.error ?? '');

  const noSheet = parseXLSXSalesReport(buildZip([{ name: 'xl/sharedStrings.xml', content: SHARED_XML }]));
  expect('xlsx_missing_sheet_clear_error', !noSheet.ok && /worksheet/i.test(noSheet.error ?? ''), noSheet.error ?? '');

  const emptySheet = parseXLSXSalesReport(buildZip([
    { name: 'xl/worksheets/sheet1.xml', content: '<worksheet><sheetData></sheetData></worksheet>' },
  ]));
  expect('xlsx_empty_sheet_clear_error', !emptySheet.ok && /empty/i.test(emptySheet.error ?? ''), emptySheet.error ?? '');
}

// ── 8. File-content invariants ────────────────────────────────────────────────
{
  const ROOT = path.join(__dirname, '..', '..');
  const mutationSrc = fs.readFileSync(path.join(ROOT, 'lib', 'mutations', 'salesReports.ts'), 'utf8');
  const xlsxSrc = fs.readFileSync(path.join(ROOT, 'lib', 'parsers', 'xlsxSales.ts'), 'utf8');

  expect('mutation_parses_xlsx_locally',
    mutationSrc.includes('parseXLSXSalesReport'),
    'parse mutation must route .xlsx through the local reader');

  expect('legacy_xls_still_guided_to_csv',
    mutationSrc.includes(".xls workbooks can") || mutationSrc.includes('Older .xls'),
    'binary .xls keeps the Save-As-CSV guidance');

  expect('xlsx_parser_no_network',
    !xlsxSrc.includes('supabase') && !xlsxSrc.includes('fetch('),
    'XLSX parsing must be fully local');

  expect('xlsx_reuses_csv_pipeline',
    xlsxSrc.includes('parseCSVSalesReport'),
    'XLSX must feed the CSV pipeline so aliases/refunds/diagnostics stay identical');

  expect('pdf_supports_lzw_filter',
    fs.readFileSync(path.join(ROOT, 'lib', 'parsers', 'pdfSales.ts'), 'utf8').includes("filter === 'LZWDecode'"),
    'PDF parser must decode LZWDecode streams');
}

// ── Report ────────────────────────────────────────────────────────────────────
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass);
const width = Math.max(...results.map(r => r.name.length));
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name.padEnd(width + 2)}${r.detail ? ' ' + r.detail : ''}`);
}
console.log(`\n${passed} passed, ${failed.length} failed`);
if (failed.length > 0) process.exit(1);
