import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { parseCSVSalesReport } from '@/lib/parsers/csvSales';
import { reconcileLines } from '@/lib/parsers/productMatcher';
import type { ProductCatalogItem, SalesReport, ReconciledLine, ReconciliationSummary } from '@/types/cogs';

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

/**
 * Read the picked CSV file as text. Tries strategies in order:
 *  1. expo-file-system readAsStringAsync (most reliable on iOS)
 *  2. fetch(asset.uri) (handles some content:// URIs and dev-server cases)
 *  3. Base64 read + utf-8 decode (fallback for iCloud / sandboxed paths)
 * Returns '' if every strategy yields empty content; the caller surfaces a
 * useful error rather than silently treating that as "file empty".
 */
async function readCsvContent(asset: { uri: string; name: string }): Promise<string> {
  // 1. FileSystem direct read
  try {
    const text = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'utf8' });
    if (text && text.trim().length > 0) return text;
  } catch {
    // fall through
  }
  // 2. fetch the URI
  try {
    const response = await fetch(asset.uri);
    if (response.ok) {
      const text = await response.text();
      if (text && text.trim().length > 0) return text;
    }
  } catch {
    // fall through
  }
  // 3. Base64 read + manual UTF-8 decode (helps with iCloud-hosted picker URIs)
  try {
    const b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
    if (b64 && b64.length > 0) {
      const decoded = decodeBase64Utf8(b64);
      if (decoded && decoded.trim().length > 0) return decoded;
    }
  } catch {
    // give up
  }
  return '';
}

function decodeBase64Utf8(b64: string): string {
  // Decode base64 → bytes → utf-8 string. global.atob exists in Hermes RN.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const atob = (globalThis as any).atob as undefined | ((s: string) => string);
  if (!atob) return '';
  try {
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8').decode(bytes);
    }
    // Fallback: best-effort latin-1 decode
    return binary;
  } catch {
    return '';
  }
}

/**
 * Pick, parse, and reconcile a sales report (CSV or PDF).
 * CSV is parsed fully client-side.
 * PDF is uploaded to Supabase Storage and then parsed via Edge Function.
 */
export function useUploadSalesReport() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      userId,
      catalog,
    }: {
      eventId: string;
      userId: string;
      catalog: ProductCatalogItem[];
    }): Promise<UploadAndReconcileResult> => {

      // 1. Pick file. Some iOS UTIs don't include "csv" in the MIME string, so
      //    we accept a wide list and fall back to filename suffix detection below.
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv', 'text/comma-separated-values', 'application/csv',
          'application/vnd.ms-excel', // iOS occasionally hands CSVs back as this
          'application/pdf', 'text/plain', 'text/tab-separated-values',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        throw new Error('No file selected');
      }

      const asset = result.assets[0];
      const lowerName = asset.name.toLowerCase();
      const isCSV = lowerName.endsWith('.csv') || lowerName.endsWith('.tsv') || lowerName.endsWith('.txt')
        || asset.mimeType?.includes('csv')
        || asset.mimeType === 'text/plain'
        || asset.mimeType === 'text/tab-separated-values';
      const isPDF = lowerName.endsWith('.pdf') || asset.mimeType === 'application/pdf';

      let lines: ReconciledLine[];
      let storagePath: string | null = null;

      if (isCSV) {
        // --- CSV: try multiple read strategies; each produces different
        // failure modes on iOS / Android / dev / TestFlight builds. ---
        const content = await readCsvContent(asset);

        if (!content || content.trim().length === 0) {
          const sizeNote = asset.size ? ` (file size: ${asset.size} bytes)` : '';
          throw new Error(
            `Couldn't read the file "${asset.name}"${sizeNote}.\n` +
            'The file may not have downloaded fully from iCloud, or your EPOS export may have produced an empty file. ' +
            'Try saving the CSV to your Files app first, then upload it from there.',
          );
        }

        let parsed;
        try {
          parsed = parseCSVSalesReport(content, asset.size ?? null);
        } catch (e) {
          const detail = e instanceof Error ? e.message : String(e);
          throw new Error(`Couldn't read this CSV. ${detail}`);
        }
        if (__DEV__ && parsed.diagnostics) {
          // Dev-only — never logs raw line content, only counts and column names.
          // eslint-disable-next-line no-console
          console.log('[CSV import]', {
            file: asset.name,
            size: parsed.diagnostics.fileSizeBytes,
            rawLines: parsed.diagnostics.rawLineCount,
            nonEmpty: parsed.diagnostics.nonEmptyLineCount,
            delimiter: parsed.diagnostics.detectedDelimiter,
            headerRow: parsed.diagnostics.headerRowIndex,
            headers: parsed.diagnostics.detectedHeaders,
            parsed: parsed.diagnostics.parsedRowCount,
            accepted: parsed.diagnostics.acceptedRowCount,
            skipped: parsed.diagnostics.skippedRowCount,
            skipReasons: parsed.diagnostics.skipReasons,
          });
        }
        if (parsed.errors.length > 0 && parsed.lines.length === 0) {
          throw new Error(parsed.errors.join('\n'));
        }

        try {
          lines = reconcileLines(parsed.lines, catalog);
        } catch (e) {
          const detail = e instanceof Error ? e.message : String(e);
          throw new Error(`Couldn't match products. ${detail}`);
        }

      } else if (isPDF) {
        // --- PDF: upload blob to storage, parse via Edge Function ---
        storagePath = `${userId}/${eventId}/${Date.now()}_${asset.name}`;
        const response = await fetch(asset.uri);
        if (!response.ok) throw new Error('Could not read PDF file');
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('sales-reports')
          .upload(storagePath, blob, { contentType: 'application/pdf' });

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        // Call Edge Function to parse the PDF
        const { data: edgeResult, error: edgeError } = await supabase.functions.invoke(
          'parse-pdf',
          { body: { storagePath, eventId } },
        );
        if (edgeError) throw new Error(`PDF parsing failed: ${edgeError.message}`);

        const parsedLines = (edgeResult as { lines: typeof lines }).lines ?? [];
        lines = reconcileLines(parsedLines, catalog);

      } else {
        throw new Error('Unsupported file type. Please upload a CSV or PDF file.');
      }

      // 2. Calculate summary
      const totalRevenue = lines.reduce((s, l) => s + l.line_total, 0);
      const calculatedCogs = lines.reduce((s, l) => s + (l.cogs_calculated ?? 0), 0);
      const matched = lines.filter((l) => l.matched_product !== null).length;

      const summary: ReconciliationSummary = {
        totalLineItems:      lines.length,
        matchedItems:        matched,
        unmatchedItems:      lines.length - matched,
        totalRevenueFromFile: totalRevenue,
        calculatedCogs:      calculatedCogs,
        coveragePercent:     lines.length > 0 ? (matched / lines.length) * 100 : 0,
      };

      // 3. Persist sales_report record
      const { data: reportRow, error: reportError } = await reportsTable()
        .insert({
          event_id:               eventId,
          user_id:                userId,
          file_name:              asset.name,
          file_size:              asset.size ?? null,
          mime_type:              asset.mimeType ?? null,
          storage_path:           storagePath,
          status:                 'parsed',
          total_line_items:       summary.totalLineItems,
          matched_line_items:     summary.matchedItems,
          total_revenue_from_file: summary.totalRevenueFromFile,
          calculated_cogs:        summary.calculatedCogs,
        })
        .select()
        .single();

      if (reportError) throw reportError;
      const report = reportRow as unknown as SalesReport;

      // 4. Persist line items
      if (lines.length > 0) {
        const rows = lines.map((l) => ({
          sales_report_id:      report.id,
          event_id:             eventId,
          product_name:         l.product_name,
          product_catalog_id:   l.matched_product?.id ?? null,
          match_confidence:     l.match_confidence,
          quantity:             l.quantity,
          unit_price:           l.unit_price,
          line_total:           l.line_total,
          unit_cost_snapshot:   l.unit_cost_snapshot,
          cogs_calculated:      l.cogs_calculated,
          is_matched:           l.matched_product !== null,
          is_manually_assigned: false,
        }));

        const { error: itemsError } = await lineItemsTable().insert(rows);
        if (itemsError) throw itemsError;
      }

      return { report, lines, summary };
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

      // Recompute and update the report summary
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

