import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ProductFormValues } from '@/lib/validations/product.schema';
import type { ProductCatalogItem } from '@/types/cogs';

// Supabase client cast helper — remove once types/database.ts includes these tables
function catalogTable() {
  return (supabase as unknown as {
    from: (t: string) => ReturnType<typeof supabase.from>;
  }).from('product_catalog');
}

// Postgres "column does not exist" surfaces as code 42703 / a message
// containing "price_tiers". If the user has not yet applied
// migration_011_price_tiers.sql we degrade gracefully so Add Product
// keeps working with the legacy single selling_price column.
function isPriceTiersMissingError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  if (e.code === '42703') return true;
  return typeof e.message === 'string' && /price_tiers/i.test(e.message);
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      data,
      userId,
    }: {
      data: ProductFormValues;
      userId: string;
    }): Promise<ProductCatalogItem> => {
      const defaultPrice = data.price_tiers[0]?.price ?? 0;
      const baseRow = {
        user_id:       userId,
        name:          data.name,
        sku:           data.sku || null,
        selling_price: defaultPrice,
        unit_cost:     data.unit_cost,
        unit:          data.unit,
        category:      data.category,
        is_active:     data.is_active,
      };

      let { data: created, error } = await catalogTable()
        .insert({ ...baseRow, price_tiers: data.price_tiers })
        .select()
        .single();

      if (error && isPriceTiersMissingError(error)) {
        // Fallback: legacy schema without price_tiers column
        ({ data: created, error } = await catalogTable()
          .insert(baseRow)
          .select()
          .single());
      }

      if (error) throw error;
      return created as unknown as ProductCatalogItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product_catalog'] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: ProductFormValues;
    }) => {
      const defaultPrice = data.price_tiers[0]?.price ?? 0;
      const baseUpdate = {
        name:          data.name,
        sku:           data.sku || null,
        selling_price: defaultPrice,
        unit_cost:     data.unit_cost,
        unit:          data.unit,
        category:      data.category,
        is_active:     data.is_active,
      };

      let { error } = await catalogTable()
        .update({ ...baseUpdate, price_tiers: data.price_tiers })
        .eq('id', id);

      if (error && isPriceTiersMissingError(error)) {
        ({ error } = await catalogTable().update(baseUpdate).eq('id', id));
      }

      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product_catalog'] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await catalogTable().delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product_catalog'] }),
  });
}

export function useReorderProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, idx) =>
        catalogTable().update({ sort_order: idx }).eq('id', id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product_catalog'] }),
  });
}
