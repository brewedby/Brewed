import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DiscoveredEvent } from '@/types';

export interface DiscoverFilters {
  query?: string;
  region?: string;
  category?: string;
}

export function useDiscoverEvents(filters: DiscoverFilters, enabled: boolean) {
  return useQuery({
    queryKey: ['discover', filters],
    queryFn: async (): Promise<DiscoveredEvent[]> => {
      const { data, error } = await supabase.functions.invoke('discover-events', {
        body: {
          query: filters.query,
          region: filters.region,
          category: filters.category,
        },
      });

      if (error) throw error;
      return data?.results ?? [];
    },
    enabled,
    staleTime: 1000 * 60 * 10, // cache for 10 minutes
    retry: 1,
  });
}
