-- Migration 006: Daily takings per-day input for multi-day events
-- Run in Supabase SQL Editor after migrations.sql

CREATE TABLE IF NOT EXISTS public.daily_takings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  day_date DATE NOT NULL,
  day_number INTEGER NOT NULL,
  total_takings NUMERIC(12,2) NOT NULL DEFAULT 0,
  hot_drinks_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  iced_drinks_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  avg_temp_c NUMERIC(5,2),
  weather_code INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, day_date)
);

ALTER TABLE public.daily_takings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own daily_takings" ON public.daily_takings;
CREATE POLICY "Users can CRUD own daily_takings" ON public.daily_takings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
  );
