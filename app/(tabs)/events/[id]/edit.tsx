import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/lib/themeContext';
import { EventForm } from '@/components/events/EventForm';
import { useEvent } from '@/lib/queries/events';
import { useUpdateEvent } from '@/lib/mutations/events';
import { useCompanies } from '@/lib/queries/companies';
import { useUnits } from '@/lib/queries/units';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import type { EventFormValues } from '@/lib/validations/event.schema';

export default function EditEventScreen() {
  const insets = useSafeAreaInsets();
  // Modal screens use router.back() — the trail gets carried via the URL but
  // doesn't drive cancel behaviour: dismissing always returns to the parent
  // event detail. We still accept it so deep-links / refresh preserve context.
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tokens } = useTheme();
  const p = tokens.palette;
  const { data: event, isLoading } = useEvent(id);
  const updateEvent = useUpdateEvent();
  const { data: companies = [] } = useCompanies();
  const { data: units = [] } = useUnits();

  if (isLoading) return <LoadingSpinner message="Loading event..." />;
  if (!event) return null;

  const fin = event.event_financials;
  const defaultValues: Partial<EventFormValues> = {
    name: event.name,
    date: event.date,
    end_date: event.end_date ?? '',
    location: event.location,
    description: event.description ?? '',
    application_date: event.application_date ?? '',
    status: event.status,
    notes: event.notes ?? '',
    company_id: event.company_id ?? '',
    unit_ids: (event.units ?? []).map((u) => u.id),
    overnight_stay: event.overnight_stay ?? false,
    documents_uploaded: event.documents_uploaded ?? false,
    application_url: event.application_url ?? '',
    gross_sales: fin?.gross_sales ?? 0,
    zero_rated_sales: fin?.zero_rated_sales ?? 0,
    standard_rated_sales: fin?.standard_rated_sales ?? 0,
    concessions_commission_pct: fin?.concessions_commission_pct ?? 0,
    commission_basis: (fin?.commission_basis ?? 'net') === 'gross' ? 'gross' : 'net',
    pitch_fee_refund_pct: fin?.pitch_fee_refund_pct ?? 0,
    cost_of_goods: fin?.cost_of_goods ?? 0,
    pitch_fee: fin?.pitch_fee ?? 0,
    power_fee: fin?.power_fee ?? 0,
    travel_costs: fin?.travel_costs ?? 0,
    camping_costs: fin?.camping_costs ?? 0,
    equipment_costs: fin?.equipment_costs ?? 0,
    other_costs: fin?.other_costs ?? 0,
    staffing_costs: fin?.staffing_costs ?? 0,
    fresh_milk_litres: fin?.fresh_milk_litres ?? 0,
    alt_milk_litres: fin?.alt_milk_litres ?? 0,
    miles_driven: fin?.miles_driven ?? 0,
    staffing_entries: (event.staffing_entries ?? []).map((e) => ({
      id: e.id, staff_name: e.staff_name, hours_worked: e.hours_worked, hourly_rate: e.hourly_rate,
    })),
    infrastructure_items: (event.infrastructure_items ?? []).map((i) => ({
      id: i.id, description: i.description, category: i.category, cost: i.cost,
    })),
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: p.text }}>
        <Text style={{ fontFamily: tokens.type.display, fontSize: 22, letterSpacing: -0.5, color: p.text, flex: 1, marginRight: 12 }} numberOfLines={1}>Edit: {event.name}</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 16, right: 8 }}>
          <Text style={{ fontSize: 13, color: p.brand, fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
      <EventForm
        defaultValues={defaultValues}
        companies={companies}
        units={units}
        onSubmit={async (data) => {
          await updateEvent.mutateAsync({ id, data });
          router.back();
        }}
        submitLabel="Save Changes"
        eventId={id}
      />
    </View>
  );
}
