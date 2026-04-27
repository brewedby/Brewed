import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ProductCatalogItem, ProductCategory } from '@/types/cogs';

// NOTE: When migration_008 is applied and types/database.ts is updated,
// the `as unknown as ...` casts below can be removed.

export function useProductCatalog() {
  return useQuery({
    queryKey: ['product_catalog'],
    queryFn: async (): Promise<ProductCatalogItem[]> => {
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown; error: unknown }>;
          };
        };
      })
        .from('product_catalog')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data ?? []) as ProductCatalogItem[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useProductCatalogByCategory() {
  const { data: products = [], ...rest } = useProductCatalog();
  const byCategory: Record<ProductCategory, ProductCatalogItem[]> = {
    hot_drinks:  products.filter((p) => p.category === 'hot_drinks'),
    cold_drinks: products.filter((p) => p.category === 'cold_drinks'),
    specials:    products.filter((p) => p.category === 'specials'),
    food:        products.filter((p) => p.category === 'food'),
    other:       products.filter((p) => p.category === 'other'),
  };
  return { ...rest, data: products, byCategory };
}
