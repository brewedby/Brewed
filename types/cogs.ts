// COGS reconciliation feature types.
// These are standalone interfaces (not derived from Database) so this file
// can be written before migration_008 is applied.
// During implementation, add the table rows to types/database.ts and
// update these to use Tables['product_catalog']['Row'] etc.

export type ProductCategory = 'hot_drinks' | 'cold_drinks' | 'specials' | 'food' | 'other';
export type SalesReportStatus = 'pending' | 'parsed' | 'error';

export interface ProductCatalogItem {
  id: string;
  user_id: string;
  name: string;
  sku: string | null;
  unit_cost: number;
  selling_price: number;
  unit: string;
  category: ProductCategory;
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

export const PRODUCT_CATEGORIES: { value: ProductCategory; label: string; emoji: string }[] = [
  { value: 'hot_drinks',  label: 'Hot Drinks',  emoji: '☕' },
  { value: 'cold_drinks', label: 'Cold Drinks',  emoji: '🥤' },
  { value: 'specials',    label: 'Specials',     emoji: '⭐' },
  { value: 'food',        label: 'Food',         emoji: '🍞' },
  { value: 'other',       label: 'Other',        emoji: '📦' },
];

// Categories where the selling price includes 20% VAT (hot food/drinks)
export const VATABLE_CATEGORIES: ProductCategory[] = ['hot_drinks', 'specials'];

export const UNIT_OPTIONS = ['cup', 'item', 'portion', 'serving', 'kg', 'litre', 'slice', 'pack'];
