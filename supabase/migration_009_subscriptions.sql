-- ============================================================
-- Migration 009: Apple App Store auto-renewable subscriptions
-- ============================================================
-- Adds subscription state to profiles. Only the service-role key
-- (used by the validate-apple-receipt Edge Function) may write
-- to these columns. The client can READ but not WRITE them, so
-- entitlement state cannot be spoofed from the device.
--
-- Run AFTER migration_008. Run in Supabase Dashboard > SQL Editor.

-- ── 1. Subscription columns on profiles ─────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'none',
    -- 'none' | 'active' | 'in_grace_period' | 'in_billing_retry' | 'expired' | 'revoked'
  ADD COLUMN IF NOT EXISTS subscription_product_id TEXT,
    -- e.g. 'com.brewedbyboon.app.pro.monthly'
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_environment TEXT,
    -- 'Sandbox' | 'Production'
  ADD COLUMN IF NOT EXISTS apple_original_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS apple_latest_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_will_renew BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewer_grandfathered BOOLEAN NOT NULL DEFAULT false;
  -- reviewer_grandfathered: set TRUE manually for Apple App Review demo account

CREATE INDEX IF NOT EXISTS idx_profiles_apple_original_tx
  ON public.profiles (apple_original_transaction_id)
  WHERE apple_original_transaction_id IS NOT NULL;

-- ── 2. Lock subscription columns to service-role writes only ─
-- Existing self-update policy on profiles is too permissive — it allows
-- a user to set their own subscription_status. Replace it with a policy
-- that excludes subscription columns from user-controlled updates.

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Read: user can see their own profile (including subscription status)
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Update: user can edit profile, but a trigger blocks subscription columns
CREATE POLICY "Users can update own profile non-subscription fields"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger to prevent the user from forging subscription state
CREATE OR REPLACE FUNCTION public.guard_profile_subscription_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- service_role bypasses RLS entirely so this trigger only fires for users
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_status            IS DISTINCT FROM OLD.subscription_status
  OR NEW.subscription_product_id        IS DISTINCT FROM OLD.subscription_product_id
  OR NEW.subscription_expires_at        IS DISTINCT FROM OLD.subscription_expires_at
  OR NEW.subscription_environment       IS DISTINCT FROM OLD.subscription_environment
  OR NEW.apple_original_transaction_id  IS DISTINCT FROM OLD.apple_original_transaction_id
  OR NEW.apple_latest_transaction_id    IS DISTINCT FROM OLD.apple_latest_transaction_id
  OR NEW.subscription_validated_at      IS DISTINCT FROM OLD.subscription_validated_at
  OR NEW.subscription_will_renew        IS DISTINCT FROM OLD.subscription_will_renew
  OR NEW.reviewer_grandfathered         IS DISTINCT FROM OLD.reviewer_grandfathered
  THEN
    RAISE EXCEPTION 'Subscription columns are read-only from the client';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_subscription ON public.profiles;
CREATE TRIGGER profiles_guard_subscription
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_subscription_columns();

-- ── 3. Helper view: is_subscribed ───────────────────────────
-- Treat 'active', 'in_grace_period', and reviewer_grandfathered as entitled.

CREATE OR REPLACE VIEW public.user_entitlement AS
SELECT
  id AS user_id,
  CASE
    WHEN reviewer_grandfathered THEN true
    WHEN subscription_status IN ('active','in_grace_period')
      AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW() - INTERVAL '24 hours')
      THEN true
    ELSE false
  END AS is_entitled,
  subscription_status,
  subscription_expires_at,
  subscription_will_renew
FROM public.profiles;

GRANT SELECT ON public.user_entitlement TO authenticated;

-- ── 4. Apple notifications log (for App Store Server Notifications V2) ─
-- Optional but recommended: stores raw Apple S2S notifications for
-- subscription lifecycle events (renewals, cancellations, refunds).

CREATE TABLE IF NOT EXISTS public.apple_notifications (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notification_type             TEXT NOT NULL,
  notification_subtype          TEXT,
  notification_uuid             TEXT UNIQUE,
  apple_original_transaction_id TEXT,
  raw_payload                   JSONB NOT NULL,
  received_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed                     BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.apple_notifications ENABLE ROW LEVEL SECURITY;

-- No client policies: service-role only.

CREATE INDEX IF NOT EXISTS idx_apple_notifications_user_id
  ON public.apple_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_apple_notifications_apple_tx
  ON public.apple_notifications(apple_original_transaction_id);

-- ── 5. Manual reviewer-grandfather toggle (run once for Apple review) ─
--
-- Once you've created a reviewer account in App Store Connect, run:
--
--   UPDATE public.profiles
--   SET reviewer_grandfathered = true
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'apple-reviewer@brewedbyboon.com');
--
-- This bypasses the paywall for the reviewer without involving sandbox IAP.
