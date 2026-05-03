-- Migration 013: Commission basis (net vs gross)
-- Run in Supabase dashboard > SQL Editor
--
-- Most concessions companies take their commission on net (ex-VAT) sales,
-- but some take it on gross (inc-VAT) sales. This column lets the user
-- pick the basis per event so the P&L matches what the organiser actually
-- charges. Defaults to 'net' to match the historical behaviour.

ALTER TABLE public.event_financials
  ADD COLUMN IF NOT EXISTS commission_basis TEXT NOT NULL DEFAULT 'net'
  CHECK (commission_basis IN ('net', 'gross'));
