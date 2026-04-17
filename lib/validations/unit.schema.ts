import { z } from 'zod';

export const unitSchema = z.object({
  name: z.string().min(1, 'Unit name is required'),
  registration: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'maintenance', 'retired'] as const).default('active'),
  vehicle_type: z.string().optional(),
  mot_date: z.string().optional(),
  tax_date: z.string().optional(),
  service_date: z.string().optional(),
  service_interval: z.enum(['6months', '1year']).default('1year'),
});

export type UnitFormValues = z.infer<typeof unitSchema>;
