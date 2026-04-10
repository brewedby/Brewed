import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Unit } from '@/types';

export function useUnits() {
  return useQuery({
    queryKey: ['units'],
    queryFn: async (): Promise<Unit[]> => {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUnit(id: string) {
  return useQuery({
    queryKey: ['units', id],
    queryFn: async (): Promise<Unit> => {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('units').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
