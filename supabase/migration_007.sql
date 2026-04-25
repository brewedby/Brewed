-- Migration 007: Miles driven, event documents table, and storage bucket

-- 1. Add miles_driven to event_financials
ALTER TABLE public.event_financials
  ADD COLUMN IF NOT EXISTS miles_driven NUMERIC(10,2) DEFAULT 0;

-- 2. Create event_documents table
CREATE TABLE IF NOT EXISTS public.event_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name     TEXT NOT NULL,
  file_size     BIGINT,
  mime_type     TEXT,
  storage_path  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Row-level security for event_documents
ALTER TABLE public.event_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own event documents"
  ON public.event_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_documents.event_id
        AND events.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_documents.event_id
        AND events.user_id = auth.uid()
    )
  );

-- 4. Storage bucket for event documents
-- Run these in the Supabase dashboard Storage section or via the API:
--
--   INSERT INTO storage.buckets (id, name, public)
--   VALUES ('event-documents', 'event-documents', false)
--   ON CONFLICT (id) DO NOTHING;
--
--   CREATE POLICY "Users can upload own event documents"
--     ON storage.objects FOR INSERT
--     WITH CHECK (bucket_id = 'event-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
--
--   CREATE POLICY "Users can read own event documents"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'event-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
--
--   CREATE POLICY "Users can delete own event documents"
--     ON storage.objects FOR DELETE
--     USING (bucket_id = 'event-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
