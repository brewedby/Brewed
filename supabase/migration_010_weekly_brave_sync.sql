-- ============================================================
-- Migration 010: Reschedule Brave Search sync from daily → weekly
-- ============================================================
-- Brave Search free tier is 2,000 queries/month. Daily sync
-- (≈14 queries/day × 30 = 420/month) sits well under that, but
-- weekly is plenty for a directory of UK food/festival events
-- and reduces traffic + load on Brave's API.
--
-- New schedule: Sunday 03:00 UTC (weekly), URL change check Sunday 04:00 UTC.
--
-- Run AFTER migration_009. Requires pg_cron + pg_net extensions
-- (already enabled by migration_004).
--
-- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY before running.

-- Drop the existing daily jobs
SELECT cron.unschedule('sync-directory-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-directory-daily');

SELECT cron.unschedule('check-application-urls-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-application-urls-daily');

-- Drop any prior weekly variants (idempotent)
SELECT cron.unschedule('sync-directory-weekly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-directory-weekly');

SELECT cron.unschedule('check-application-urls-weekly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-application-urls-weekly');

-- ── Job 1: Weekly directory sync — Sunday 03:00 UTC ──────────
SELECT cron.schedule(
  'sync-directory-weekly',
  '0 3 * * 0',
  $$
  SELECT net.http_post(
    url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-directory',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'Authorization',  'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $$
);

-- ── Job 2: Weekly URL change check — Sunday 04:00 UTC ────────
SELECT cron.schedule(
  'check-application-urls-weekly',
  '0 4 * * 0',
  $$
  SELECT net.http_post(
    url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-application-urls',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'Authorization',  'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $$
);

-- ── Optional: track last successful sync at the table level ─
-- The discover screen reads MAX(updated_at) from uk_events_directory,
-- which gives us a per-row "last seen" already. Add an explicit
-- sync_runs log so we can show "Next sync in 4 days" in the UI later.

CREATE TABLE IF NOT EXISTS public.directory_sync_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'running', -- 'running' | 'success' | 'error'
  entries_added     INTEGER DEFAULT 0,
  entries_updated   INTEGER DEFAULT 0,
  urls_checked      INTEGER DEFAULT 0,
  urls_changed      INTEGER DEFAULT 0,
  error_message     TEXT
);

ALTER TABLE public.directory_sync_runs ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated users (so the app can show sync status)
CREATE POLICY "Authenticated users can read sync run history"
  ON public.directory_sync_runs FOR SELECT
  TO authenticated
  USING (true);

-- Verify both jobs are scheduled:
--   SELECT jobname, schedule, active FROM cron.job;
