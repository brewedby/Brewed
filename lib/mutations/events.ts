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
          status: data.status as any,
          notes: data.notes || null,
          company_id: data.company_id || null,
        })
        .select()
        .single();
      if (eventError) throw eventError;

      // 2. Calculate staffing total from entries if provided
      const staffingTotal =
        data.staffing_entries.length > 0
          ? calcStaffingTotal(
              data.staffing_entries.map((e) => ({
                ...e,
                id: '',
                event_id: event.id,
                created_at: '',
                updated_at: '',
              }))
            )
          : data.staffing_costs;

      // 3. Create financials
      const { error: finError } = await supabase.from('event_financials').insert({
        event_id: event.id,
        gross_sales: data.gross_sales,
        cost_of_goods: data.cost_of_goods,
        pitch_fee: data.pitch_fee,
        travel_costs: data.travel_costs,
        equipment_costs: data.equipment_costs,
        other_costs: data.other_costs,
        staffing_costs: staffingTotal,
      });
      if (finError) throw finError;

      // 4. Create staffing entries
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

      // 5. Create infrastructure items
      if (data.infrastructure_items.length > 0) {
        const { error: infraError } = await supabase.from('infrastructure_items').insert(
          data.infrastructure_items.map((item) => ({
            event_id: event.id,
            description: item.description,
            category: item.category as any,
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
    },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
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
          status: data.status as any,
          notes: data.notes || null,
          company_id: data.company_id || null,
        })
        .eq('id', id);
      if (eventError) throw eventError;

      const staffingTotal =
        data.staffing_entries.length > 0
          ? calcStaffingTotal(
              data.staffing_entries.map((e) => ({
                ...e,
                id: e.id ?? '',
                event_id: id,
                created_at: '',
                updated_at: '',
              }))
            )
          : data.staffing_costs;

      // 2. Upsert financials
      const { error: finError } = await supabase
        .from('event_financials')
        .upsert({
          event_id: id,
          gross_sales: data.gross_sales,
          cost_of_goods: data.cost_of_goods,
          pitch_fee: data.pitch_fee,
          travel_costs: data.travel_costs,
          equipment_costs: data.equipment_costs,
          other_costs: data.other_costs,
          staffing_costs: staffingTotal,
        }, { onConflict: 'event_id' });
      if (finError) throw finError;

      // 3. Replace staffing entries (delete then re-insert)
      await supabase.from('staffing_entries').delete().eq('event_id', id);
      if (data.staffing_entries.length > 0) {
        const { error: staffError } = await supabase.from('staffing_entries').insert(
          data.staffing_entries.map((e) => ({
            event_id: id,
            staff_name: e.staff_name,
            hours_worked: e.hours_worked,
            hourly_rate: e.hourly_rate,
          }))
        );
        if (staffError) throw staffError;
      }

      // 4. Replace infrastructure items
      await supabase.from('infrastructure_items').delete().eq('event_id', id);
      if (data.infrastructure_items.length > 0) {
        const { error: infraError } = await supabase.from('infrastructure_items').insert(
          data.infrastructure_items.map((item) => ({
            event_id: id,
            description: item.description,
            category: item.category as any,
            cost: item.cost,
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
    },
  });
}
