import { z } from 'zod';

/** Longest believable single event for a mobile trader (a full month). */
export const MAX_EVENT_SPAN_DAYS = 31;

/** Form date fields hold ISO yyyy-MM-dd (from the picker) or dd/mm/yyyy
 *  (typed UK format, converted at submit). Parse both; NaN otherwise. */
function parseFormDate(val: string): Date {
  const uk = val.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = uk
    ? `${uk[3]}-${uk[2].padStart(2, '0')}-${uk[1].padStart(2, '0')}`
    : val.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date(NaN);
  return new Date(`${iso}T00:00:00Z`);
}

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
  unit_ids: z.array(z.string()).default([]),
  application_url: z.string().optional(),
  overnight_stay: z.boolean().default(false),
  documents_uploaded: z.boolean().default(false),

  // Sales & VAT
  gross_sales: z.coerce.number().min(0),
  zero_rated_sales: z.coerce.number().min(0),
  standard_rated_sales: z.coerce.number().min(0),
  concessions_commission_pct: z.coerce.number().min(0).max(100),
  commission_basis: z.enum(['net', 'gross']).default('net'),
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

  // Mileage
  miles_driven: z.coerce.number().min(0).default(0),

  // Arrays
  staffing_entries: z.array(staffingEntrySchema).default([]),
  infrastructure_items: z.array(infrastructureItemSchema).default([]),
}).superRefine((values, ctx) => {
  // End date must be a real date, on/after the start date, and within a
  // sane event span. Unvalidated end dates previously reached the DB and
  // made day-per-row sections expand a typo'd range into thousands of
  // rows, force-closing the event screen (the LIV Golf crash).
  if (!values.end_date) return;

  const start = parseFormDate(values.date);
  const end = parseFormDate(values.end_date);

  if (Number.isNaN(end.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['end_date'],
      message: 'End date is not a valid date',
    });
    return;
  }
  if (Number.isNaN(start.getTime())) return; // date field has its own error

  if (end.getTime() < start.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['end_date'],
      message: 'End date must be on or after the start date',
    });
    return;
  }

  const spanDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (spanDays > MAX_EVENT_SPAN_DAYS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['end_date'],
      message: `Events can span at most ${MAX_EVENT_SPAN_DAYS} days — check the end date year`,
    });
  }
});

export type EventFormValues = z.infer<typeof eventSchema>;
