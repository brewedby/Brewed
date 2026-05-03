import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ProductCatalogItem } from '@/types/cogs';

export function useProductCatalog() {
  return useQuery({
    queryKey: ['product_catalog'],
    queryFn: async (): Promise<ProductCatalogItem[]> => {
      const { data, error } = await supabase
        .from('product_catalog')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      // Normalise nullable JSONB columns into the app shape.
      return (data ?? []).map((row) => ({
        ...row,
        price_tiers: row.price_tiers ?? [],
        sku: row.sku ?? null,
      })) as unknown as ProductCatalogItem[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useProductCatalogByCategory() {
  const { data: products = [], ...rest } = useProductCatalog();
  // Group by whatever categories actually exist in the data — supports
  // trade-specific keys (mains, sides, bakes…) added in CATEGORY_DEFINITIONS.
  const byCategory: Record<string, ProductCatalogItem[]> = {};
  for (const p of products) {
    (byCategory[p.category] ??= []).push(p);
  }
  return { ...rest, data: products, byCategory };
}
