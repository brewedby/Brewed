import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Typed rows for the migration_017 tables. Kept standalone (like
// types/cogs.ts) so the file works before types/database.ts is
// regenerated.
export interface FinancialDocumentRow {
  id: string;
  user_id: string;
  event_id: string | null;
  kind: string;
  provider: string | null;
  document_ref: string | null;
  period_start: string | null;
  period_end: string | null;
  gross_sales: number | null;
  refunds: number | null;
  discounts: number | null;
  net_sales: number | null;
  sales_vat: number | null;
  cash_sales: number | null;
  card_sales: number | null;
  reported_payout: number | null;
  expected_payout: number | null;
  reconciliation_status: string;
  reconciliation_note: string | null;
  file_name: string | null;
  file_hash: string | null;
  file_size: number | null;
  source_retained: boolean;
  imported_at: string;
  confirmed_at: string | null;
  user_edited: boolean;
  replaces_document_id: string | null;
  revision_kind: string | null;
}

export interface FinancialLineItemRow {
  id: string;
  document_id: string;
  user_id: string;
  event_id: string | null;
  description: string;
  category: string;
  net: number | null;
  vat: number | null;
  gross: number | null;
  vat_rate: number | null;
  vat_treatment: string;
  reclaimability: string;
  settlement_role: string;
  is_forecast: boolean;
  provider: string | null;
  notes: string | null;
  source_text: string | null;
}

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

export function useFinancialDocuments(eventId: string | null) {
  return useQuery({
    queryKey: ['financial_documents', eventId],
    queryFn: async (): Promise<FinancialDocumentRow[]> => {
      let q = docsTable().select('*').order('imported_at', { ascending: false });
      q = eventId ? q.eq('event_id', eventId) : q.is('event_id', null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as FinancialDocumentRow[];
    },
  });
}

export function useFinancialLineItems(eventId: string | null) {
  return useQuery({
    queryKey: ['financial_line_items', eventId],
    enabled: !!eventId,
    queryFn: async (): Promise<FinancialLineItemRow[]> => {
      const { data, error } = await linesTable()
        .select('*')
        .eq('event_id', eventId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as FinancialLineItemRow[];
    },
  });
}

/** Existing documents matching a file hash or (provider, period, payout) —
 *  the duplicate-detection probe used before the review screen opens. */
export async function findLikelyDuplicates(input: {
  fileHash: string;
  provider: string | null;
  periodStart: string | null;
  reportedPayout: number | null;
}): Promise<FinancialDocumentRow[]> {
  const { data: byHash } = await docsTable()
    .select('*')
    .eq('file_hash', input.fileHash)
    .limit(5);
  const hashHits = (byHash ?? []) as unknown as FinancialDocumentRow[];
  if (hashHits.length > 0) return hashHits;

  if (input.provider && input.periodStart) {
    let q = docsTable()
      .select('*')
      .eq('provider', input.provider)
      .eq('period_start', input.periodStart)
      .limit(5);
    if (input.reportedPayout !== null) q = q.eq('reported_payout', input.reportedPayout);
    const { data } = await q;
    return (data ?? []) as unknown as FinancialDocumentRow[];
  }
  return [];
}
