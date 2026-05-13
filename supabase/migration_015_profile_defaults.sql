-- ============================================================
-- Migration 015: Ensure profile.business_type has a default
-- ============================================================
-- The initial migrations.sql added business_type with NOT NULL DEFAULT 'Coffee'.
-- However, that script may have been run against a DB where the column already
-- existed without the constraint, making the ADD COLUMN IF NOT EXISTS a no-op
-- and leaving the column nullable with no default.
--
-- This migration:
--   1. Sets a DEFAULT on the column so the auth-trigger INSERT gets a value.
--   2. Backfills any NULL rows to 'Coffee' — these are accounts created before
--      the column existed, or before the default was applied.
--   3. Sets a DEFAULT on currency / custom_metrics for the same reason.
--
-- Run AFTER migration_014. Run in Supabase Dashboard > SQL Editor.
-- Idempotent: safe to run multiple times.

-- 1. Set column defaults (idempotent — can be re-run)
ALTER TABLE public.profiles
  ALTER COLUMN business_type SET DEFAULT 'Coffee',
  ALTER COLUMN currency       SET DEFAULT 'GBP',
  ALTER COLUMN custom_metrics SET DEFAULT '[]'::jsonb;

-- 2. Backfill rows that have NULL in any of these columns.
--    business_type = NULL → 'Coffee' (the original intended default for new
--    coffee-truck traders; users who explicitly set a different type are
--    unaffected because their column is not NULL).
UPDATE public.profiles
   SET business_type  = 'Coffee'
 WHERE business_type IS NULL;

UPDATE public.profiles
   SET currency = 'GBP'
 WHERE currency IS NULL;

UPDATE public.profiles
   SET custom_metrics = '[]'::jsonb
 WHERE custom_metrics IS NULL;

-- 3. Apply NOT NULL constraint now that no NULLs remain.
--    Using DO block to handle the case where the constraint already exists.
DO $$
BEGIN
  ALTER TABLE public.profiles
    ALTER COLUMN business_type  SET NOT NULL,
    ALTER COLUMN currency       SET NOT NULL,
    ALTER COLUMN custom_metrics SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  -- Column may already be NOT NULL — ignore.
  NULL;
END;
$$;
