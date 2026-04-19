import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { EventDocument } from '@/types';

export function useDocuments(eventId: string) {
  return useQuery({
    queryKey: ['documents', eventId],
    queryFn: async (): Promise<EventDocument[]> => {
      const { data, error } = await supabase
        .from('event_documents')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!eventId,
  });
}
