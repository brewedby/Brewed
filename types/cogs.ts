// COGS reconciliation feature types.
// These are standalone interfaces (not derived from Database) so this file
// can be written before migration_008 is applied.
// During implementation, add the table rows to types/database.ts and
// update these to use Tables['product_catalog']['Row'] etc.

// ProductCategory is a string keyed by snake_case so trade types can
// introduce their own categories (e.g. burger trade → 'mains' / 'sides').
// All known categories are defined in CATEGORY_DEFINITIONS below.
export type ProductCategory = string;
export type SalesReportStatus = 'pending' | 'parsed' | 'error';

export interface PriceTier {
  label: string;
  price: number;
}

export interface ProductCatalogItem {
  id: string;
  user_id: string;
  name: string;
  sku: string | null;
  unit_cost: number;
  selling_price: number;   // mirrors price_tiers[0].price — kept for COGS scanning compat
  price_tiers: PriceTier[];
  unit: string;
  category: ProductCategory;
  /** null = follow CATEGORY_DEFINITIONS[category].vatable, true/false = explicit override */
  is_vatable: boolean | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SalesReport {
  id: string;
  event_id: string;
  user_id: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string | null;
  status: SalesReportStatus;
  error_message: string | null;
  total_line_items: number;
  matched_line_items: number;
  total_revenue_from_file: number;
  calculated_cogs: number;
  created_at: string;
}

export interface SalesLineItem {
  id: string;
  sales_report_id: string;
  event_id: string;
  product_name: string;
  product_catalog_id: string | null;
  match_confidence: number | null;
  quantity: number;
  unit_price: number | null;
  line_total: number | null;
  unit_cost_snapshot: number | null;
  cogs_calculated: number | null;
  is_matched: boolean;
  is_manually_assigned: boolean;
  created_at: string;
}

// Enriched line item with the matched catalog product joined in
export interface SalesLineItemWithProduct extends SalesLineItem {
  product_catalog: ProductCatalogItem | null;
}

// Parsed output from the CSV or PDF parser — not yet persisted
export interface ParsedSalesLine {
  product_name: string;
  quantity: number;
  unit_price: number | null;
  line_total: number;
}

export interface ParseResult {
  lines: ParsedSalesLine[];
  errors: string[];
  rawHeaders: string[];
  sourceFormat: 'csv' | 'pdf' | 'unknown';
}

// After fuzzy matching against the catalog
export interface ReconciledLine extends ParsedSalesLine {
  matched_product: ProductCatalogItem | null;
  match_confidence: number;
  unit_cost_snapshot: number | null;
  cogs_calculated: number | null;
}

// Summary of a full reconciliation pass
export interface ReconciliationSummary {
  totalLineItems: number;
  matchedItems: number;
  unmatchedItems: number;
  totalRevenueFromFile: number;
  calculatedCogs: number;
  coveragePercent: number;
}

// ── Category catalogue ──────────────────────────────────────────────
// Every category that can appear in any trade type, keyed by snake_case.
// `vatable: true` means the selling price includes 20% UK standard-rate VAT
// (hot food, hot drinks, alcohol, ready-to-eat). Cold/take-away food is
// generally zero-rated.
export interface CategoryDefinition {
  label: string;
  emoji: string;
  vatable: boolean;
}

export const CATEGORY_DEFINITIONS: Record<string, CategoryDefinition> = {
  // Drinks
  hot_drinks:    { label: 'Hot Drinks',    emoji: '☕', vatable: true  },
  cold_drinks:   { label: 'Cold Drinks',   emoji: '🥤', vatable: false },
  drinks:        { label: 'Drinks',        emoji: '🥤', vatable: false },
  alcohol:       { label: 'Alcohol',       emoji: '🍺', vatable: true  },
  cocktails:     { label: 'Cocktails',     emoji: '🍸', vatable: true  },
  smoothies:     { label: 'Smoothies',     emoji: '🥤', vatable: false },
  // Mains / Sides / Extras
  mains:         { label: 'Mains',         emoji: '🍔', vatable: true  },
  sides:         { label: 'Sides',         emoji: '🍟', vatable: true  },
  extras:        { label: 'Extras',        emoji: '➕', vatable: true  },
  toppings:      { label: 'Toppings',      emoji: '🧀', vatable: true  },
  sauces:        { label: 'Sauces',        emoji: '🥫', vatable: false },
  // Bakery / Sweet
  bakes:         { label: 'Bakes',         emoji: '🥐', vatable: false },
  bread:         { label: 'Bread',         emoji: '🍞', vatable: false },
  pastries:      { label: 'Pastries',      emoji: '🥐', vatable: true  },
  cakes:         { label: 'Cakes',         emoji: '🍰', vatable: false },
  desserts:      { label: 'Desserts',      emoji: '🍨', vatable: true  },
  ice_cream:     { label: 'Ice Cream',     emoji: '🍦', vatable: true  },
  // Generic
  food:          { label: 'Food',          emoji: '🍞', vatable: true  },
  specials:      { label: 'Specials',      emoji: '⭐', vatable: true  },
  other:         { label: 'Other',         emoji: '📦', vatable: false },
};

// ── Trade-type → ordered category list ──────────────────────────────
// Defines the default category set surfaced in the menu builder for
// each business type. Users can pick categories from any list — these
// are just sensible defaults to make the menu feel relevant.
export const TRADE_CATEGORIES: Record<string, string[]> = {
  Coffee:              ['hot_drinks', 'cold_drinks', 'specials', 'bakes', 'other'],
  'Street Food':       ['mains', 'sides', 'drinks', 'specials', 'extras', 'other'],
  Pizza:               ['mains', 'sides', 'drinks', 'specials', 'extras', 'other'],
  Burgers:             ['mains', 'sides', 'drinks', 'specials', 'extras', 'other'],
  Desserts:            ['desserts', 'cakes', 'drinks', 'specials', 'extras', 'other'],
  Bakery:              ['bakes', 'bread', 'pastries', 'cakes', 'hot_drinks', 'cold_drinks', 'other'],
  'Ice Cream':         ['ice_cream', 'desserts', 'toppings', 'drinks', 'specials', 'other'],
  Crepes:              ['mains', 'desserts', 'drinks', 'specials', 'toppings', 'other'],
  Waffles:             ['mains', 'desserts', 'drinks', 'specials', 'toppings', 'other'],
  Cocktails:           ['cocktails', 'alcohol', 'cold_drinks', 'specials', 'sides', 'other'],
  'Craft Beer':        ['alcohol', 'cold_drinks', 'sides', 'specials', 'other'],
  Wine:                ['alcohol', 'cold_drinks', 'sides', 'specials', 'other'],
  'Juice & Smoothies': ['smoothies', 'cold_drinks', 'mains', 'specials', 'other'],
  'Asian Food':        ['mains', 'sides', 'drinks', 'specials', 'extras', 'sauces', 'other'],
  'Mexican Food':      ['mains', 'sides', 'drinks', 'specials', 'extras', 'sauces', 'other'],
  Other:               ['mains', 'sides', 'drinks', 'specials', 'extras', 'other'],
};

// Sensible fallback when no trade type is selected or unknown
export const DEFAULT_CATEGORIES: string[] = ['mains', 'sides', 'drinks', 'specials', 'extras', 'other'];

// Resolve the categories for a given trade type, returning the full
// definition objects in display order.
export function getCategoriesForTrade(
  tradeType: string | null | undefined,
): (CategoryDefinition & { value: string })[] {
  const keys = (tradeType && TRADE_CATEGORIES[tradeType]) || DEFAULT_CATEGORIES;
  return keys.map((k) => ({ value: k, ...(CATEGORY_DEFINITIONS[k] ?? CATEGORY_DEFINITIONS.other) }));
}

export function isVatableCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  return CATEGORY_DEFINITIONS[category]?.vatable ?? false;
}

/** Returns whether a product's selling price includes VAT, taking into
 *  account the per-product override (if set) before falling back to the
 *  category default. */
export function isProductVatable(product: { category: string; is_vatable?: boolean | null }): boolean {
  if (product.is_vatable === true) return true;
  if (product.is_vatable === false) return false;
  return isVatableCategory(product.category);
}

export function getCategoryDefinition(category: string | null | undefined): (CategoryDefinition & { value: string }) {
  const key = category ?? 'other';
  return { value: key, ...(CATEGORY_DEFINITIONS[key] ?? CATEGORY_DEFINITIONS.other) };
}

// ── Legacy exports kept for backward compatibility with existing
// imports. New code should call getCategoriesForTrade(profile.business_type).
export const PRODUCT_CATEGORIES: { value: ProductCategory; label: string; emoji: string }[] = [
  { value: 'hot_drinks',  label: 'Hot Drinks',  emoji: '☕' },
  { value: 'cold_drinks', label: 'Cold Drinks', emoji: '🥤' },
  { value: 'specials',    label: 'Specials',    emoji: '⭐' },
  { value: 'food',        label: 'Food',        emoji: '🍞' },
  { value: 'other',       label: 'Other',       emoji: '📦' },
];

// Categories where the selling price includes 20% VAT (hot food/drinks).
// Derived from CATEGORY_DEFINITIONS so the two stay in sync.
export const VATABLE_CATEGORIES: ProductCategory[] = Object.entries(CATEGORY_DEFINITIONS)
  .filter(([, def]) => def.vatable)
  .map(([key]) => key);

export const UNIT_OPTIONS = ['cup', 'item', 'portion', 'serving', 'kg', 'litre', 'slice', 'pack'];
