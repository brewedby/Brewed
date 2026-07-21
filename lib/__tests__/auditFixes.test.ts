// Full-codebase audit fixes — regression pins.
//
// Each block corresponds to a verified user-facing bug found by the
// July 2026 audit (finders + adversarial verification + manual
// confirmation). Pure-unit tests exercise the fixed logic directly;
// file-content tests pin the fixes that live in RN components or the
// IAP layer where no runtime harness exists.
//
// Run with: npx tsx lib/__tests__/auditFixes.test.ts

import * as fs from 'fs';
import * as path from 'path';
import { parseCSVSalesReport } from '../parsers/csvSales';
import { parsePDFSalesReport, splitTextBlocks } from '../parsers/pdfSales';
import { rejoinSplitAmounts } from '../docscan/parse';
import { decodeTextBytes } from '../docscan/decode';

interface Test { name: string; pass: boolean; detail: string }
const results: Test[] = [];
function expect(name: string, cond: boolean, detail: string = '') {
  results.push({ name, pass: cond, detail });
}

const ROOT = path.join(__dirname, '..', '..');
const read = (...p: string[]) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

function strToBytes(s: string): Uint8Array {
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
  return b;
}

function makePdf(contentStream: string): Uint8Array {
  const pdf = [
    '%PDF-1.4\n',
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n',
    `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
    'xref\n0 5\n0000000000 65535 f \n',
    'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n0\n%%EOF',
  ].join('');
  return strToBytes(pdf);
}

// ── 1. CSV column binding (substring aliasing) ───────────────────────

{
  // 'Item,Total': the quantity alias 'items sold' used to claim the
  // 'Item' column itself via bidirectional substring match, turning every
  // quantity into parseMoney(product name) = 0.
  const csv = 'Item,Total\nLatte,3.20\nFlat White,7.00\n';
  const r = parseCSVSalesReport(csv);
  const latte = r.lines.find((l) => /latte/i.test(l.product_name));
  expect('csv_two_col_qty_defaults_to_1',
    !!latte && latte.quantity === 1 && latte.line_total === 3.2,
    JSON.stringify(latte));
}

{
  // 'Discount Amount' must not satisfy the 'amount' total alias.
  const csv = 'Item,Qty,Discount Amount,Net Amount\nLatte,2,0.50,6.40\nMocha,1,0.00,3.80\n';
  const r = parseCSVSalesReport(csv);
  const latte = r.lines.find((l) => /latte/i.test(l.product_name));
  expect('csv_total_skips_discount_column',
    !!latte && latte.quantity === 2 && latte.line_total === 6.4,
    JSON.stringify(latte));
}

// ── 2. CSV quoted fields with embedded newlines ──────────────────────

{
  // Legal CSV (and exactly what xlsxSales.toCsv emits for a multi-line
  // Excel cell). The blanket split('\n') tore this into two skipped rows,
  // silently losing the sale.
  const csv = 'Item,Qty,Total\n"Latte\n(Iced Special)",2,7.00\nMocha,1,3.80\n';
  const r = parseCSVSalesReport(csv);
  const iced = r.lines.find((l) => /iced special/i.test(l.product_name));
  expect('csv_quoted_newline_row_survives',
    !!iced && iced.quantity === 2 && iced.line_total === 7,
    JSON.stringify({ names: r.lines.map((l) => l.product_name) }));
  expect('csv_quoted_newline_flattened',
    !!iced && !iced.product_name.includes('\n'),
    'embedded newline becomes a space in the product name');
}

// ── 3. UTF-16LE CSV (Square items export) end-to-end ─────────────────

{
  const text = 'Item,Qty,Net Sales\nLatte,2,6.40\nMocha,1,3.80\n';
  const bytes = new Uint8Array(2 + text.length * 2);
  bytes[0] = 0xff; bytes[1] = 0xfe; // UTF-16LE BOM
  for (let i = 0; i < text.length; i++) {
    bytes[2 + i * 2] = text.charCodeAt(i) & 0xff;
    bytes[3 + i * 2] = text.charCodeAt(i) >> 8;
  }
  const decoded = decodeTextBytes(bytes);
  const r = parseCSVSalesReport(decoded);
  expect('utf16le_csv_decodes_and_parses',
    r.lines.length === 2 && r.lines.some((l) => l.product_name === 'Latte' && l.line_total === 6.4),
    JSON.stringify({ lines: r.lines.length, errors: r.errors.slice(0, 1) }));
}

// ── 3b. CSV regressions from the review pass (must not reappear) ─────

{
  // Bare 'Sales' header must still bind to the total column.
  const r = parseCSVSalesReport('Item,Qty,Sales\nLatte,2,6.40\n');
  const l = r.lines[0];
  expect('csv_bare_sales_is_total', !!l && l.quantity === 2 && l.line_total === 6.4, JSON.stringify(l));
}

{
  // 'Units' header must still bind to quantity.
  const r = parseCSVSalesReport('Item,Units,Total\nLatte,2,6.40\n');
  const l = r.lines[0];
  expect('csv_units_is_qty', !!l && l.quantity === 2 && l.line_total === 6.4, JSON.stringify(l));
}

{
  // 'Sales excl. tax' must not be blocked by a naive 'tax' exclude.
  const r = parseCSVSalesReport('Item,Qty,Sales excl. tax\nLatte,2,6.40\n');
  const l = r.lines[0];
  expect('csv_sales_excl_tax_is_total', !!l && l.line_total === 6.4, JSON.stringify(l));
}

{
  // An unmatched quote (inch-mark) must lose at most its own row, not
  // swallow the rest of the file.
  const r = parseCSVSalesReport('Item,Qty,Total\n6" Sub,2,7.00\nLatte,3,9.60\nMocha,1,3.80\n');
  const latte = r.lines.find((l) => /latte/i.test(l.product_name));
  expect('csv_unmatched_quote_isolated',
    r.lines.length >= 2 && !!latte && latte.quantity === 3 && latte.line_total === 9.6,
    JSON.stringify(r.lines.map((l) => [l.product_name, l.quantity, l.line_total])));
}

{
  // 'Item' must still NOT be mis-read as the quantity column.
  const r = parseCSVSalesReport('Item,Total\nLatte,3.20\nMocha,4.00\n');
  expect('csv_item_not_qty', r.lines.every((l) => l.quantity === 1), JSON.stringify(r.lines.map((l) => l.quantity)));
}

// ── 4. PDF: ET inside a string no longer truncates the block ─────────

{
  const blocks = splitTextBlocks('BT (Latte) Tj 0 -16 Td (NET SALES) Tj 0 -16 Td (Flat White) Tj ET');
  expect('pdf_block_survives_ET_in_string',
    blocks.length === 1 && blocks[0].includes('Flat White'),
    `blocks=${blocks.length}, tail kept=${blocks[0]?.includes('Flat White')}`);
}

{
  // Full pipeline: a SETTLEMENT heading mid-block used to discard every
  // row after it ('ET' inside the word). Rows must survive.
  const content = 'BT\n100 700 Td (SETTLEMENT STATEMENT)Tj\nT* (Flat White  10  3.50  35.00)Tj\nT* (Latte  5  3.80  19.00)Tj\nET\n';
  const r = parsePDFSalesReport(makePdf(content));
  expect('pdf_rows_after_settlement_heading',
    r.lines.length === 2 && r.lines.some((l) => l.product_name === 'Flat White' && l.quantity === 10),
    JSON.stringify({ reason: r.reason, lines: r.lines.map((l) => l.product_name) }));
}

// ── 5. PDF: refund rows netted, not dropped ──────────────────────────

{
  const content = 'BT\n100 700 Td (Flat White  10  3.50  35.00)Tj\nT* (Flat White  -2  3.50  -7.00)Tj\nT* (Latte  5  3.80  19.00)Tj\nET\n';
  const r = parsePDFSalesReport(makePdf(content));
  const fw = r.lines.find((l) => l.product_name === 'Flat White');
  expect('pdf_refund_netted',
    !!fw && fw.quantity === 8 && Math.abs(fw.line_total - 28) < 0.001,
    JSON.stringify(fw));
  expect('pdf_refund_warning_surfaced',
    r.warnings.some((w) => /refund/i.test(w)),
    JSON.stringify(r.warnings));
}

{
  // Fully-refunded product carries no sales to import.
  const content = 'BT\n100 700 Td (Mocha  2  4.00  8.00)Tj\nT* (Mocha  -2  4.00  -8.00)Tj\nT* (Latte  5  3.80  19.00)Tj\nET\n';
  const r = parsePDFSalesReport(makePdf(content));
  expect('pdf_fully_refunded_product_dropped',
    !r.lines.some((l) => l.product_name === 'Mocha') && r.lines.some((l) => l.product_name === 'Latte'),
    JSON.stringify(r.lines.map((l) => l.product_name)));
}

// ── 6. Doc-scan: rejoin no longer glues years/refs onto amounts ──────

{
  const out = rejoinSplitAmounts(['Ref 2026', '510.08', 'Payout']);
  expect('rejoin_year_not_glued',
    out.includes('Ref 2026') && out.includes('510.08'),
    JSON.stringify(out));
}

{
  const out = rejoinSplitAmounts(['Total fees -£12', '345.67']);
  expect('rejoin_currency_prefix_still_glued',
    out[0] === 'Total fees -£12,345.67',
    JSON.stringify(out));
}

// ── 7. Source invariants: IAP purchase flow (expo-iap 2.9.7 contract) ─

const iapSrc = read('lib', 'iap', 'SubscriptionContext.tsx');
const edgeSrc = read('supabase', 'functions', 'validate-apple-receipt', 'index.ts');

expect('iap_platform_keyed_purchase',
  /requestPurchase\(\{ request: \{ ios: \{ sku: productId \} \}, type: 'subs' \}\)/.test(iapSrc),
  'purchase() must use the 2.9.7 platform-keyed request shape');

expect('iap_no_legacy_flat_sku_call',
  !/requestSubscription\(\{ sku/.test(iapSrc),
  'the legacy flat {sku} call throws before StoreKit on 2.9.7');

expect('iap_validates_app_receipt_via_native_module',
  /requireNativeModule\('ExpoIap'\)/.test(iapSrc) && /getVerifiableReceipt\(native\)/.test(iapSrc),
  'app receipt must come from the native module directly (2.9.7 exported getReceiptIOS wrapper is broken)');

expect('iap_no_jws_fallback_to_server',
  !/getVerifiableReceipt\(iap, /.test(iapSrc) && /NO_RECEIPT_MESSAGE/.test(iapSrc),
  'must not send the unverifiable JWS to the server; show a clear message instead');

expect('iap_products_keyed_by_id',
  /prod\.id \?\?/.test(iapSrc) && !/byId\[prod\.productId/.test(iapSrc),
  '2.9.7 products expose `id`; keying by productId left the map empty and prices on fallback forever');

expect('edge_function_rejects_jws_clearly',
  /StoreKit 2/.test(edgeSrc) && /\[A-Za-z0-9_-\]\+/.test(edgeSrc.replace(/\\/g, '')),
  'server guard should explain a JWS instead of surfacing Apple status 21002');

// ── 8. Source invariants: decimal-safe inputs ────────────────────────

const eventFormSrc = read('components', 'events', 'EventForm.tsx');
const numericFieldSrc = read('components', 'shared', 'NumericField.tsx');
const docReviewSrc = read('components', 'docscan', 'FinancialDocReviewModal.tsx');

expect('eventform_no_parsefloat_roundtrip',
  !/onChangeText=\{\(t\) => f(?:ield)?\.onChange\(parseFloat\(t\) \|\| 0\)\}/.test(eventFormSrc),
  'controlled parseFloat round-trips destroyed in-progress decimals (7.5 became 75)');

expect('eventform_uses_numeric_field',
  /NumericField/.test(eventFormSrc),
  'numeric fields go through the decimal-safe NumericField');

expect('numericfield_keeps_text_state',
  /useState\(/.test(numericFieldSrc) && /setText\(/.test(numericFieldSrc),
  'NumericField must keep the typed text as local state');

expect('docreview_gross_input_decimal_safe',
  /function GrossInput/.test(docReviewSrc) && !/value=\{line\.gross === null \? '' : String\(line\.gross\)\}/.test(docReviewSrc),
  'doc-review £ field must not be controlled directly from the parsed number');

expect('docreview_derives_from_typed_gross',
  /completeVat\(\{ amount: patch\.gross \?\? 0/.test(docReviewSrc),
  "editing a '+ VAT' line must derive from the TYPED gross, not the stale net");

// ── 9. Source invariants: form errors are visible ────────────────────

expect('eventform_date_errors_rendered',
  /error=\{errors\.date\?\.message\}/.test(eventFormSrc) && /error=\{errors\.end_date\?\.message\}/.test(eventFormSrc),
  'date validation errors must render at the field');

expect('eventform_invalid_submit_surfaced',
  /handleSubmit\(handleFormSubmit, handleInvalidSubmit\)/.test(eventFormSrc),
  'a failed validation must never be a silent no-op on SAVE');

// ── 10. Source invariants: data-sync honesty ─────────────────────────

const dailyMutSrc = read('lib', 'mutations', 'dailyTakings.ts');
const dailyCardSrc = read('components', 'events', 'DailyTakingsCard.tsx');
const eventsMutSrc = read('lib', 'mutations', 'events.ts');
const salesMutSrc = read('lib', 'mutations', 'salesReports.ts');
const reconSrc = read('components', 'cogs', 'SalesReconciliation.tsx');
const forgotSrc = read('app', '(auth)', 'forgot-password.tsx');

expect('daily_sync_failures_throw',
  /readErr/.test(dailyMutSrc) && /upsertErr/.test(dailyMutSrc) && /onSettled/.test(dailyMutSrc),
  'financials re-aggregation failures must reject the mutation, not vanish in onSuccess');

expect('daily_no_invented_iced_split',
  /Save without split/.test(dailyCardSrc) && /persistDay\(dateStr, dayNumber, total, 0, 0/.test(dailyCardSrc),
  'total-only entry must save an unknown split, never classify the day as all-iced (0% VAT)');

expect('create_event_compensates_on_partial_failure',
  /\.delete\(\)\.eq\('id', event\.id\)/.test(eventsMutSrc),
  'a failed step after the events insert must remove the orphan so retry cannot duplicate');

expect('assign_product_never_zeroes_on_read_failure',
  /if \(readErr\) throw readErr/.test(salesMutSrc),
  'a failed read-back must not write calculated_cogs: 0 over a reconciled report');

expect('sales_import_reads_bytes_first',
  /decodeTextBytes/.test(salesMutSrc) && /bytes\+decode/.test(salesMutSrc),
  'CSV import must decode from raw bytes so UTF-16LE Square exports work');

expect('remove_report_awaits_delete',
  /await deleteReport\.mutateAsync/.test(reconSrc),
  'the report may only disappear from the UI after the delete lands');

expect('forgot_password_distinguishes_rate_limit',
  /isRateLimit/.test(forgotSrc) && !/No account found with that email address/.test(forgotSrc),
  'a rate-limited resend must not tell the user their account does not exist');

// ── Reporter ──────────────────────────────────
let pass = 0, fail = 0;
for (const r of results) {
  const tag = r.pass ? 'PASS' : 'FAIL';
  // eslint-disable-next-line no-console
  console.log(`${tag}  ${r.name.padEnd(48)} ${r.detail}`);
  if (r.pass) pass++; else fail++;
}
// eslint-disable-next-line no-console
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
