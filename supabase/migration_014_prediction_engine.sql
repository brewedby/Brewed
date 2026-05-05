-- Migration 014: Prediction engine — weather snapshots + saved predictions
-- Run in Supabase dashboard > SQL Editor
--
-- 1. Persist a per-event weather snapshot once the forecast has been
--    fetched, so the prediction engine can do similar-event matching
--    without re-hitting the weather APIs and without losing context for
--    events that have already passed.
--
-- 2. Save the prediction we generated for an event at the time of
--    forecast, so we can later compare against the actual outcome and
--    trend our accuracy.
--
-- Both changes are additive: existing rows are untouched and any code
-- that hasn't been redeployed continues to work.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS avg_temp_c NUMERIC,
  ADD COLUMN IF NOT EXISTS weather_code INTEGER,
  ADD COLUMN IF NOT EXISTS weather_summary TEXT,
  ADD COLUMN IF NOT EXISTS weather_fetched_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.event_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Trade type at the time of prediction (so historical predictions stay
  -- meaningful even if the user later switches trade type).
  trade_type TEXT NOT NULL,
  -- Matches PredictionKind in lib/tradeTypeConfig.ts
  kind TEXT NOT NULL,
  -- Full prediction payload — JSONB so we can evolve the shape per kind
  -- without further migrations.
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  forecast_temp_c NUMERIC,
  weather_summary TEXT,
  confidence TEXT NOT NULL DEFAULT 'low'
    CHECK (confidence IN ('high', 'medium', 'low')),
  based_on_events INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_predictions_event
  ON public.event_predictions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_predictions_user_generated
  ON public.event_predictions(user_id, generated_at DESC);

ALTER TABLE public.event_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own predictions" ON public.event_predictions;
CREATE POLICY "Users can read their own predictions"
  ON public.event_predictions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own predictions" ON public.event_predictions;
CREATE POLICY "Users can insert their own predictions"
  ON public.event_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own predictions" ON public.event_predictions;
CREATE POLICY "Users can update their own predictions"
  ON public.event_predictions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own predictions" ON public.event_predictions;
CREATE POLICY "Users can delete their own predictions"
  ON public.event_predictions FOR DELETE
  USING (auth.uid() = user_id);
