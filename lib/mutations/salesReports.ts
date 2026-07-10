import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as LegacyFS from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { parseCSVSalesReport } from '@/lib/parsers/csvSales';
import { parsePDFSalesReport } from '@/lib/parsers/pdfSales';
import { parseXLSXSalesReport } from '@/lib/parsers/xlsxSales';
import { reconcileLines } from '@/lib/parsers/productMatcher';
import { detectProvider, computeImportConfidence } from '@/lib/parsers/providerDetect';
import type {
  ProductCatalogItem, SalesReport, ReconciledLine,
  ReconciliationSummary, PendingImportData,
} from '@/types/cogs';

function reportsTable() {
  return (supabase as unknown as {
    from: (t: string) => ReturnType<typeof supabase.from>;
  }).from('sales_reports');
}

function lineItemsTable() {
  return (supabase as unknown as {
    from: (t: string) => ReturnType<typeof supabase.from>;
  }).from('sales_line_items');
}

export interface UploadAndReconcileResult {
  report: SalesReport;
  lines: ReconciledLine[];
  summary: ReconciliationSummary;
}

type ReadAttempt = { strategy: string; ok: boolean; bytes?: number; reason?: string };

interface ReadResult {
  text: string;
  fileEmptyOnDisk: boolean;
  attempts: ReadAttempt[];
}

/**
 * Read the picked file as text. Uses three strategies to handle iOS/Android quirks.
 * SDK 54: prefers new File class API, falls back to legacy namespace, then fetch.
 */
async function readFileAsText(asset: { uri: string; name: string }): Promise<ReadResult> {
  const attempts: ReadAttempt[] = [];

  try {
    const file = new File(asset.uri);
    if (!file.exists) {
      attempts.push({ strategy: 'File.exists', ok: false, reason: 'file does not exist' });
    } else if (file.size === 0) {
      attempts.push({ strategy: 'File.text', ok: false, bytes: 0, reason: '0 bytes on disk' });
      return { text: '', fileEmptyOnDisk: true, attempts };
    } else {
      const text = await file.text();
      attempts.push({ strategy: 'File.text', ok: text.length > 0, bytes: text.length });
      if (text?.trim().length > 0) return { text, fileEmptyOnDisk: false, attempts };
    }
  } catch (e) {
    attempts.push({ strategy: 'File.text', ok: false, reason: e instanceof Error ? e.message : String(e) });
  }

  try {
    const text = await LegacyFS.readAsStringAsync(asset.uri, { encoding: 'utf8' as 'utf8' });
    attempts.push({ strategy: 'legacy.readAsStringAsync', ok: !!text, bytes: text?.length ?? 0 });
    if (text?.trim().length > 0) return { text, fileEmptyOnDisk: false, attempts };
  } catch (e) {
    attempts.push({ strategy: 'legacy.readAsStringAsync', ok: false, reason: e instanceof Error ? e.message : String(e) });
  }

  try {
    const response = await fetch(asset.uri);
    const text = response.ok ? await response.text() : '';
    attempts.push({ strategy: 'fetch', ok: response.ok && text.length > 0, bytes: text.length });
    if (text?.trim().length > 0) return { text, fileEmptyOnDisk: false, attempts };
  } catch (e) {
    attempts.push({ strategy: 'fetch', ok: false, reason: e instanceof Error ? e.message : String(e) });
  }

  return { text: '', fileEmptyOnDisk: false, attempts };
}

/**
 * Read the picked file as raw bytes (for PDF parsing).
 * Returns null on failure.
 */
async function readFileAsBytes(asset: { uri: string }): Promise<Uint8Array | null> {
  try {
    const response = await fetch(asset.uri);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

/**
 * Parse the picked file and return PendingImportData for user review.
 * Does NOT write anything to the database. The user must confirm first.
 *
 * PDF is parsed locally — no data is sent to any server during this step.
 */
export function useParseSalesReport() {
  return useMutation({
    mutationFn: async ({
      eventId,
      catalog,
      existingReportCount,
    }: {
      eventId: string;
      catalog: ProductCatalogItem[];
      existingReportCount: number;
    }): Promise<PendingImportData> => {

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv', 'text/comma-separated-values', 'application/csv',
          'application/vnd.ms-excel',
          'application/pdf',
          'text/plain', 'text/tab-separated-values',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        throw new Error('No file selected');
      }

      const asset = result.assets[0];
      const lowerName = asset.name.toLowerCase();
      const isPDF = lowerName.endsWith('.pdf') || asset.mimeType === 'application/pdf';
      const isCSV = !isPDF && (
        lowerName.endsWith('.csv') || lowerName.endsWith('.tsv') || lowerName.endsWith('.txt')
        || asset.mimeType?.includes('csv')
        || asset.mimeType === 'text/plain'
        || asset.mimeType === 'text/tab-separated-values'
      );

      // .xlsx workbooks are parsed locally (zip + SpreadsheetML → the CSV
      // pipeline). Legacy binary .xls (BIFF) is not a zip and stays on the
      // Save-As-CSV guidance. Detect by EXTENSION only — iOS mislabels
      // genuine CSVs with the application/vnd.ms-excel MIME type.
      const isXLSX = lowerName.endsWith('.xlsx');
      if (!isXLSX && lowerName.endsWith('.xls')) {
        throw new Error(
          'Older .xls workbooks can\'t be read directly.\n\n' +
          'In Excel or Numbers use File → Save As → CSV (or re-save as ' +
          '.xlsx), or export a CSV from your EPOS provider, then import that instead.',
        );
      }

      if (!isPDF && !isCSV && !isXLSX) {
        throw new Error('Unsupported file type. Please upload a CSV, Excel (.xlsx) or PDF file.');
      }

      let reconciledLines: ReconciledLine[];
      let parseErrors: string[] = [];
      let warnings: string[] = [];
      let reportDate: string | null = null;
      let pdfReason: string | undefined;
      let sourceFormat: 'csv' | 'pdf';
      let provider: string | null = null;
      let skippedRows = 0;

      if (isXLSX) {
        // ── XLSX: unzip + parse locally, then reuse the CSV pipeline ────────
        sourceFormat = 'csv';
        const bytes = await readFileAsBytes(asset);
        if (!bytes) {
          throw new Error(
            `Couldn't read "${asset.name}". ` +
            'Try saving the file to your Files app first and uploading from there.',
          );
        }

        const outcome = parseXLSXSalesReport(bytes, asset.size ?? null);
        if (!outcome.ok || !outcome.result) {
          throw new Error(outcome.error ?? 'Could not read this Excel file.');
        }
        const parsed = outcome.result;

        if (__DEV__ && parsed.diagnostics) {
          // eslint-disable-next-line no-console
          console.log('[XLSX parse]', {
            file: asset.name,
            headers: parsed.diagnostics.detectedHeaders,
            accepted: parsed.diagnostics.acceptedRowCount,
            skipped: parsed.diagnostics.skippedRowCount,
          });
        }

        if (parsed.errors.length > 0 && parsed.lines.length === 0) {
          throw new Error(parsed.errors.join('\n'));
        }

        parseErrors = parsed.errors;
        provider = detectProvider(asset.name, parsed.rawHeaders.join(','));
        skippedRows = parsed.diagnostics?.skippedRowCount ?? 0;
        const xlsxRefunds = parsed.diagnostics?.refundRowCount ?? 0;
        if (xlsxRefunds > 0) {
          warnings.push(
            `${xlsxRefunds} refund/negative row${xlsxRefunds === 1 ? ' was' : 's were'} detected and netted against sales of the same product.`,
          );
        }
        reconciledLines = reconcileLines(parsed.lines, catalog);

      } else if (isPDF) {
        // ── PDF: parse locally (no server call) ──────────────────────────────
        sourceFormat = 'pdf';
        const bytes = await readFileAsBytes(asset);

        if (!bytes) {
          throw new Error(
            `Couldn't read "${asset.name}". ` +
            'Try saving the file to your Files app first and uploading from there.',
          );
        }

        const parsed = parsePDFSalesReport(bytes);

        if (__DEV__) {
          // Dev diagnostic — never logs raw PDF content, only counts and metadata
          // eslint-disable-next-line no-console
          console.log('[PDF parse]', {
            file: asset.name,
            size: asset.size,
            reason: parsed.reason,
            streamsFound: parsed.streamsFound,
            streamsDecoded: parsed.streamsDecoded,
            extractedLineCount: parsed.extractedLineCount,
            itemsFound: parsed.lines.length,
            reportDate: parsed.reportDate,
          });
        }

        if (parsed.errors.length > 0 && parsed.lines.length === 0) {
          throw new Error(parsed.errors.join('\n'));
        }

        parseErrors = parsed.errors;
        warnings = parsed.warnings;
        reportDate = parsed.reportDate;
        pdfReason = parsed.reason;
        provider = parsed.provider ?? detectProvider(asset.name);
        skippedRows = Math.max(0, parsed.extractedLineCount - parsed.lines.length);

        reconciledLines = reconcileLines(parsed.lines, catalog);

      } else {
        // ── CSV: parse locally ───────────────────────────────────────────────
        sourceFormat = 'csv';
        const read = await readFileAsText(asset);

        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[CSV read]', {
            file: asset.name,
            assetSize: asset.size,
            mime: asset.mimeType,
            attempts: read.attempts,
            fileEmptyOnDisk: read.fileEmptyOnDisk,
          });
        }

        if (!read.text || read.text.trim().length === 0) {
          if (read.fileEmptyOnDisk && asset.size && asset.size > 0) {
            throw new Error(
              `"${asset.name}" hasn't fully downloaded from iCloud (Files reports ${asset.size} bytes but the local copy is empty).\n\n` +
              'Open the Files app, tap-and-hold the CSV, choose "Download Now", wait for the cloud icon to disappear, then try again.',
            );
          }
          if (read.fileEmptyOnDisk) {
            throw new Error(`"${asset.name}" is empty (0 bytes). Re-export the report from your EPOS and try again.`);
          }
          const reasons = read.attempts.map((a) => `${a.strategy}: ${a.ok ? 'ok' : a.reason ?? 'failed'}`).join(' | ');
          throw new Error(
            `Couldn't read "${asset.name}"${asset.size ? ` (${asset.size} bytes)` : ''}. ` +
            'Try saving the file to your Files app first and uploading from there.' +
            (__DEV__ ? `\n\nDiagnostics: ${reasons}` : ''),
          );
        }

        let parsed;
        try {
          parsed = parseCSVSalesReport(read.text, asset.size ?? null);
        } catch (e) {
          throw new Error(`Couldn't read this CSV. ${e instanceof Error ? e.message : String(e)}`);
        }

        if (__DEV__ && parsed.diagnostics) {
          // eslint-disable-next-line no-console
          console.log('[CSV parse]', {
            file: asset.name,
            delimiter: parsed.diagnostics.detectedDelimiter,
            headers: parsed.diagnostics.detectedHeaders,
            accepted: parsed.diagnostics.acceptedRowCount,
          });
        }

        if (parsed.errors.length > 0 && parsed.lines.length === 0) {
          throw new Error(parsed.errors.join('\n'));
        }

        parseErrors = parsed.errors;
        provider = detectProvider(asset.name, read.text.slice(0, 2000));
        skippedRows = parsed.diagnostics?.skippedRowCount ?? 0;
        const refunds = parsed.diagnostics?.refundRowCount ?? 0;
        if (refunds > 0) {
          warnings.push(
            `${refunds} refund/negative row${refunds === 1 ? ' was' : 's were'} detected and netted against sales of the same product.`,
          );
        }
        reconciledLines = reconcileLines(parsed.lines, catalog);
      }

      const totalRevenue = reconciledLines.reduce((s, l) => s + l.line_total, 0);
      const calculatedCogs = reconciledLines.reduce((s, l) => s + (l.cogs_calculated ?? 0), 0);
      const matched = reconciledLines.filter((l) => l.matched_product !== null).length;

      const summary: ReconciliationSummary = {
        totalLineItems:       reconciledLines.length,
        matchedItems:         matched,
        unmatchedItems:       reconciledLines.length - matched,
        totalRevenueFromFile: totalRevenue,
        calculatedCogs,
        coveragePercent:      reconciledLines.length > 0 ? (matched / reconciledLines.length) * 100 : 0,
      };

      return {
        fileName: asset.name,
        fileSize: asset.size ?? null,
        mimeType: asset.mimeType ?? null,
        sourceFormat,
        lines: reconciledLines,
        summary,
        parseErrors,
        warnings,
        reportDate,
        pdfReason,
        hasDuplicate: existingReportCount > 0,
        provider,
        confidence: computeImportConfidence({
          acceptedRows: reconciledLines.length,
          skippedRows,
          coveragePercent: summary.coveragePercent,
          sourceFormat,
        }),
      };
    },
  });
}

/**
 * Save a confirmed PendingImportData to the database.
 * Called only after the user reviews and confirms in the review modal.
 */
export function useSaveImportedReport() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pending,
      eventId,
      userId,
    }: {
      pending: PendingImportData;
      eventId: string;
      userId: string;
    }): Promise<UploadAndReconcileResult> => {

      const { data: reportRow, error: reportError } = await reportsTable()
        .insert({
          event_id:                eventId,
          user_id:                 userId,
          file_name:               pending.fileName,
          file_size:               pending.fileSize,
          mime_type:               pending.mimeType,
          storage_path:            null,
          status:                  'parsed',
          total_line_items:        pending.summary.totalLineItems,
          matched_line_items:      pending.summary.matchedItems,
          total_revenue_from_file: pending.summary.totalRevenueFromFile,
          calculated_cogs:         pending.summary.calculatedCogs,
        })
        .select()
        .single();

      if (reportError) throw reportError;
      const report = reportRow as unknown as SalesReport;

      if (pending.lines.length > 0) {
        const rows = pending.lines.map((l) => ({
          sales_report_id:    report.id,
          event_id:           eventId,
          product_name:       l.product_name,
          product_catalog_id: l.matched_product?.id ?? null,
          match_confidence:   l.match_confidence,
          quantity:           l.quantity,
          unit_price:         l.unit_price,
          line_total:         l.line_total,
          unit_cost_snapshot: l.unit_cost_snapshot,
          cogs_calculated:    l.cogs_calculated,
          is_matched:         l.matched_product !== null,
          is_manually_assigned: false,
        }));

        const { error: itemsError } = await lineItemsTable().insert(rows);
        if (itemsError) throw itemsError;
      }

      return { report, lines: pending.lines, summary: pending.summary };
    },

    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: ['sales_reports', eventId] });
    },
  });
}

/**
 * Manually assign a catalog product to an unmatched line item.
 */
export function useAssignProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      lineItemId,
      product,
      quantity,
      reportId,
    }: {
      lineItemId: string;
      product: ProductCatalogItem;
      quantity: number;
      reportId: string;
    }) => {
      const cogs = Math.round(quantity * product.unit_cost * 100) / 100;
      const { error } = await lineItemsTable()
        .update({
          product_catalog_id:   product.id,
          unit_cost_snapshot:   product.unit_cost,
          cogs_calculated:      cogs,
          is_matched:           true,
          is_manually_assigned: true,
          match_confidence:     1.0,
        })
        .eq('id', lineItemId);
      if (error) throw error;

      const { data: allItems } = await lineItemsTable()
        .select('cogs_calculated, is_matched')
        .eq('sales_report_id', reportId);

      const items = (allItems ?? []) as { cogs_calculated: number | null; is_matched: boolean }[];
      const newCogs    = items.reduce((s, i) => s + (i.cogs_calculated ?? 0), 0);
      const newMatched = items.filter((i) => i.is_matched).length;

      await reportsTable()
        .update({ calculated_cogs: newCogs, matched_line_items: newMatched })
        .eq('id', reportId);
    },
    onSuccess: (_data, { reportId }) => {
      qc.invalidateQueries({ queryKey: ['sales_line_items', reportId] });
      qc.invalidateQueries({ queryKey: ['sales_reports'] });
    },
  });
}

/**
 * Apply calculated COGS from a report back into event_financials.cost_of_goods.
 */
export function useApplyCogs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId,
      calculatedCogs,
    }: {
      eventId: string;
      calculatedCogs: number;
    }) => {
      const { error } = await supabase
        .from('event_financials')
        .update({ cost_of_goods: calculatedCogs })
        .eq('event_id', eventId);
      if (error) throw error;
    },
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: ['events', eventId] });
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteSalesReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reportId, eventId }: { reportId: string; eventId: string }) => {
      const { error } = await reportsTable().delete().eq('id', reportId);
      if (error) throw error;
      return eventId;
    },
    onSuccess: (eventId) => {
      qc.invalidateQueries({ queryKey: ['sales_reports', eventId] });
    },
  });
}
