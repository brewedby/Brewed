import { z } from 'zod';
import { STATUSES, INFRASTRUCTURE_CATEGORIES } from '@/constants';

const staffingEntrySchema = z.object({
  id: z.string().optional(),
  staff_name: z.string().min(1, 'Name required'),
  hours_worked: z.coerce.number().min(0, 'Must be 0 or more'),
  hourly_rate: z.coerce.number().min(0, 'Must be 0 or more'),
});

const infrastructureItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Description required'),
  category: z.enum(INFRASTRUCTURE_CATEGORIES as [string, ...string[]]),
  cost: z.coerce.number().min(0, 'Must be 0 or more'),
});

export const eventSchema = z.object({
  name: z.string().min(2, 'Event name must be at least 2 characters'),
  date: z.string().min(1, 'Date is required'),
  end_date: z.string().optional(),
  location: z.string().min(2, 'Location is required'),
  description: z.string().optional(),
  application_date: z.string().optional(),
  status: z.enum(STATUSES as [string, ...string[]]),
  notes: z.string().optional(),
  company_id: z.string().optional(),
  application_url: z.string().optional(),
  gross_sales: z.coerce.number().min(0),
  zero_rated_sales: z.coerce.number().min(0),
  standard_rated_sales: z.coerce.number().min(0),
  concessions_commission_pct: z.coerce.number().min(0).max(100),
  pitch_fee_refund_pct: z.coerce.number().min(0).max(100),
  cost_of_goods: z.coerce.number().min(0),
  pitch_fee: z.coerce.number().min(0),
  travel_costs: z.coerce.number().min(0),
  equipment_costs: z.coerce.number().min(0),
  other_costs: z.coerce.number().min(0),
  staffing_costs: z.coerce.number().min(0),
  staffing_entries: z.array(staffingEntrySchema).default([]),
  infrastructure_items: z.array(infrastructureItemSchema).default([]),
});

export type EventFormValues = z.infer<typeof eventSchema>;
