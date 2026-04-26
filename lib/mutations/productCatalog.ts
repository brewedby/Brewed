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
      const { data: created, error } = await catalogTable()
        .insert({
          user_id:   userId,
          name:      data.name,
          sku:       data.sku || null,
          unit_cost: data.unit_cost,
          unit:      data.unit,
          category:  data.category,
          is_active: data.is_active,
        })
        .select()
        .single();
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
      const { error } = await catalogTable()
        .update({
          name:      data.name,
          sku:       data.sku || null,
          unit_cost: data.unit_cost,
          unit:      data.unit,
          category:  data.category,
          is_active: data.is_active,
        })
        .eq('id', id);
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
