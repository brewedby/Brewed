/**
 * Financial-document import flow: pick → parse ON-DEVICE → review → save.
 *
 * Privacy contract (matches the in-app privacy summary):
 *  - the file is read locally and NEVER uploaded anywhere
 *  - only user-confirmed structured values are persisted
 *  - the picker's cache copy is the only temporary artefact and lives in
 *    the app sandbox; source_retained stays false (scan-and-discard)
 *  - nothing from the document is logged, in dev or production
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/lib/supabase';
import { extractPdfText } from '@/lib/parsers/pdfText';
import { scanFinancialText } from '@/lib/docscan/parse';
import { extractContractTerms, type ContractTerms } from '@/lib/docscan/contract';
import { reconcilePayout, type Reconciliation } from '@/lib/docscan/reconcile';
import { sha256Hex } from '@/lib/docscan/hash';
import { decodeTextBytes } from '@/lib/docscan/decode';
import type { DocLineItem, ScannedFinancialDocument } from '@/lib/docscan/model';
import { findLikelyDuplicates, type FinancialDocumentRow } from '@/lib/queries/financialDocs';

function docsTable() {
  return (supabase as unknown as {
    from: (t: string) => ReturnType<typeof supabase.from>;
  }).from('financial_documents');
}
function linesTable() {
  return (supabase as unknown as {
    from: (t: string) => ReturnType<typeof supabase.from>;
  }).from('financial_line_items');
}


export interface PendingFinancialImport {
  scan: ScannedFinancialDocument;
  contractTerms: ContractTerms | null;
  reconciliation: Reconciliation;
  fileName: string;
  fileSize: number | null;
  fileHash: string;
  duplicates: FinancialDocumentRow[];
}

export function useParseFinancialDocument() {
  return useMutation({
    mutationFn: async (): Promise<PendingFinancialImport> => {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/csv', 'text/comma-separated-values', 'application/csv', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) throw new Error('No file selected');
      const asset = result.assets[0];

      const response = await fetch(asset.uri);
      if (!response.ok) {
        throw new Error(`Couldn't read "${asset.name}". Try saving it to the Files app first and importing from there.`);
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      const fileHash = sha256Hex(bytes);

      const lower = asset.name.toLowerCase();
      const isPDF = lower.endsWith('.pdf') || asset.mimeType === 'application/pdf'
        || (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46);

      let textLines: string[];
      if (isPDF) {
        const extracted = extractPdfText(bytes);
        if (extracted.reason === 'encrypted') {
          throw new Error('This PDF is password-protected and cannot be read. Remove the password and try again, or enter the figures manually.');
        }
        if (extracted.reason === 'image_only') {
          throw new Error(
            'This document appears to be a scan or photo — there is no readable text in it. ' +
            'On-device text recognition for scanned documents isn\'t available yet. ' +
            'Ask the provider for a text-based PDF or CSV, or enter the figures manually.',
          );
        }
        if (extracted.reason === 'not_pdf' || extracted.lines.length === 0) {
          throw new Error('No readable text was found in this file. Ask the provider for a text-based PDF or CSV export.');
        }
        textLines = extracted.lines;
      } else {
        const text = decodeTextBytes(bytes);
        if (!text.trim()) throw new Error(`"${asset.name}" is empty. Re-export it and try again.`);
        textLines = text.split(/\r\n|\r|\n/);
      }

      const scan = scanFinancialText(textLines);
      const contractTerms = scan.kind === 'contract' ? extractContractTerms(scan) : null;
      const reconciliation = reconcilePayout({
        sales: scan.sales,
        lines: scan.lines,
        reportedPayout: scan.reportedPayout,
      });

      let duplicates: FinancialDocumentRow[] = [];
      try {
        duplicates = await findLikelyDuplicates({
          fileHash,
          provider: scan.provider,
          periodStart: scan.periodStart,
          reportedPayout: scan.reportedPayout?.value ?? null,
        });
      } catch {
        // Offline — duplicate check degrades silently; save still warns on
        // conflict via the hash column.
      }

      return {
        scan,
        contractTerms,
        reconciliation,
        fileName: asset.name,
        fileSize: asset.size ?? null,
        fileHash,
        duplicates,
      };
    },
  });
}

export interface ConfirmedImport {
  pending: PendingFinancialImport;
  /** Post-review line items (user-edited). */
  lines: DocLineItem[];
  /** Post-review header values. */
  reportedPayout: number | null;
  eventId: string | null;
  userId: string;
  userEdited: boolean;
  revisionKind: string | null;          // duplicate | replacement | revised | separate | null
  replacesDocumentId: string | null;
  isForecast: boolean;                  // true when saving contract terms as planned costs
}

export function useSaveFinancialDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ConfirmedImport) => {
      const { pending, lines, eventId, userId } = input;
      const s = pending.scan.sales;

      // Recompute reconciliation against the FINAL reviewed values.
      const reconciliation = reconcilePayout({
        sales: pending.scan.sales,
        lines,
        reportedPayout: input.reportedPayout !== null
          ? { value: input.reportedPayout, confidence: 'high', sourceText: 'user-confirmed' }
          : null,
      });

      const { data: docRow, error: docError } = await docsTable()
        .insert({
          user_id: userId,
          event_id: eventId,
          kind: pending.scan.kind,
          provider: pending.scan.provider,
          document_ref: pending.scan.documentRef,
          period_start: pending.scan.periodStart,
          period_end: pending.scan.periodEnd,
          gross_sales: s.grossSales?.value ?? null,
          refunds: s.refunds?.value ?? null,
          discounts: s.discounts?.value ?? null,
          net_sales: s.netSales?.value ?? null,
          sales_vat: s.salesVat?.value ?? null,
          cash_sales: s.cashSales?.value ?? null,
          card_sales: s.cardSales?.value ?? null,
          reported_payout: input.reportedPayout,
          expected_payout: reconciliation.expectedPayout,
          reconciliation_status: reconciliation.status,
          reconciliation_note: reconciliation.explanation,
          file_name: pending.fileName,
          file_hash: pending.fileHash,
          file_size: pending.fileSize,
          source_retained: false, // scan-and-discard — files are never stored
          confirmed_at: new Date().toISOString(),
          user_edited: input.userEdited,
          replaces_document_id: input.replacesDocumentId,
          revision_kind: input.revisionKind,
        })
        .select()
        .single();
      if (docError) throw docError;
      const doc = docRow as unknown as FinancialDocumentRow;

      if (lines.length > 0) {
        const rows = lines.map((l) => ({
          document_id: doc.id,
          user_id: userId,
          event_id: eventId,
          description: l.description,
          category: l.category,
          net: l.net,
          vat: l.vat,
          gross: l.gross,
          vat_rate: l.vatRate,
          vat_treatment: l.vatTreatment,
          reclaimability: l.reclaimability,
          settlement_role: l.role,
          is_forecast: input.isForecast,
          provider: pending.scan.provider,
          source_text: l.sourceText,
        }));
        const { error: linesError } = await linesTable().insert(rows);
        if (linesError) throw linesError;
      }

      return doc;
    },
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: ['financial_documents', eventId] });
      qc.invalidateQueries({ queryKey: ['financial_line_items', eventId] });
    },
  });
}

export function useDeleteFinancialDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentId }: { documentId: string; eventId: string | null }) => {
      // Line items cascade at the database level.
      const { error } = await docsTable().delete().eq('id', documentId);
      if (error) throw error;
    },
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: ['financial_documents', eventId] });
      qc.invalidateQueries({ queryKey: ['financial_line_items', eventId] });
    },
  });
}
