-- Migration 017: Financial document scanning & reconciliation
--
-- Stores ONLY structured extracted values — never the source file and
-- never raw document text (local-first: files are parsed on-device and
-- discarded). Every row is owned by a user and locked down with RLS.
--
-- Run in the Supabase SQL editor. Idempotent.

-- ── 1. financial_documents — one row per confirmed import ──────────────

CREATE TABLE IF NOT EXISTS public.financial_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id          UUID REFERENCES public.events(id) ON DELETE SET NULL,

  kind              TEXT NOT NULL DEFAULT 'other',       -- epos_sales | settlement | deduction_statement | fee_invoice | contract | other
  provider          TEXT,
  document_ref      TEXT,
  period_start      DATE,
  period_end        DATE,

  -- Sales summary (normalised; NULL = not present on the document)
  gross_sales       NUMERIC(12,2),
  refunds           NUMERIC(12,2),
  discounts         NUMERIC(12,2),
  net_sales         NUMERIC(12,2),
  sales_vat         NUMERIC(12,2),
  cash_sales        NUMERIC(12,2),
  card_sales        NUMERIC(12,2),

  -- Payout reconciliation
  reported_payout   NUMERIC(12,2),
  expected_payout   NUMERIC(12,2),
  reconciliation_status TEXT NOT NULL DEFAULT 'missing_information',
  reconciliation_note   TEXT,

  -- Audit trail
  file_name         TEXT,                                -- original filename (no content)
  file_hash         TEXT,                                -- sha-256 of the source bytes, for duplicate detection
  file_size         BIGINT,
  source_retained   BOOLEAN NOT NULL DEFAULT false,      -- scan-and-discard default
  imported_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at      TIMESTAMPTZ,
  user_edited       BOOLEAN NOT NULL DEFAULT false,      -- any extracted value changed in review
  replaces_document_id UUID REFERENCES public.financial_documents(id) ON DELETE SET NULL,
  revision_kind     TEXT,                                -- duplicate | replacement | revised | separate

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS financial_documents_user_idx  ON public.financial_documents (user_id);
CREATE INDEX IF NOT EXISTS financial_documents_event_idx ON public.financial_documents (event_id);
CREATE INDEX IF NOT EXISTS financial_documents_hash_idx  ON public.financial_documents (user_id, file_hash);

-- ── 2. financial_line_items — one row per deduction/fee/credit ─────────

CREATE TABLE IF NOT EXISTS public.financial_line_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       UUID NOT NULL REFERENCES public.financial_documents(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id          UUID REFERENCES public.events(id) ON DELETE SET NULL,

  description       TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'other',
  -- Positive = money out (deduction); negative = credit to the trader.
  net               NUMERIC(12,2),
  vat               NUMERIC(12,2),
  gross             NUMERIC(12,2),
  vat_rate          NUMERIC(6,4),                        -- 0.2000, 0.0500 …
  vat_treatment     TEXT NOT NULL DEFAULT 'unknown',     -- inclusive | exclusive | no_vat | exempt | outside | unknown
  reclaimability    TEXT NOT NULL DEFAULT 'pending_review',
  settlement_role   TEXT NOT NULL DEFAULT 'deducted_at_source',
  is_forecast       BOOLEAN NOT NULL DEFAULT false,      -- true = planned cost from a contract
  provider          TEXT,
  notes             TEXT,
  source_text       TEXT,                                -- the single line the value came from (never full document text)

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS financial_line_items_doc_idx   ON public.financial_line_items (document_id);
CREATE INDEX IF NOT EXISTS financial_line_items_event_idx ON public.financial_line_items (event_id);
CREATE INDEX IF NOT EXISTS financial_line_items_user_idx  ON public.financial_line_items (user_id);

-- ── 3. Row-level security: owner-only, enforced at the database ────────

ALTER TABLE public.financial_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fin_docs_select_own" ON public.financial_documents;
CREATE POLICY "fin_docs_select_own" ON public.financial_documents
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "fin_docs_insert_own" ON public.financial_documents;
CREATE POLICY "fin_docs_insert_own" ON public.financial_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "fin_docs_update_own" ON public.financial_documents;
CREATE POLICY "fin_docs_update_own" ON public.financial_documents
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "fin_docs_delete_own" ON public.financial_documents;
CREATE POLICY "fin_docs_delete_own" ON public.financial_documents
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "fin_lines_select_own" ON public.financial_line_items;
CREATE POLICY "fin_lines_select_own" ON public.financial_line_items
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "fin_lines_insert_own" ON public.financial_line_items;
CREATE POLICY "fin_lines_insert_own" ON public.financial_line_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "fin_lines_update_own" ON public.financial_line_items;
CREATE POLICY "fin_lines_update_own" ON public.financial_line_items
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "fin_lines_delete_own" ON public.financial_line_items;
CREATE POLICY "fin_lines_delete_own" ON public.financial_line_items
  FOR DELETE USING (auth.uid() = user_id);

-- ── 4. updated_at maintenance ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS fin_docs_touch ON public.financial_documents;
CREATE TRIGGER fin_docs_touch BEFORE UPDATE ON public.financial_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS fin_lines_touch ON public.financial_line_items;
CREATE TRIGGER fin_lines_touch BEFORE UPDATE ON public.financial_line_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
