import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { UnitFormValues } from '@/lib/validations/unit.schema';

export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, userId }: { data: UnitFormValues; userId: string }) => {
      const { data: unit, error } = await supabase
        .from('units')
        .insert({
          user_id: userId,
          name: data.name,
          registration: data.registration || null,
          notes: data.notes || null,
          status: data.status ?? 'active',
        })
        .select()
        .single();
      if (error) throw error;
      return unit;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UnitFormValues }) => {
      const { error } = await supabase
        .from('units')
        .update({
          name: data.name,
          registration: data.registration || null,
          notes: data.notes || null,
          status: data.status,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['units'] });
      qc.invalidateQueries({ queryKey: ['units', id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
