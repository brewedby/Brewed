-- ============================================================
-- Migration 019: Launch hardening — reconcile the live database
-- ============================================================
-- An October 2026 audit of the production project found it had drifted
-- from the repo's migrations (009 was only partly applied, 010 never was):
--
--   1. CRITICAL (security): profiles had NO guard trigger and the old
--      permissive UPDATE policy, so any signed-in user could set their own
--      subscription_status / reviewer_grandfathered through the REST API
--      and unlock Pro for free.
--   2. CRITICAL (revenue): the four subscription columns the
--      validate-apple-receipt function writes did not exist, so every real
--      purchase failed to activate after the customer had paid.
--   3. Both pg_cron jobs still contained the literal YOUR_PROJECT_REF /
--      YOUR_SERVICE_ROLE_KEY placeholders and had failed every run
--      ("Couldn't resolve host name") — the Discover directory never
--      auto-refreshed and application-URL monitoring never ran.
--   4. Supabase security/performance advisor warnings (mutable
--      search_path, RPC-callable trigger functions, per-row auth.uid() in
--      RLS, unindexed foreign keys, a duplicated units policy).
--
-- BEFORE RUNNING — store two Vault secrets (once; values never appear in
-- cron.job or this file). Use the LEGACY service_role JWT (eyJ...), since
-- sync-directory is deployed with verify_jwt and only JWTs pass that:
--
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service_role JWT>', 'service_role_key');
--
-- Idempotent: safe to re-run. Run in the Supabase SQL editor.

BEGIN;

-- ── 1. Subscription columns (from migration 009) ───────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_environment      TEXT,
  ADD COLUMN IF NOT EXISTS apple_original_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS apple_latest_transaction_id   TEXT,
  ADD COLUMN IF NOT EXISTS subscription_validated_at     TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_apple_original_tx
  ON public.profiles (apple_original_transaction_id)
  WHERE apple_original_transaction_id IS NOT NULL;

-- ── 2. Guard subscription columns against client writes ────
-- SECURITY INVOKER on purpose: current_user is then the API role
-- ('authenticated' / 'anon') for client requests, 'service_role' for the
-- receipt-validation function, and 'postgres' in the SQL editor — so the
-- documented reviewer_grandfathered UPDATE still works for the operator.
-- (Migration 009's version keyed on auth.role(), which is NULL in the SQL
-- editor and blocked the operator too.) Covers INSERT as well: a user
-- whose profile row is missing could otherwise insert one pre-subscribed.
CREATE OR REPLACE FUNCTION public.guard_profile_subscription_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.subscription_status            IS DISTINCT FROM 'none'
    OR NEW.subscription_product_id        IS NOT NULL
    OR NEW.subscription_expires_at        IS NOT NULL
    OR NEW.subscription_environment       IS NOT NULL
    OR NEW.apple_original_transaction_id  IS NOT NULL
    OR NEW.apple_latest_transaction_id    IS NOT NULL
    OR NEW.subscription_validated_at      IS NOT NULL
    OR NEW.subscription_will_renew        IS DISTINCT FROM false
    OR NEW.reviewer_grandfathered         IS DISTINCT FROM false
    THEN
      RAISE EXCEPTION 'Subscription columns are read-only from the client'
        USING ERRCODE = '42501';
    END IF;
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
  OR NEW.id                             IS DISTINCT FROM OLD.id
  THEN
    RAISE EXCEPTION 'Subscription columns are read-only from the client'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_profile_subscription_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_guard_subscription ON public.profiles;
CREATE TRIGGER profiles_guard_subscription
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_subscription_columns();

-- ── 3. Function hygiene (advisor: search_path, RPC exposure) ─
-- Trigger functions use only NEW/now(), so an empty search_path is safe.
ALTER FUNCTION public.set_updated_at()              SET search_path = '';
ALTER FUNCTION public.update_updated_at()           SET search_path = '';
ALTER FUNCTION public.update_updated_at_directory() SET search_path = '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger functions must not be callable through /rest/v1/rpc.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_directory() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at()            FROM PUBLIC, anon, authenticated;

-- ── 4. RLS: evaluate auth.uid() once per query, not per row ─
-- (advisor 0003_auth_rls_initplan). Same predicates, wrapped in SELECT.
-- Policies are scoped TO authenticated — anon never owns rows.

-- profiles
DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile non-subscription fields" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);

-- Tables owned directly via user_id
DROP POLICY IF EXISTS "Users can CRUD own companies" ON public.concessions_companies;
CREATE POLICY "Users can CRUD own companies" ON public.concessions_companies
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can CRUD own events" ON public.events;
CREATE POLICY "Users can CRUD own events" ON public.events
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users access own units"   ON public.units;  -- duplicate of the policy below
DROP POLICY IF EXISTS "Users can CRUD own units" ON public.units;
CREATE POLICY "Users can CRUD own units" ON public.units
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage own product catalog" ON public.product_catalog;
CREATE POLICY "Users can manage own product catalog" ON public.product_catalog
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can read their own predictions"   ON public.event_predictions;
DROP POLICY IF EXISTS "Users can insert their own predictions" ON public.event_predictions;
DROP POLICY IF EXISTS "Users can update their own predictions" ON public.event_predictions;
DROP POLICY IF EXISTS "Users can delete their own predictions" ON public.event_predictions;
CREATE POLICY "Users can manage own predictions" ON public.event_predictions
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "fin_docs_select_own" ON public.financial_documents;
DROP POLICY IF EXISTS "fin_docs_insert_own" ON public.financial_documents;
DROP POLICY IF EXISTS "fin_docs_update_own" ON public.financial_documents;
DROP POLICY IF EXISTS "fin_docs_delete_own" ON public.financial_documents;
CREATE POLICY "fin_docs_own" ON public.financial_documents
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "fin_lines_select_own" ON public.financial_line_items;
DROP POLICY IF EXISTS "fin_lines_insert_own" ON public.financial_line_items;
DROP POLICY IF EXISTS "fin_lines_update_own" ON public.financial_line_items;
DROP POLICY IF EXISTS "fin_lines_delete_own" ON public.financial_line_items;
CREATE POLICY "fin_lines_own" ON public.financial_line_items
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- Child tables owned through their parent event
DROP POLICY IF EXISTS "Users can CRUD own event_financials" ON public.event_financials;
CREATE POLICY "Users can CRUD own event_financials" ON public.event_financials
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_financials.event_id AND e.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_financials.event_id AND e.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can CRUD own staffing_entries" ON public.staffing_entries;
CREATE POLICY "Users can CRUD own staffing_entries" ON public.staffing_entries
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM public.events e WHERE e.id = staffing_entries.event_id AND e.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = staffing_entries.event_id AND e.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can CRUD own infrastructure_items" ON public.infrastructure_items;
CREATE POLICY "Users can CRUD own infrastructure_items" ON public.infrastructure_items
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM public.events e WHERE e.id = infrastructure_items.event_id AND e.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = infrastructure_items.event_id AND e.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can CRUD own event_units" ON public.event_units;
CREATE POLICY "Users can CRUD own event_units" ON public.event_units
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_units.event_id AND e.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_units.event_id AND e.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can CRUD own daily_takings" ON public.daily_takings;
CREATE POLICY "Users can CRUD own daily_takings" ON public.daily_takings
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM public.events e WHERE e.id = daily_takings.event_id AND e.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = daily_takings.event_id AND e.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can manage own event documents" ON public.event_documents;
CREATE POLICY "Users can manage own event documents" ON public.event_documents
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_documents.event_id AND e.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_documents.event_id AND e.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can manage own sales reports" ON public.sales_reports;
CREATE POLICY "Users can manage own sales reports" ON public.sales_reports
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM public.events e WHERE e.id = sales_reports.event_id AND e.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = sales_reports.event_id AND e.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can manage own sales line items" ON public.sales_line_items;
CREATE POLICY "Users can manage own sales line items" ON public.sales_line_items
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM public.events e WHERE e.id = sales_line_items.event_id AND e.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = sales_line_items.event_id AND e.user_id = (SELECT auth.uid())));

-- ── 5. Covering indexes for foreign keys (advisor 0001) ────
CREATE INDEX IF NOT EXISTS idx_concessions_companies_user_id ON public.concessions_companies (user_id);
CREATE INDEX IF NOT EXISTS idx_event_documents_event_id      ON public.event_documents (event_id);
CREATE INDEX IF NOT EXISTS idx_event_documents_user_id       ON public.event_documents (user_id);
CREATE INDEX IF NOT EXISTS idx_event_units_unit_id           ON public.event_units (unit_id);
CREATE INDEX IF NOT EXISTS idx_events_company_id             ON public.events (company_id);
CREATE INDEX IF NOT EXISTS idx_events_unit_id                ON public.events (unit_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id_date           ON public.events (user_id, date);
CREATE INDEX IF NOT EXISTS idx_financial_documents_replaces  ON public.financial_documents (replaces_document_id);
CREATE INDEX IF NOT EXISTS idx_infrastructure_items_event_id ON public.infrastructure_items (event_id);
CREATE INDEX IF NOT EXISTS idx_sales_line_items_product      ON public.sales_line_items (product_catalog_id);
CREATE INDEX IF NOT EXISTS idx_sales_reports_user_id         ON public.sales_reports (user_id);
CREATE INDEX IF NOT EXISTS idx_staffing_entries_event_id     ON public.staffing_entries (event_id);
CREATE INDEX IF NOT EXISTS idx_units_user_id                 ON public.units (user_id);

-- ── 6. Scheduled jobs — weekly, secrets read from Vault ────
DO $$
DECLARE j text;
BEGIN
  FOREACH j IN ARRAY ARRAY[
    'sync-directory-daily', 'check-application-urls-daily',
    'sync-directory-weekly', 'check-application-urls-weekly'
  ] LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = j) THEN
      PERFORM cron.unschedule(j);
    END IF;
  END LOOP;
END $$;

-- Sundays 03:00 UTC: refresh the Discover directory (Brave Search).
SELECT cron.schedule(
  'sync-directory-weekly',
  '0 3 * * 0',
  $job$
  SELECT net.http_post(
    url     := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/sync-directory',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
  $job$
);

-- Daily 07:00 UTC: flag changed application pages on upcoming events.
SELECT cron.schedule(
  'check-application-urls-daily',
  '0 7 * * *',
  $job$
  SELECT net.http_post(
    url     := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/check-application-urls',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
  $job$
);

COMMIT;

-- ── Verify ─────────────────────────────────────────────────
-- Re-run Database → Advisors (security + performance).
-- SELECT jobname, schedule, active FROM cron.job;
-- After the next run:
--   SELECT status_code, error_msg, created FROM net._http_response ORDER BY created DESC LIMIT 5;
-- Expect 200s, not "Couldn't resolve host name".
