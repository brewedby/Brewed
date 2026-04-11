-- ============================================================
-- Migration 004: pg_cron scheduled jobs for daily auto-sync
-- ============================================================
-- Run this AFTER:
--   1. Running migrations.sql (001-003) first
--   2. Enabling pg_cron in Supabase Dashboard:
--      Project Settings → Database → Extensions → search "pg_cron" → Enable
--   3. Enabling pg_net the same way
--   4. Deploying the Edge Functions:
--      supabase functions deploy sync-directory
--      supabase functions deploy check-application-urls
--   5. Setting the BRAVE_SEARCH_API_KEY secret:
--      supabase secrets set BRAVE_SEARCH_API_KEY=your_key_here
--
-- Replace YOUR_PROJECT_REF with your Supabase project reference ID
-- (found in: Dashboard → Project Settings → General → Reference ID)
-- Replace YOUR_SERVICE_ROLE_KEY with your service_role key
-- (found in: Dashboard → Project Settings → API → service_role)
--
-- WARNING: The service_role key has full DB access. This SQL runs inside
-- Supabase's trusted server environment and is never exposed to clients.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Job 1: Daily directory sync (03:00 UTC) ────────────────────────────────
-- Searches Brave for new UK events/festivals, upserts into uk_events_directory,
-- and checks existing application URLs for page changes.

SELECT cron.unschedule('sync-directory-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-directory-daily');

SELECT cron.schedule(
  'sync-directory-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-directory',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'Authorization',  'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ── Job 2: Daily URL check for tracked events (08:00 UTC) ──────────────────
-- Checks application URLs on your own tracked events for page changes
-- and flags them in the app with the orange "Page changed" badge.

SELECT cron.unschedule('check-application-urls-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-application-urls-daily');

SELECT cron.schedule(
  'check-application-urls-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-application-urls',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'Authorization',  'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Verify both jobs are scheduled:
-- SELECT jobname, schedule, active FROM cron.job;
