import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CompanyFormValues } from '@/lib/validations/company.schema';

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, userId }: { data: CompanyFormValues; userId: string }) => {
      const { data: company, error } = await supabase
        .from('concessions_companies')
        .insert({
          user_id: userId,
          name: data.name,
          contact_name: data.contact_name || null,
          email: data.email || null,
          phone: data.phone || null,
          website: data.website || null,
          notes: data.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return company;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CompanyFormValues }) => {
      const { error } = await supabase
        .from('concessions_companies')
        .update({
          name: data.name,
          contact_name: data.contact_name || null,
          email: data.email || null,
          phone: data.phone || null,
          website: data.website || null,
          notes: data.notes || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['companies', id] });
    },
  });
}
