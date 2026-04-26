import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcStaffingTotal } from '@/lib/calculations';
import type { EventFormValues } from '@/lib/validations/event.schema';

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, userId }: { data: EventFormValues; userId: string }) => {
      // 1. Create the event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          user_id: userId,
          name: data.name,
          date: data.date,
          end_date: data.end_date || null,
          location: data.location,
          description: data.description || null,
          application_date: data.application_date || null,
          status: data.status,
          notes: data.notes || null,
          company_id: data.company_id || null,
          overnight_stay: data.overnight_stay ?? false,
          documents_uploaded: data.documents_uploaded ?? false,
          application_url: data.application_url || null,
        })
        .select()
        .single();
      if (eventError) throw eventError;

      // 2. Calculate staffing total from entries if provided
      const staffingTotal =
        data.staffing_entries.length > 0
          ? calcStaffingTotal(data.staffing_entries.map((e) => ({ ...e, id: '', event_id: event.id, created_at: '', updated_at: '' })))
          : data.staffing_costs;

      // 3. Create financials
      const zeroRated = data.zero_rated_sales ?? 0;
      const standardRated = data.standard_rated_sales ?? 0;
      const { error: finError } = await supabase.from('event_financials').insert({
        event_id: event.id,
        gross_sales: (zeroRated + standardRated) || data.gross_sales || 0,
        zero_rated_sales: zeroRated,
        standard_rated_sales: standardRated,
        concessions_commission_pct: data.concessions_commission_pct ?? 0,
        pitch_fee_refund_pct: data.pitch_fee_refund_pct ?? 0,
        cost_of_goods: data.cost_of_goods,
        pitch_fee: data.pitch_fee,
        power_fee: data.power_fee ?? 0,
        travel_costs: data.travel_costs,
        camping_costs: data.camping_costs ?? 0,
        equipment_costs: data.equipment_costs,
        other_costs: data.other_costs,
        staffing_costs: staffingTotal,
        fresh_milk_litres: data.fresh_milk_litres ?? 0,
        alt_milk_litres: data.alt_milk_litres ?? 0,
        miles_driven: data.miles_driven ?? 0,
      });
      if (finError) throw finError;

      // 4. Create unit assignments
      if (data.unit_ids.length > 0) {
        const { error: unitError } = await supabase.from('event_units').insert(
          data.unit_ids.map((uid) => ({ event_id: event.id, unit_id: uid }))
        );
        if (unitError) throw unitError;
      }

      // 5. Create staffing entries
      if (data.staffing_entries.length > 0) {
        const { error: staffError } = await supabase.from('staffing_entries').insert(
          data.staffing_entries.map((e) => ({
            event_id: event.id,
            staff_name: e.staff_name,
            hours_worked: e.hours_worked,
            hourly_rate: e.hourly_rate,
          }))
        );
        if (staffError) throw staffError;
      }

      // 6. Create infrastructure items
      if (data.infrastructure_items.length > 0) {
        const { error: infraError } = await supabase.from('infrastructure_items').insert(
          data.infrastructure_items.map((item) => ({
            event_id: event.id,
            description: item.description,
            category: item.category,
            cost: item.cost,
          }))
        );
        if (infraError) throw infraError;
      }

      return event;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['units'] });
    },
  });
}

// Fields on the event row itself that are safe to optimistically merge into
// cached lists without recomputing derived data.
const EVENT_ROW_FIELDS = [
  'name', 'date', 'end_date', 'location', 'description', 'application_date',
  'status', 'notes', 'company_id', 'overnight_stay', 'documents_uploaded', 'application_url',
] as const;

function pickEventRowFields(data: EventFormValues): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of EVENT_ROW_FIELDS) {
    if (key in data) out[key] = data[key];
  }
  return out;
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    onMutate: async ({ id, data }: { id: string; data: EventFormValues }) => {
      await qc.cancelQueries({ queryKey: ['events'] });
      const patch = pickEventRowFields(data);
      const snapshots = qc.getQueriesData<unknown>({ queryKey: ['events'] });
      snapshots.forEach(([key, value]) => {
        if (Array.isArray(value)) {
          qc.setQueryData(key, value.map((e: Record<string, unknown>) => (e?.id === id ? { ...e, ...patch } : e)));
        } else if (value && typeof value === 'object' && 'id' in value && (value as Record<string, unknown>).id === id) {
          qc.setQueryData(key, { ...(value as Record<string, unknown>), ...patch });
        }
      });
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      context?.snapshots?.forEach(([key, value]) => {
        qc.setQueryData(key, value);
      });
    },
    mutationFn: async ({ id, data }: { id: string; data: EventFormValues }) => {
      // 1. Update event
      const { error: eventError } = await supabase
        .from('events')
        .update({
          name: data.name,
          date: data.date,
          end_date: data.end_date || null,
          location: data.location,
          description: data.description || null,
          application_date: data.application_date || null,
          status: data.status,
          notes: data.notes || null,
          company_id: data.company_id || null,
          overnight_stay: data.overnight_stay ?? false,
          documents_uploaded: data.documents_uploaded ?? false,
          application_url: data.application_url || null,
          url_changed: false,
        })
        .eq('id', id);
      if (eventError) throw eventError;

      const staffingTotal =
        data.staffing_entries.length > 0
          ? calcStaffingTotal(data.staffing_entries.map((e) => ({ ...e, id: e.id ?? '', event_id: id, created_at: '', updated_at: '' })))
          : data.staffing_costs;

      const zeroRated = data.zero_rated_sales ?? 0;
      const standardRated = data.standard_rated_sales ?? 0;

      // 2. Upsert financials
      const { error: finError } = await supabase
        .from('event_financials')
        .upsert({
          event_id: id,
          gross_sales: (zeroRated + standardRated) || data.gross_sales || 0,
          zero_rated_sales: zeroRated,
          standard_rated_sales: standardRated,
          concessions_commission_pct: data.concessions_commission_pct ?? 0,
          pitch_fee_refund_pct: data.pitch_fee_refund_pct ?? 0,
          cost_of_goods: data.cost_of_goods,
          pitch_fee: data.pitch_fee,
          power_fee: data.power_fee ?? 0,
          travel_costs: data.travel_costs,
          camping_costs: data.camping_costs ?? 0,
          equipment_costs: data.equipment_costs,
          other_costs: data.other_costs,
          staffing_costs: staffingTotal,
          fresh_milk_litres: data.fresh_milk_litres ?? 0,
          alt_milk_litres: data.alt_milk_litres ?? 0,
          miles_driven: data.miles_driven ?? 0,
        }, { onConflict: 'event_id' });
      if (finError) throw finError;

      // 3. Replace unit assignments
      await supabase.from('event_units').delete().eq('event_id', id);
      if (data.unit_ids.length > 0) {
        const { error: unitError } = await supabase.from('event_units').insert(
          data.unit_ids.map((uid) => ({ event_id: id, unit_id: uid }))
        );
        if (unitError) throw unitError;
      }

      // 4. Replace staffing entries
      await supabase.from('staffing_entries').delete().eq('event_id', id);
      if (data.staffing_entries.length > 0) {
        const { error: staffError } = await supabase.from('staffing_entries').insert(
          data.staffing_entries.map((e) => ({
            event_id: id, staff_name: e.staff_name, hours_worked: e.hours_worked, hourly_rate: e.hourly_rate,
          }))
        );
        if (staffError) throw staffError;
      }

      // 5. Replace infrastructure items
      await supabase.from('infrastructure_items').delete().eq('event_id', id);
      if (data.infrastructure_items.length > 0) {
        const { error: infraError } = await supabase.from('infrastructure_items').insert(
          data.infrastructure_items.map((item) => ({
            event_id: id, description: item.description, category: item.category, cost: item.cost,
          }))
        );
        if (infraError) throw infraError;
      }
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['events', id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['units'] });
    },
  });
}

export function useLogSales() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, grossSales }: { eventId: string; grossSales: number }) => {
      const { error } = await supabase
        .from('event_financials')
        .upsert({ event_id: eventId, gross_sales: grossSales }, { onConflict: 'event_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
