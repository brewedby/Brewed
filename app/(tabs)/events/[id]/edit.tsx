import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EventForm } from '@/components/events/EventForm';
import { useEvent } from '@/lib/queries/events';
import { useUpdateEvent } from '@/lib/mutations/events';
import { useCompanies } from '@/lib/queries/companies';
import { useUnits } from '@/lib/queries/units';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import type { EventFormValues } from '@/lib/validations/event.schema';

export default function EditEventScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
    unit_id: event.unit_id ?? '',
    overnight_stay: event.overnight_stay ?? false,
    documents_uploaded: event.documents_uploaded ?? false,
    application_url: event.application_url ?? '',
    gross_sales: fin?.gross_sales ?? 0,
    zero_rated_sales: fin?.zero_rated_sales ?? 0,
    standard_rated_sales: fin?.standard_rated_sales ?? 0,
    concessions_commission_pct: fin?.concessions_commission_pct ?? 0,
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
    staffing_entries: (event.staffing_entries ?? []).map((e) => ({
      id: e.id, staff_name: e.staff_name, hours_worked: e.hours_worked, hourly_rate: e.hourly_rate,
    })),
    infrastructure_items: (event.infrastructure_items ?? []).map((i) => ({
      id: i.id, description: i.description, category: i.category, cost: i.cost,
    })),
  };

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-stone-100">
        <Text className="text-lg font-bold text-stone-900" numberOfLines={1}>Edit: {event.name}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-stone-500">Cancel</Text>
        </TouchableOpacity>
      </View>
      <EventForm
        defaultValues={defaultValues}
        companies={companies}
        units={units}
        onSubmit={(data) => updateEvent.mutateAsync({ id, data })}
        submitLabel="Save Changes"
      />
    </View>
  );
}
