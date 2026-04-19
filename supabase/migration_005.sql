-- Migration 005: Mileage log + document upload
-- Run this in the Supabase SQL Editor

-- ── 1. Mileage log ─────────────────────────────────────────────────────────
ALTER TABLE public.event_financials
  ADD COLUMN IF NOT EXISTS miles_driven NUMERIC(10,2) DEFAULT 0;

-- ── 2. Event documents metadata ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name    TEXT NOT NULL,
  file_size    INTEGER,
  mime_type    TEXT,
  storage_path TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own documents" ON public.event_documents;
CREATE POLICY "Users manage own documents" ON public.event_documents
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 3. Storage bucket ──────────────────────────────────────────────────────
-- Run this section in the Supabase SQL Editor (requires storage schema access)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('event-documents', 'event-documents', false)
  ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Users upload own documents" ON storage.objects;
CREATE POLICY "Users upload own documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users read own documents" ON storage.objects;
CREATE POLICY "Users read own documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'event-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own documents" ON storage.objects;
CREATE POLICY "Users delete own documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
