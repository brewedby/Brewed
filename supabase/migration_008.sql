-- Migration 008: Product catalog and COGS reconciliation
-- Run in Supabase dashboard > SQL Editor

-- ============================================================
-- 1. Product catalog — one global list per user
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_catalog (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  sku           TEXT,                          -- optional POS barcode / SKU for exact matching
  unit_cost     NUMERIC(10,4) NOT NULL DEFAULT 0, -- cost TO MAKE one unit (not selling price)
  unit          TEXT NOT NULL DEFAULT 'item', -- 'cup', 'kg', 'item', 'serving', 'portion'
  category      TEXT NOT NULL DEFAULT 'other', -- 'hot_drinks','cold_drinks','food','other'
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own product catalog"
  ON public.product_catalog FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_product_catalog_user_id ON public.product_catalog(user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER product_catalog_updated_at
  BEFORE UPDATE ON public.product_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. Sales reports — one per uploaded file per event
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sales_reports (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                  UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name                 TEXT NOT NULL,
  file_size                 BIGINT,
  mime_type                 TEXT,             -- 'text/csv' or 'application/pdf'
  storage_path              TEXT,             -- Supabase Storage path (for PDFs)
  status                    TEXT NOT NULL DEFAULT 'pending',  -- 'pending','parsed','error'
  error_message             TEXT,
  -- Summary computed after parsing
  total_line_items          INTEGER DEFAULT 0,
  matched_line_items        INTEGER DEFAULT 0,
  total_revenue_from_file   NUMERIC(10,2) DEFAULT 0,
  calculated_cogs           NUMERIC(10,2) DEFAULT 0,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sales_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sales reports"
  ON public.sales_reports FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.events
            WHERE events.id = sales_reports.event_id AND events.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.events
            WHERE events.id = sales_reports.event_id AND events.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_sales_reports_event_id ON public.sales_reports(event_id);

-- ============================================================
-- 3. Sales line items — one row per product line in the report
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sales_line_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_report_id      UUID NOT NULL REFERENCES public.sales_reports(id) ON DELETE CASCADE,
  event_id             UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  product_name         TEXT NOT NULL,          -- raw name from the file
  product_catalog_id   UUID REFERENCES public.product_catalog(id) ON DELETE SET NULL,
  match_confidence     NUMERIC(4,3),           -- 0.0–1.0 fuzzy match score
  quantity             NUMERIC(10,4) NOT NULL DEFAULT 0,
  unit_price           NUMERIC(10,4),          -- from the file (selling price)
  line_total           NUMERIC(10,4),          -- revenue for this line
  unit_cost_snapshot   NUMERIC(10,4),          -- unit_cost copied from catalog at match time
  cogs_calculated      NUMERIC(10,4),          -- quantity × unit_cost_snapshot
  is_matched           BOOLEAN NOT NULL DEFAULT false,
  is_manually_assigned BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sales_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sales line items"
  ON public.sales_line_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.events
            WHERE events.id = sales_line_items.event_id AND events.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.events
            WHERE events.id = sales_line_items.event_id AND events.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_sales_line_items_report_id ON public.sales_line_items(sales_report_id);
CREATE INDEX IF NOT EXISTS idx_sales_line_items_event_id  ON public.sales_line_items(event_id);

-- ============================================================
-- 4. Storage bucket for sales reports (PDFs)
-- Run these separately in Supabase Dashboard > Storage:
--
--   INSERT INTO storage.buckets (id, name, public)
--   VALUES ('sales-reports', 'sales-reports', false)
--   ON CONFLICT (id) DO NOTHING;
--
--   CREATE POLICY "Users can upload own sales reports"
--     ON storage.objects FOR INSERT
--     WITH CHECK (bucket_id = 'sales-reports'
--       AND auth.uid()::text = (storage.foldername(name))[1]);
--
--   CREATE POLICY "Users can read own sales reports"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'sales-reports'
--       AND auth.uid()::text = (storage.foldername(name))[1]);
--
--   CREATE POLICY "Users can delete own sales reports"
--     ON storage.objects FOR DELETE
--     USING (bucket_id = 'sales-reports'
--       AND auth.uid()::text = (storage.foldername(name))[1]);
-- ============================================================
