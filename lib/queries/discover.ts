import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DiscoveredEvent } from '@/types';

export interface DiscoverFilters {
  query?: string;
  region?: string;
  category?: string;
}

export function useDiscoverEvents(filters: DiscoverFilters) {
  return useQuery({
    queryKey: ['discover', filters],
    queryFn: async (): Promise<DiscoveredEvent[]> => {
      let query = supabase
        .from('uk_events_directory')
        .select('*')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: true });

      if (filters.region && filters.region !== 'All UK') {
        query = query.eq('region', filters.region);
      }
      if (filters.category && filters.category !== 'All') {
        query = query.eq('category', filters.category);
      }
      if (filters.query) {
        query = query.or(
          `name.ilike.%${filters.query}%,description.ilike.%${filters.query}%,organiser.ilike.%${filters.query}%,location.ilike.%${filters.query}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      const COMPANY_CATEGORIES = ['Concessions Company', 'Industry Body'];
      return (data ?? []).map((row) => ({
        id: row.id,
        title: row.name,
        description: row.description ?? '',
        url: row.application_url ?? row.website ?? '',
        source: row.organiser ?? row.source ?? 'UK Events Directory',
        location: row.location,
        dateHint: row.typical_dates ?? (row.next_date ? row.next_date : null),
        category: row.category ?? 'Event',
        region: row.region,
        organiser: row.organiser,
        estimatedFootfall: row.estimated_footfall,
        pitchFeeRange: row.pitch_fee_range,
        featured: row.featured ?? false,
        eventsManaged: (row as any).events_managed ?? null,
        contactPhone: (row as any).contact_phone ?? null,
        contactEmail: (row as any).contact_email ?? null,
        lastVerifiedAt: (row as any).last_verified_at ?? null,
        applicationChanged: (row as any).application_changed ?? false,
        isCompany: COMPANY_CATEGORIES.includes(row.category ?? ''),
      }));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
