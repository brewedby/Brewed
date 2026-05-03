-- Migration 012: Per-product VAT override
-- Run in Supabase dashboard > SQL Editor
--
-- The category catalogue (CATEGORY_DEFINITIONS in types/cogs.ts) marks
-- categories as vatable=true/false based on UK rules for the typical
-- case (hot drinks/food = standard rated, cold take-away = zero rated).
-- This column lets the user override on a per-product basis when the
-- category default is wrong (e.g. a cold sandwich filed under "mains",
-- or a take-away pastry that's actually zero-rated).
--
-- NULL = follow the category's default (CATEGORY_DEFINITIONS[cat].vatable)
-- TRUE = always include 20% VAT in the selling price
-- FALSE = treat as zero-rated regardless of category

ALTER TABLE public.product_catalog
  ADD COLUMN IF NOT EXISTS is_vatable BOOLEAN;
