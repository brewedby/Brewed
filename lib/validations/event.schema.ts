import { z } from 'zod';

const staffingEntrySchema = z.object({
  id: z.string().optional(),
  staff_name: z.string().min(1, 'Name required'),
  hours_worked: z.coerce.number().min(0),
  hourly_rate: z.coerce.number().min(0),
});

const infrastructureItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Description required'),
  category: z.enum(['pitch_fee', 'travel', 'equipment', 'supplies', 'other'] as const),
  cost: z.coerce.number().min(0),
});

export const eventSchema = z.object({
  // Core details
  name: z.string().min(2, 'Event name must be at least 2 characters'),
  date: z.string().min(1, 'Date is required'),
  end_date: z.string().optional(),
  location: z.string().min(2, 'Location is required'),
  description: z.string().optional(),
  application_date: z.string().optional(),
  status: z.enum(['pending', 'accepted', 'rejected', 'waitlisted', 'withdrawn'] as const),
  notes: z.string().optional(),
  company_id: z.string().optional(),
  unit_id: z.string().optional(),
  application_url: z.string().optional(),
  overnight_stay: z.boolean().default(false),
  documents_uploaded: z.boolean().default(false),

  // Sales & VAT
  gross_sales: z.coerce.number().min(0),
  zero_rated_sales: z.coerce.number().min(0),
  standard_rated_sales: z.coerce.number().min(0),
  concessions_commission_pct: z.coerce.number().min(0).max(100),
  pitch_fee_refund_pct: z.coerce.number().min(0).max(100),

  // Costs
  cost_of_goods: z.coerce.number().min(0),
  pitch_fee: z.coerce.number().min(0),
  power_fee: z.coerce.number().min(0),
  travel_costs: z.coerce.number().min(0),
  camping_costs: z.coerce.number().min(0),
  equipment_costs: z.coerce.number().min(0),
  other_costs: z.coerce.number().min(0),
  staffing_costs: z.coerce.number().min(0),

  // Milk / consumables
  fresh_milk_litres: z.coerce.number().min(0),
  alt_milk_litres: z.coerce.number().min(0),

  // Arrays
  staffing_entries: z.array(staffingEntrySchema).default([]),
  infrastructure_items: z.array(infrastructureItemSchema).default([]),
});

export type EventFormValues = z.infer<typeof eventSchema>;
