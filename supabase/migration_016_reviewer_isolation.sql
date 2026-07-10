-- Migration 016: Isolate reviewer/test entitlement from production users
--
-- WHY: during launch debugging (May 2026) reviewer_grandfathered was set
-- with a blanket UPDATE (no WHERE clause), so EVERY profile that existed
-- at that moment has permanent free Pro access. New signups default to
-- false (migration 009), but the existing rows must be reset before
-- launch or early users ride free forever.
--
-- WHAT THIS DOES:
--   1. Resets reviewer_grandfathered to false for everyone EXCEPT the
--      accounts in the allowlist below.
--   2. Documents the column so future operators know it bypasses billing.
--
-- >>> EDIT THE ALLOWLIST before running: keep only the developer /
-- >>> App Review accounts that should retain free Pro access.
--
-- Run in Supabase SQL Editor. Safe to re-run (idempotent).

UPDATE public.profiles
SET reviewer_grandfathered = false
WHERE reviewer_grandfathered = true
  AND id NOT IN (
    SELECT id FROM auth.users
    WHERE email IN (
      'sip@brewedbyboon.com'          -- developer account
      -- ,'appreview@brewedbyboon.com' -- add an App Review demo account here if you create one
    )
  );

COMMENT ON COLUMN public.profiles.reviewer_grandfathered IS
  'Bypasses App Store billing entirely (resolves to Pro tier). ONLY for '
  'developer and App Review demo accounts. Client writes are blocked by '
  'guard_profile_subscription_columns (migration 009); set only via the '
  'SQL editor or service role. Never set in bulk.';

-- Verify: should list ONLY your allowlisted accounts.
-- SELECT u.email, p.reviewer_grandfathered
-- FROM public.profiles p JOIN auth.users u ON u.id = p.id
-- WHERE p.reviewer_grandfathered = true;
