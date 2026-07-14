-- Migration 018: In-app account deletion (App Review guideline 5.1.1(v))
--
-- Apple requires apps with account creation to let users DELETE the
-- account inside the app — "email us" is not compliant.
--
-- delete_own_account() removes the caller's auth.users row; every
-- user-data table references auth.users(id) ON DELETE CASCADE, so the
-- profile, events, financials, documents, products, units and imports
-- are erased in the same transaction.
--
-- Security: SECURITY DEFINER (auth.users is not writable by clients),
-- locked search_path, callable ONLY by authenticated users, and it can
-- only ever delete auth.uid() — the caller's own account.
--
-- Run in the Supabase SQL editor. Idempotent.

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_own_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

COMMENT ON FUNCTION public.delete_own_account() IS
  'In-app account deletion (App Store requirement). Deletes the calling '
  'user''s auth row; all user data cascades. Cannot target other users.';
