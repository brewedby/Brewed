-- Migration 011: Price tiers per product catalog item
-- Run in Supabase dashboard > SQL Editor
--
-- Replaces the single selling_price with a JSONB array of price tiers
-- so the same menu item can have different prices at different venues
-- (e.g. Standard £3.20 at a market, Festival £3.80 at a large event).
--
-- selling_price is KEPT and always mirrors price_tiers[0].price so that
-- existing COGS scanning and fuzzy matching logic continues to work
-- without changes.

ALTER TABLE public.product_catalog
  ADD COLUMN IF NOT EXISTS price_tiers JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill: convert existing single selling_price into the first tier
UPDATE public.product_catalog
SET price_tiers = jsonb_build_array(
  jsonb_build_object('label', 'Standard', 'price', selling_price)
)
WHERE price_tiers = '[]'::jsonb;
