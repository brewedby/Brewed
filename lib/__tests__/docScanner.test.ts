/**
 * Tests for the financial document scanner.
 *
 * Fixtures are SANITISED reproductions of real provider layouts (Dines,
 * Square, Global Payments, Togather contracts): the structure, labels and
 * calculation relationships are preserved; every name, reference and
 * amount is fabricated. No real document content appears here.
 *
 * Run with:  npx tsx lib/__tests__/docScanner.test.ts
 */
import * as fs from 'fs';
import * as path from 'path';

interface Test { name: string; pass: boolean; detail: string }
const results: Test[] = [];
function expect(name: string, cond: boolean, detail: string = '') {
  results.push({ name, pass: cond, detail });
}

import { completeVat, inferRate, calcVatPosition, roundPence } from '../docscan/vat';
import { reconcilePayout } from '../docscan/reconcile';
import { scanFinancialText, classifyDocument, scrubPII, parseMoney, rejoinSplitAmounts } from '../docscan/parse';
import { extractContractTerms, compareForecastToActual } from '../docscan/contract';
import { decodeTextBytes } from '../docscan/decode';
import { sha256Hex } from '../docscan/hash';
import type { DocLineItem } from '../docscan/model';

// ── 1. VAT engine ─────────────────────────────────────────────────────────────

{
  const inc = completeVat({ amount: 120, treatment: 'inclusive', rate: 0.20 });
  expect('vat_inclusive_20', inc.net === 100 && inc.vat === 20 && inc.gross === 120, JSON.stringify(inc));

  const exc = completeVat({ amount: 100, treatment: 'exclusive', rate: 0.20 });
  expect('vat_exclusive_20', exc.net === 100 && exc.vat === 20 && exc.gross === 120, JSON.stringify(exc));

  const five = completeVat({ amount: 105, treatment: 'inclusive', rate: 0.05 });
  expect('vat_inclusive_5', five.net === 100 && five.vat === 5, JSON.stringify(five));

  const zero = completeVat({ amount: 50, treatment: 'no_vat', rate: 0 });
  expect('vat_zero_rated', zero.net === 50 && zero.vat === 0 && zero.gross === 50, JSON.stringify(zero));

  const exempt = completeVat({ amount: 75, treatment: 'exempt', rate: null });
  expect('vat_exempt', exempt.vat === 0 && exempt.gross === 75, JSON.stringify(exempt));

  const custom = completeVat({ amount: 112.5, treatment: 'inclusive', rate: 0.125 });
  expect('vat_custom_rate', custom.net === 100 && custom.vat === 12.5, JSON.stringify(custom));

  const credit = completeVat({ amount: -120, treatment: 'inclusive', rate: 0.20 });
  expect('vat_negative_credit', credit.net === -100 && credit.vat === -20 && credit.gross === -120, JSON.stringify(credit));

  // Dines invoice relationship: 190.67 net + 38.13 VAT = 20%.
  expect('infer_rate_snaps_to_20', inferRate(190.67, 38.13) === 0.20, String(inferRate(190.67, 38.13)));
  expect('infer_rate_zero', inferRate(100, 0) === 0, '');
  expect('infer_rate_null_on_zero_net', inferRate(0, 5) === null, '');

  expect('round_pence_half_away', roundPence(1.005) === 1.01 && roundPence(-1.005) === -1.01,
    `${roundPence(1.005)} ${roundPence(-1.005)}`);
}

// ── 2. VAT position (reclaimability semantics) ───────────────────────────────
{
  const mkLine = (vat: number, reclaim: DocLineItem['reclaimability']): DocLineItem => ({
    description: 'x', category: 'other', net: 100, vat, gross: 100 + vat,
    vatRate: 0.2, vatTreatment: 'exclusive', reclaimability: reclaim,
    role: 'deducted_at_source', confidence: 'high', sourceText: '',
  });
  const pos = calcVatPosition(200, [
    mkLine(20, 'reclaimable'),
    mkLine(10, 'partially_reclaimable'),
    mkLine(8, 'non_reclaimable'),
    mkLine(6, 'pending_review'),
  ]);
  expect('vat_position_records_all_input', pos.inputVatRecorded === 44, String(pos.inputVatRecorded));
  expect('vat_position_reclaimable_only_marked', pos.inputVatPotentiallyReclaimable === 25,
    `${pos.inputVatPotentiallyReclaimable} (20 full + 10/2 partial)`);
  expect('vat_position_net', pos.netPosition === 175, String(pos.netPosition));
}

// ── 3. Reconciliation ─────────────────────────────────────────────────────────
{
  const mkAmount = (v: number) => ({ value: v, confidence: 'high' as const, sourceText: '' });
  const mkDed = (gross: number): DocLineItem => ({
    description: 'fee', category: 'other', net: gross, vat: null, gross,
    vatRate: null, vatTreatment: 'unknown', reclaimability: 'not_applicable',
    role: 'deducted_at_source', confidence: 'high', sourceText: '',
  });
  const sales = { grossSales: mkAmount(1000), refunds: null, discounts: null, netSales: null, salesVat: null, cashSales: null, cardSales: null };

  const exact = reconcilePayout({ sales, lines: [mkDed(100)], reportedPayout: mkAmount(900) });
  expect('reconcile_exact', exact.status === 'reconciled' && exact.difference === 0, JSON.stringify(exact.status));

  const rounding = reconcilePayout({ sales, lines: [mkDed(100)], reportedPayout: mkAmount(900.40) });
  expect('reconcile_rounding_band', rounding.status === 'rounding_difference', rounding.status);

  const review = reconcilePayout({ sales, lines: [mkDed(100)], reportedPayout: mkAmount(920) });
  expect('reconcile_requires_review', review.status === 'requires_review', review.status);

  const bad = reconcilePayout({ sales, lines: [mkDed(100)], reportedPayout: mkAmount(500) });
  expect('reconcile_does_not_reconcile', bad.status === 'does_not_reconcile', bad.status);

  const missing = reconcilePayout({ sales, lines: [mkDed(100)], reportedPayout: null });
  expect('reconcile_missing_payout', missing.status === 'missing_information', missing.status);

  // Credits (negative lines) ADD BACK to the payout.
  const credit = reconcilePayout({ sales, lines: [mkDed(100), mkDed(-30)], reportedPayout: mkAmount(930) });
  expect('reconcile_credit_adds_back', credit.status === 'reconciled', `${credit.expectedPayout}`);

  // Informational/invoiced-separately lines never affect the payout.
  const info: DocLineItem = { ...mkDed(999), role: 'invoiced_separately' };
  const withInfo = reconcilePayout({ sales, lines: [mkDed(100), info], reportedPayout: mkAmount(900) });
  expect('reconcile_ignores_non_source_deductions', withInfo.status === 'reconciled', withInfo.status);
}

// ── 4. Sanitised Dines deduction statement ───────────────────────────────────
const DINES_CD_FIXTURE = [
  'Dines App Ltd', '1 Example Street', 'Testtown', 'support@dines.co.uk',
  'Sample Trader Ltd', 'Date:', '01 Feb 2026', 'Ref:', 'CD-0000-20260201',
  'DEDUCTIONS', 'For the period of 26 Jan 2026 to 01 Feb 2026',
  'Summary of Deductions',
  'Net Sales', '£1,000.00',
  'VAT', '£200.00',
  'Gross Sales', '£1,200.00',
  'Less cash sales', '-£0.00',
  'Gross Sales excl. Cash', '£1,200.00',
  'Dines processing fees (inc. VAT)', '- £48.00',
  'Payout before deductions and commission', '£1,152.00',
  'Add commission', '£10.00',
  'Payout before deductions', '£1,162.00',
  'Deductions:', 'Organiser Co',
  'Confirmation Fee / Refund (Inc. VAT)', '£120.00',
  'Concession Revenue Share at 30.0% (incl VAT) of net sales', '- £360.00',
  'Subtotal', '- £240.00',
  'Note: contact the organiser for VAT invoices.',
  'Total deductions', '- £240.00',
  'Payout', '£922.00',
];
{
  const doc = scanFinancialText(DINES_CD_FIXTURE);
  expect('dines_cd_classified', doc.kind === 'deduction_statement' && doc.provider === 'Dines',
    `${doc.kind}/${doc.provider}`);
  expect('dines_cd_ref', doc.documentRef === 'CD-0000-20260201', String(doc.documentRef));
  expect('dines_cd_period', doc.periodStart === '2026-01-26' && doc.periodEnd === '2026-02-01',
    `${doc.periodStart}..${doc.periodEnd}`);
  expect('dines_cd_sales', doc.sales.grossSales?.value === 1200 && doc.sales.netSales?.value === 1000
    && doc.sales.salesVat?.value === 200, JSON.stringify(doc.sales.grossSales));
  expect('dines_cd_payout', doc.reportedPayout?.value === 922, String(doc.reportedPayout?.value));

  const fees = doc.lines.find((l) => l.category === 'card_processing');
  expect('dines_cd_fees_inclusive_vat', !!fees && fees.gross === 48 && fees.vat === 8 && fees.net === 40,
    JSON.stringify(fees && { g: fees.gross, v: fees.vat, n: fees.net }));

  const credit = doc.lines.find((l) => /confirmation fee/i.test(l.description));
  expect('dines_cd_credit_negative', !!credit && (credit.gross ?? 0) === -120,
    String(credit?.gross));

  const share = doc.lines.find((l) => /revenue share/i.test(l.description));
  expect('dines_cd_share_positive_out', !!share && share.gross === 360 && share.vat === 60,
    JSON.stringify(share && { g: share.gross, v: share.vat }));

  const commission = doc.lines.find((l) => l.description === 'Commission credit');
  expect('dines_cd_commission_credit', !!commission && commission.gross === -10, String(commission?.gross));

  // Waterfall: 1200 − 48 + 10 + 120 − 360 = 922.
  const rec = reconcilePayout({ sales: doc.sales, lines: doc.lines, reportedPayout: doc.reportedPayout });
  expect('dines_cd_reconciles', rec.status === 'reconciled' && rec.expectedPayout === 922,
    `expected=${rec.expectedPayout} status=${rec.status}`);

  const subtotalCaptured = doc.lines.some((l) => Math.abs((l.gross ?? 0)) === 240);
  expect('dines_cd_subtotal_not_a_line', !subtotalCaptured, 'subtotal amounts must not become deduction lines');
}

// ── 5. Sanitised Dines card statement (AC layout) ────────────────────────────
{
  const doc = scanFinancialText([
    'Dines App Ltd', 'Sample Trader Ltd', 'Ref:', 'AC-0000-20260201',
    'CARD TRANSACTIONS', 'For the period of Mon 26 Jan 2026 to Sun 01 Feb 2026',
    'Card Transactions and Payouts',
    'Transaction Date Card Value excl Service Service & Tips Total Card activity Dines Fees (incl. VAT) Due to Venue',
    '01 Feb 2026 £600.00 £0.00 £600.00 £24.00 £576.00',
    '31 Jan 2026 £400.00 £0.00 £400.00 £16.00 £384.00',
    'Total £1,000.00 £0.00 £1,000.00 £40.00 £960.00',
  ]);
  expect('dines_ac_card_sales', doc.sales.cardSales?.value === 1000, String(doc.sales.cardSales?.value));
  expect('dines_ac_payout', doc.reportedPayout?.value === 960, String(doc.reportedPayout?.value));
  const rec = reconcilePayout({ sales: doc.sales, lines: doc.lines, reportedPayout: doc.reportedPayout });
  expect('dines_ac_reconciles', rec.status === 'reconciled', `${rec.expectedPayout} vs ${rec.reportedPayout}`);
}

// ── 6. Sanitised Square vertical summary ─────────────────────────────────────
const SQUARE_FIXTURE = [
  '"Sales summary - Summary', 'All day (00:00-23:59 United Kingdom Time)"," "',
  '"Product sales","£500.00"', '"Returns","(£10.00)"',
  '"Discounts and comps","(£40.00)"', '"Net sales","£450.00"',
  '"Taxes","£90.00"', '"Gross sales","£540.00"',
  '"Total payments collected","£540.00"', '"Card","£540.00"', '"Cash","£0.00"',
  '"Fees","(£9.50)"', '"Square payment processing fees","(£9.50)"',
  '"Net total","£530.50"',
];
{
  const doc = scanFinancialText(SQUARE_FIXTURE);
  expect('square_classified', doc.provider === 'Square', String(doc.provider));
  expect('square_sales', doc.sales.grossSales?.value === 540 && doc.sales.netSales?.value === 450
    && doc.sales.salesVat?.value === 90, JSON.stringify({ g: doc.sales.grossSales?.value }));
  expect('square_payout', doc.reportedPayout?.value === 530.5, String(doc.reportedPayout?.value));
  const rec = reconcilePayout({ sales: doc.sales, lines: doc.lines, reportedPayout: doc.reportedPayout });
  expect('square_reconciles', rec.status === 'reconciled', `${rec.expectedPayout} vs ${rec.reportedPayout}`);
  expect('square_returns_not_double_counted', doc.sales.refunds?.value === 0,
    'returns already netted by Square must not be deducted again');
}

// ── 7. Sanitised Global Payments daily report ────────────────────────────────
{
  const doc = scanFinancialText([
    'Daily Financial Report', 'EVT26-0000 - Unit 1 - SAMPLE TRADER',
    '(Thu) 18-06-2026', '(Fri) 19-06-2026', 'Total',
    'Revenue before Refunds', '£300.00', '£700.00', '£1,000.00',
    'Total Refunds', '£0.00', '£2.00', '£2.00',
    'Gross Revenue', '£300.00', '£698.00', '£998.00',
    '© 2026 Global Payments Inc. All rights reserved',
  ]);
  expect('gp_classified', doc.provider === 'Global Payments', String(doc.provider));
  expect('gp_gross_is_total_column', doc.sales.grossSales?.value === 998, String(doc.sales.grossSales?.value));
  expect('gp_refunds_not_double_counted', doc.sales.refunds?.value === 0,
    'refunds already inside Gross Revenue must not subtract again');
}

// ── 8. Sanitised fee invoice ─────────────────────────────────────────────────
{
  const doc = scanFinancialText([
    'Dines App Ltd', 'INVOICE', 'Ref:', 'IN-0000-20260201',
    'For the period of 26 Jan 2026 to 01 Feb 2026',
    'Service Charges', 'Date Description Cost excl. VAT VAT Cost incl. VAT',
    '01 Feb 2026 Dines Commission £100.00 £20.00 £120.00',
  ]);
  expect('invoice_classified', doc.kind === 'fee_invoice', doc.kind);
  const line = doc.lines[0];
  expect('invoice_three_amounts', !!line && line.net === 100 && line.vat === 20 && line.gross === 120,
    JSON.stringify(line && { n: line.net, v: line.vat, g: line.gross }));
  expect('invoice_rate_inferred', line?.vatRate === 0.20, String(line?.vatRate));
  expect('invoice_role_separate', line?.role === 'invoiced_separately', line?.role);
}

// ── 9. Sanitised contract (Togather/PandaDoc layout) ─────────────────────────
{
  const doc = scanFinancialText([
    'Book your place at Sample Festival', 'Prepared for:', 'Sample Trader',
    'Created by: A N Organiser', 'Karamu Limited (T/A Togather)',
    'Event live dates:', '18th June 2026 - 21st June 2026',
    'In signing this document, you agree to the fees laid out below',
    'Fee table', 'Sales commission', '25% (incl VAT) of net sales',
    'Deposit', '1 x refundable deposit for your pitch £500.00',
    'Admin Fee', '1 x Admin fee £150.00 + VAT',
    'EPOS terminals', '2 x EPOS terminals for £100.00 + VAT per terminal.',
    'WiFi', '1 x WiFi for your pitch £250.00 (Inc. VAT)',
    'Power', 'Power fee to be collected separately',
    'Cancellation terms apply. Signature required.',
  ]);
  expect('contract_classified', doc.kind === 'contract', doc.kind);
  expect('contract_provider', doc.provider === 'Togather', String(doc.provider));

  const terms = extractContractTerms(doc);
  expect('contract_event_name', terms.eventName === 'Sample Festival', String(terms.eventName));
  expect('contract_commission', terms.commissionPct === 25 && terms.commissionBasis === 'incl_vat',
    `${terms.commissionPct} ${terms.commissionBasis}`);

  const deposit = terms.candidateCosts.find((c) => c.category === 'deposit');
  expect('contract_deposit_refundable', !!deposit && /refundable/.test(deposit.description) && deposit.gross === 500,
    JSON.stringify(deposit && { d: deposit.description.slice(0, 30), g: deposit.gross }));

  const admin = terms.candidateCosts.find((c) => /admin/i.test(c.description));
  expect('contract_admin_fee_exclusive', !!admin && admin.vatTreatment === 'exclusive' && admin.gross === 180,
    JSON.stringify(admin && { g: admin.gross, t: admin.vatTreatment }));

  const wifi = terms.candidateCosts.find((c) => c.category === 'wifi');
  expect('contract_wifi_inclusive', !!wifi && wifi.vatTreatment === 'inclusive' && wifi.net === 208.33,
    JSON.stringify(wifi && { n: wifi.net, t: wifi.vatTreatment }));

  expect('contract_power_warned_not_invented',
    terms.warnings.some((w) => /power/i.test(w)) && !terms.candidateCosts.some((c) => c.category === 'power'),
    'separately-collected power must be a warning, never an invented amount');

  expect('contract_all_costs_outstanding',
    terms.candidateCosts.every((c) => c.role === 'outstanding'),
    'contract costs are planned, not yet deducted');
}

// ── 9b. Contract amounts without thousands separators (regression) ───────────
// AMOUNT_RE used to anchor the integer part to \d{1,3}, so a 4-digit fee
// with no comma ("£1500") was read as £150 — a 10x understatement of a
// planned cost the user could accept on the review screen.
{
  const doc = scanFinancialText([
    'Book your place at Big Event', 'Karamu Limited (T/A Togather)',
    'Fee table',
    'Pitch fee', '1 x pitch fee £1500 (Inc. VAT)',
    'Event fee', '1 x event fee £12000.00 + VAT',
    'Admin fee', '1 x admin fee £1,250.00 + VAT',
  ]);
  const terms = extractContractTerms(doc);
  const pitch = terms.candidateCosts.find((c) => /pitch/i.test(c.description));
  const eventFee = terms.candidateCosts.find((c) => /event fee/i.test(c.description));
  const admin = terms.candidateCosts.find((c) => /admin/i.test(c.description));
  expect('contract_uncommaed_1500_not_150', !!pitch && pitch.gross === 1500,
    JSON.stringify(pitch && { g: pitch.gross }));
  expect('contract_uncommaed_12000_net', !!eventFee && eventFee.net === 12000,
    JSON.stringify(eventFee && { n: eventFee.net }));
  expect('contract_commaed_still_works', !!admin && admin.net === 1250,
    JSON.stringify(admin && { n: admin.net }));
}

// ── 10. Forecast vs actual ───────────────────────────────────────────────────
{
  const variance = compareForecastToActual(
    [{ category: 'wifi', gross: 250 }, { category: 'deposit', gross: 500 }, { category: 'power', gross: 100 }],
    [{ category: 'wifi', gross: 250 }, { category: 'deposit', gross: 650 }, { category: 'terminal_hire', gross: 80 }],
  );
  const wifi = variance.find((v) => v.category === 'wifi');
  const deposit = variance.find((v) => v.category === 'deposit');
  const power = variance.find((v) => v.category === 'power');
  const terminal = variance.find((v) => v.category === 'terminal_hire');
  expect('variance_as_expected', wifi?.status === 'as_expected', wifi?.status);
  expect('variance_over', deposit?.status === 'over' && deposit?.difference === 150, `${deposit?.status} ${deposit?.difference}`);
  expect('variance_missing', power?.status === 'missing', power?.status);
  expect('variance_unplanned', terminal?.status === 'unplanned', terminal?.status);
}

// ── 11. Generic fallback + classification ────────────────────────────────────
{
  const doc = scanFinancialText([
    'Monthly Settlement Statement', 'Trader: Sample',
    'Gross sales £2,000.00', 'Refunds £50.00',
    'Terminal hire fee £30.00', 'Amount transferred £1,920.00',
  ]);
  expect('generic_gross', doc.sales.grossSales?.value === 2000, String(doc.sales.grossSales?.value));
  expect('generic_payout_synonym', doc.reportedPayout?.value === 1920,
    '"Amount transferred" must be recognised as the payout');
  const rec = reconcilePayout({ sales: doc.sales, lines: doc.lines, reportedPayout: doc.reportedPayout });
  expect('generic_reconciles', rec.status === 'reconciled', `${rec.expectedPayout}`);
}

// ── 12. Encoding, PII, hashing, money parsing ────────────────────────────────
{
  // UTF-16LE with BOM (the real Square items format).
  const text = 'Item\tQty\nLatte\t2';
  const bytes = new Uint8Array(2 + text.length * 2);
  bytes[0] = 0xff; bytes[1] = 0xfe;
  for (let i = 0; i < text.length; i++) {
    bytes[2 + i * 2] = text.charCodeAt(i) & 0xff;
    bytes[3 + i * 2] = text.charCodeAt(i) >> 8;
  }
  expect('utf16le_decoded', decodeTextBytes(bytes) === text, JSON.stringify(decodeTextBytes(bytes)));

  const utf8 = new Uint8Array([0xef, 0xbb, 0xbf, 0x41, 0x42]);
  expect('utf8_bom_stripped', decodeTextBytes(utf8) === 'AB', decodeTextBytes(utf8));

  expect('pii_email_scrubbed', scrubPII('customer jane@example.com paid') === 'customer [redacted] paid',
    scrubPII('customer jane@example.com paid'));
  expect('pii_pan_scrubbed', scrubPII('card 4111111111111111 used') === 'card [redacted] used', '');
  expect('pii_amounts_untouched', scrubPII('total £1,234.56') === 'total £1,234.56', '');

  expect('sha256_abc', sha256Hex(new Uint8Array([0x61, 0x62, 0x63]))
    === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', sha256Hex(new Uint8Array([0x61, 0x62, 0x63])));
  expect('sha256_empty', sha256Hex(new Uint8Array([]))
    === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', '');

  expect('money_detached_minus', parseMoney('- £510.08') === -510.08, String(parseMoney('- £510.08')));
  expect('money_parens_negative', parseMoney('(£9.50)') === -9.5, String(parseMoney('(£9.50)')));
  expect('money_thousands', parseMoney('£12,345.67') === 12345.67, '');

  const rejoined = rejoinSplitAmounts(['12', '345.67', 'Payout']);
  expect('split_amount_rejoined', rejoined[0] === '12,345.67' && rejoined[1] === 'Payout', JSON.stringify(rejoined));
}

// ── 13. File-content invariants (privacy + architecture) ────────────────────
{
  const ROOT = path.join(__dirname, '..', '..');
  const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const mutationSrc = read('lib/mutations/financialDocs.ts');
  const sectionSrc = read('components/docscan/FinancialDocsSection.tsx');
  const reviewSrc = read('components/docscan/FinancialDocReviewModal.tsx');
  const eventSrc = read('app/(tabs)/events/[id]/index.tsx');
  const migrationSrc = read('supabase/migration_017_financial_documents.sql');
  const entSrc = read('lib/iap/entitlements.ts');

  expect('docs_never_uploaded',
    !mutationSrc.includes('.upload(') && !mutationSrc.includes('storage'),
    'financial documents must never touch Supabase storage');
  expect('docs_scan_and_discard',
    mutationSrc.includes('source_retained: false'),
    'source files are never retained');
  expect('docs_no_console_logging',
    !mutationSrc.includes('console.'),
    'document content must never be logged, even in dev');
  expect('docs_review_mandatory',
    sectionSrc.includes('FinancialDocReviewModal') && mutationSrc.includes('useSaveFinancialDocument'),
    'parse and save are separate steps with review between');
  expect('review_editable_lines',
    reviewSrc.includes('updateLine') && reviewSrc.includes('removeLine') && reviewSrc.includes('addLine'),
    'review screen must allow editing, removing and adding lines');
  expect('review_confidence_not_colour_only',
    reviewSrc.includes('CONF_ICON') && reviewSrc.includes('CONF_LABEL'),
    'confidence uses icons + labels, not colour alone');
  expect('review_duplicate_choices',
    reviewSrc.includes("'revised'") && reviewSrc.includes("'replacement'") && reviewSrc.includes("'separate'"),
    'duplicates offer revised/replacement/separate options, not a hard block');
  expect('event_screen_renders_section',
    eventSrc.includes('FinancialDocsSection'),
    'event detail must render the financial docs section');
  expect('migration_has_rls',
    (migrationSrc.match(/CREATE POLICY/g) ?? []).length >= 8 && migrationSrc.includes('ENABLE ROW LEVEL SECURITY'),
    'both tables need owner-only RLS on all four operations');
  expect('migration_stores_no_content',
    !migrationSrc.includes('file_content') && !migrationSrc.includes('raw_text'),
    'schema stores structured values + audit fields only');
  expect('doc_scanner_is_pro',
    entSrc.includes("doc_scanner:      'pro'"),
    'doc scanner gated at Pro tier');
  expect('vat_wording_accountant',
    sectionSrc.includes('check with your accountant'),
    'VAT reclaim is presented as potential, deferring to the accountant');
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
