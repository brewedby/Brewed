import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ProductFormValues } from '@/lib/validations/product.schema';
import type { ProductCatalogItem } from '@/types/cogs';

// Postgres "column does not exist" surfaces as code 42703 / a message
// containing the column name. If the user has not yet applied the
// matching migration we degrade gracefully so the action keeps working
// against the legacy schema.
function isMissingColumnError(err: unknown, column: string): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  if (e.code === '42703') return true;
  return typeof e.message === 'string' && new RegExp(column, 'i').test(e.message);
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
      const fullRow = {
        ...baseRow,
        price_tiers: data.price_tiers,
        is_vatable:  data.is_vatable ?? null,
      };

      let { data: created, error } = await supabase
        .from('product_catalog')
        .insert(fullRow)
        .select()
        .single();

      // Fall back through missing columns one at a time so partial
      // migrations still work.
      if (error && isMissingColumnError(error, 'is_vatable')) {
        ({ data: created, error } = await supabase
          .from('product_catalog')
          // is_vatable column missing — drop it from the insert
          .insert({ ...baseRow, price_tiers: data.price_tiers } as typeof fullRow)
          .select()
          .single());
      }
      if (error && isMissingColumnError(error, 'price_tiers')) {
        ({ data: created, error } = await supabase
          .from('product_catalog')
          .insert(baseRow as typeof fullRow)
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
      const fullUpdate = {
        ...baseUpdate,
        price_tiers: data.price_tiers,
        is_vatable:  data.is_vatable ?? null,
      };

      let { error } = await supabase
        .from('product_catalog')
        .update(fullUpdate)
        .eq('id', id);

      if (error && isMissingColumnError(error, 'is_vatable')) {
        ({ error } = await supabase
          .from('product_catalog')
          .update({ ...baseUpdate, price_tiers: data.price_tiers } as typeof fullUpdate)
          .eq('id', id));
      }
      if (error && isMissingColumnError(error, 'price_tiers')) {
        ({ error } = await supabase
          .from('product_catalog')
          .update(baseUpdate as typeof fullUpdate)
          .eq('id', id));
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
      const { error } = await supabase.from('product_catalog').delete().eq('id', id);
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
        supabase.from('product_catalog').update({ sort_order: idx }).eq('id', id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product_catalog'] }),
  });
}
