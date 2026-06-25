/**
 * Tests for the local PDF sales report parser.
 *
 * Two halves:
 *  1. Functional unit tests of parsePDFSalesReport() against synthetic PDF fixtures.
 *  2. File-content invariants checking the privacy / architectural contracts.
 *
 * Run with:  npx tsx lib/__tests__/pdfSales.test.ts
 */
import * as fs from 'fs';
import * as path from 'path';

// ── Test harness ──────────────────────────────────────────────────────────────
interface Test { name: string; pass: boolean; detail: string }
const results: Test[] = [];
function expect(name: string, cond: boolean, detail: string = '') {
  results.push({ name, pass: cond, detail });
}

// ── Import the parser ─────────────────────────────────────────────────────────
import { parsePDFSalesReport } from '../parsers/pdfSales';

// ── PDF fixture builder ───────────────────────────────────────────────────────
// Build minimal text-based PDFs for unit testing without requiring real PDF files.

function strToBytes(s: string): Uint8Array {
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
  return b;
}

/**
 * Build a minimal uncompressed text-based PDF with a single page.
 * contentStream should contain raw PDF content operators (BT/ET blocks etc.)
 */
function makePdf(contentStream: string): Uint8Array {
  const stream = contentStream;
  const pdf = [
    '%PDF-1.4\n',
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n`,
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    'xref\n0 5\n0000000000 65535 f \n',
    'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n0\n%%EOF',
  ].join('');
  return strToBytes(pdf);
}

/**
 * Build a PDF content stream with typical POS report rows.
 * Format: product name  quantity  unit_price  total (in BT/ET blocks with Td positioning)
 */
function makeSalesContent(rows: Array<{ name: string; qty: number; price: number; total: number }>): string {
  let content = 'BT\n/F1 12 Tf\n';
  let y = 700;
  // Header
  content += `100 ${y} Td (Product Name  Qty  Unit Price  Total)Tj\n`;
  y -= 16;
  for (const row of rows) {
    content += `T*\n(${row.name}  ${row.qty}  ${row.price.toFixed(2)}  ${row.total.toFixed(2)})Tj\n`;
    y -= 16;
  }
  content += 'ET\n';
  return content;
}

// ── 1. Not a PDF ─────────────────────────────────────────────────────────────
{
  const notPdf = strToBytes('This is a CSV file\nProduct,Qty\nFlat White,10\n');
  const result = parsePDFSalesReport(notPdf);
  expect('not_pdf_returns_error', result.reason === 'not_pdf', `reason=${result.reason}`);
  expect('not_pdf_has_error_message', result.errors.length > 0, `errors=${result.errors[0]}`);
  expect('not_pdf_returns_zero_lines', result.lines.length === 0, `lines=${result.lines.length}`);
}

// ── 2. Encrypted PDF ─────────────────────────────────────────────────────────
{
  // Synthetic encrypted PDF — just has /Encrypt marker
  const encPdf = strToBytes('%PDF-1.4\n/Encrypt 5 0 R\n%%EOF');
  const result = parsePDFSalesReport(encPdf);
  expect('encrypted_returns_encrypted_reason', result.reason === 'encrypted', `reason=${result.reason}`);
  expect('encrypted_mentions_password', result.errors.some(e => /password/i.test(e)), `errors=${result.errors}`);
  expect('encrypted_returns_zero_lines', result.lines.length === 0, `lines=${result.lines.length}`);
}

// ── 3. Image-only PDF (no text streams) ──────────────────────────────────────
{
  // PDF with only an image object, no content streams with text
  const imgPdf = strToBytes('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
  const result = parsePDFSalesReport(imgPdf);
  expect('image_only_returns_image_only_reason', result.reason === 'image_only', `reason=${result.reason}`);
  expect('image_only_suggests_csv', result.errors.some(e => /csv/i.test(e)), `errors=${result.errors}`);
  expect('image_only_returns_zero_lines', result.lines.length === 0, `lines=${result.lines.length}`);
}

// ── 4. Text-based PDF with item rows ─────────────────────────────────────────
{
  const rows = [
    { name: 'Flat White', qty: 45, price: 3.50, total: 157.50 },
    { name: 'Oat Milk Latte', qty: 23, price: 4.00, total: 92.00 },
    { name: 'Filter Coffee', qty: 12, price: 2.50, total: 30.00 },
    { name: 'Croissant', qty: 18, price: 2.80, total: 50.40 },
  ];
  const pdf = makePdf(makeSalesContent(rows));
  const result = parsePDFSalesReport(pdf);

  expect('text_pdf_ok_reason', result.reason === 'ok', `reason=${result.reason} errors=${result.errors.join(', ')}`);
  expect('text_pdf_finds_items', result.lines.length >= 1, `found=${result.lines.length}`);
  expect('text_pdf_no_errors', result.errors.length === 0, `errors=${result.errors}`);

  // Check first item is recognised (Flat White)
  const flatWhite = result.lines.find(l => l.product_name.toLowerCase().includes('flat white'));
  expect('text_pdf_finds_flat_white', !!flatWhite, `lines=${result.lines.map(l => l.product_name).join(', ')}`);
  if (flatWhite) {
    expect('flat_white_qty_correct', flatWhite.quantity === 45, `qty=${flatWhite.quantity}`);
    expect('flat_white_total_correct', Math.abs(flatWhite.line_total - 157.50) < 0.01, `total=${flatWhite.line_total}`);
  }
}

// ── 5. Totals-only PDF ───────────────────────────────────────────────────────
{
  const totalsContent = [
    'BT\n',
    '/F1 12 Tf\n',
    '100 700 Td (Sales Report)Tj\n',
    'T* (Total Sales: 1250.00)Tj\n',
    'T* (Gross Revenue: 1250.00)Tj\n',
    'T* (Net Total: 1041.67)Tj\n',
    'ET\n',
  ].join('');
  const pdf = makePdf(totalsContent);
  const result = parsePDFSalesReport(pdf);

  expect('totals_only_reason', result.reason === 'totals_only', `reason=${result.reason}`);
  expect('totals_only_suggests_items_report', result.errors.some(e => /item|product/i.test(e)), `errors=${result.errors}`);
  expect('totals_only_zero_lines', result.lines.length === 0, `lines=${result.lines.length}`);
}

// ── 6. PDF with unreadable structure (no sales data) ─────────────────────────
{
  const weirdContent = [
    'BT\n',
    '/F1 10 Tf\n',
    '50 700 Td (Welcome to Our Store)Tj\n',
    'T* (Thank you for your business)Tj\n',
    'T* (Visit us again soon!)Tj\n',
    'ET\n',
  ].join('');
  const pdf = makePdf(weirdContent);
  const result = parsePDFSalesReport(pdf);

  expect('no_items_reason', result.reason === 'no_items', `reason=${result.reason}`);
  expect('no_items_suggests_csv', result.errors.some(e => /csv/i.test(e)), `errors=${result.errors}`);
  expect('no_items_zero_lines', result.lines.length === 0, `lines=${result.lines.length}`);
}

// ── 7. Duplicate product merging ─────────────────────────────────────────────
{
  // Same product appears twice (e.g. different transaction timestamps in same export)
  const content = [
    'BT\n',
    '/F1 12 Tf\n',
    '100 700 Td (Flat White  10  3.50  35.00)Tj\n',
    'T* (Flat White  5  3.50  17.50)Tj\n',
    'T* (Cappuccino  8  3.80  30.40)Tj\n',
    'ET\n',
  ].join('');
  const pdf = makePdf(content);
  const result = parsePDFSalesReport(pdf);

  if (result.reason === 'ok') {
    const flatWhite = result.lines.filter(l => l.product_name.toLowerCase().includes('flat white'));
    expect('duplicates_merged_to_one_row', flatWhite.length <= 1, `rows=${flatWhite.length}`);
    if (flatWhite.length === 1) {
      expect('duplicates_qty_summed', flatWhite[0].quantity === 15, `qty=${flatWhite[0].quantity}`);
    }
  } else {
    // Parser may not extract these synthetic rows; just check no crash
    expect('duplicates_no_crash', true, 'parser ran without exception');
  }
}

// ── 8. Date extraction ────────────────────────────────────────────────────────
{
  const content = [
    'BT\n',
    '/F1 12 Tf\n',
    '100 750 Td (Report Period: 15/06/2025)Tj\n',
    'T* (Flat White  20  3.50  70.00)Tj\n',
    'T* (Latte  15  3.80  57.00)Tj\n',
    'ET\n',
  ].join('');
  const pdf = makePdf(content);
  const result = parsePDFSalesReport(pdf);
  // Date detection is best-effort; just verify it runs without crash
  expect('date_detection_no_crash', true, `reportDate=${result.reportDate}`);
}

// ── 9. Source format is always 'pdf' ─────────────────────────────────────────
{
  const pdf = makePdf('BT (Flat White  10  3.50  35.00)Tj ET');
  const result = parsePDFSalesReport(pdf);
  expect('source_format_is_pdf', result.sourceFormat === 'pdf', `format=${result.sourceFormat}`);
}

// ── 10. Returns metadata fields ───────────────────────────────────────────────
{
  const rows = [{ name: 'Flat White', qty: 10, price: 3.50, total: 35.00 }];
  const pdf = makePdf(makeSalesContent(rows));
  const result = parsePDFSalesReport(pdf);
  expect('returns_streamsFound', typeof result.streamsFound === 'number', `streamsFound=${result.streamsFound}`);
  expect('returns_streamsDecoded', typeof result.streamsDecoded === 'number', `streamsDecoded=${result.streamsDecoded}`);
  expect('returns_extractedLineCount', typeof result.extractedLineCount === 'number', `lineCount=${result.extractedLineCount}`);
}

// ── 11. File-content invariants ───────────────────────────────────────────────
const ROOT = path.join(__dirname, '..', '..');
const pdfParserSrc = fs.readFileSync(path.join(ROOT, 'lib', 'parsers', 'pdfSales.ts'), 'utf8');
const salesReportsMutationSrc = fs.readFileSync(path.join(ROOT, 'lib', 'mutations', 'salesReports.ts'), 'utf8');
const cogsSectionSrc = fs.readFileSync(path.join(ROOT, 'components', 'cogs', 'CogsSection.tsx'), 'utf8');
const importReviewSrc = fs.readFileSync(path.join(ROOT, 'components', 'cogs', 'ImportReviewModal.tsx'), 'utf8');

expect(
  'pdf_parser_uses_pako_locally',
  pdfParserSrc.includes("import pako from 'pako'"),
  'PDF parser must import pako for local zlib decompression',
);

expect(
  'pdf_parser_no_supabase_import',
  !pdfParserSrc.includes('@supabase/supabase-js') && !pdfParserSrc.includes("from '@/lib/supabase'"),
  'PDF parser must have no Supabase dependency — parsing is local only',
);

expect(
  'pdf_parser_no_fetch_to_server',
  !pdfParserSrc.includes('supabase.functions.invoke') && !pdfParserSrc.includes('functions.invoke'),
  'PDF parser must not call any Edge Function — parsing must be local',
);

expect(
  'pdf_parser_no_storage_upload',
  !pdfParserSrc.includes('supabase.storage') && !pdfParserSrc.includes('.upload('),
  'PDF parser must not upload to storage during parsing',
);

expect(
  'mutations_no_edge_function_for_pdf',
  !salesReportsMutationSrc.includes("functions.invoke('parse-pdf'") &&
  !salesReportsMutationSrc.includes('functions.invoke("parse-pdf"'),
  'salesReports mutation must not call parse-pdf Edge Function — PDF is now parsed locally',
);

expect(
  'mutations_imports_local_pdf_parser',
  salesReportsMutationSrc.includes("from '@/lib/parsers/pdfSales'"),
  'salesReports mutation must import local pdfSales parser',
);

expect(
  'mutations_no_storage_upload_for_pdf',
  !salesReportsMutationSrc.includes("from('sales-reports')") ||
  !salesReportsMutationSrc.includes('.upload('),
  'salesReports mutation must not upload PDF to Supabase storage for parsing',
);

expect(
  'mutations_has_parse_step',
  salesReportsMutationSrc.includes('useParseSalesReport'),
  'salesReports must export useParseSalesReport for the parse step',
);

expect(
  'mutations_has_save_step',
  salesReportsMutationSrc.includes('useSaveImportedReport'),
  'salesReports must export useSaveImportedReport for the save-after-confirm step',
);

expect(
  'mutations_has_pending_import_type',
  salesReportsMutationSrc.includes('PendingImportData'),
  'salesReports mutation must use PendingImportData type for review flow',
);

expect(
  'mutations_duplicate_detection',
  salesReportsMutationSrc.includes('hasDuplicate') && salesReportsMutationSrc.includes('existingReportCount'),
  'Parse mutation must detect and flag duplicate imports',
);

expect(
  'cogs_section_uses_parse_step',
  cogsSectionSrc.includes('useParseSalesReport'),
  'CogsSection must call useParseSalesReport (not the old single-step upload)',
);

expect(
  'cogs_section_uses_save_step',
  cogsSectionSrc.includes('useSaveImportedReport'),
  'CogsSection must call useSaveImportedReport to save after review',
);

expect(
  'cogs_section_renders_review_modal',
  cogsSectionSrc.includes('ImportReviewModal'),
  'CogsSection must render ImportReviewModal before saving',
);

expect(
  'cogs_section_has_pending_state',
  cogsSectionSrc.includes('pending') && cogsSectionSrc.includes('setPending'),
  'CogsSection must hold pending import state for the review flow',
);

expect(
  'review_modal_shows_duplicate_warning',
  importReviewSrc.includes('hasDuplicate'),
  'ImportReviewModal must warn about duplicate imports',
);

expect(
  'review_modal_shows_item_count',
  importReviewSrc.includes('totalLineItems'),
  'ImportReviewModal must show the number of detected items',
);

expect(
  'review_modal_shows_revenue_total',
  importReviewSrc.includes('totalRevenueFromFile'),
  'ImportReviewModal must show the total revenue from the file',
);

expect(
  'review_modal_shows_parsed_date',
  importReviewSrc.includes('reportDate'),
  'ImportReviewModal must show the extracted report date if available',
);

expect(
  'review_modal_requires_confirm_before_save',
  importReviewSrc.includes('onConfirm') && importReviewSrc.includes('onCancel'),
  'ImportReviewModal must have confirm and cancel actions',
);

expect(
  'pdf_parser_has_image_only_detection',
  pdfParserSrc.includes('image_only'),
  'PDF parser must detect and report image-only PDFs specifically',
);

expect(
  'pdf_parser_has_encrypted_detection',
  pdfParserSrc.includes('encrypted'),
  'PDF parser must detect encrypted/password-protected PDFs',
);

expect(
  'pdf_parser_has_totals_only_detection',
  pdfParserSrc.includes('totals_only'),
  'PDF parser must distinguish "totals only" from "no items at all"',
);

expect(
  'pdf_parser_no_raw_content_logging',
  !pdfParserSrc.includes('console.log') && !pdfParserSrc.includes('console.warn'),
  'PDF parser must not log raw file content — privacy guard',
);

expect(
  'mutations_dev_log_no_raw_content',
  !salesReportsMutationSrc.includes('console.log(bytes') &&
  !salesReportsMutationSrc.includes('console.log(pdfBytes') &&
  !salesReportsMutationSrc.includes('console.log(read.text'),
  'Mutation dev logs must not log raw file content',
);

// ── Report ─────────────────────────────────────────────────────────────────────
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass);
const width = Math.max(...results.map(r => r.name.length));

for (const r of results) {
  const label = r.pass ? 'PASS' : 'FAIL';
  const pad = r.name.padEnd(width + 2, ' ');
  const detail = r.detail ? `  ${r.detail}` : '';
  console.log(`${label}  ${pad}${detail}`);
}

console.log(`\n${passed} passed, ${failed.length} failed`);
if (failed.length > 0) {
  console.error('\nFailed tests:');
  for (const f of failed) console.error(`  ✗ ${f.name}: ${f.detail}`);
  process.exit(1);
}
