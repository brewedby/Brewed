import { z } from 'zod';

export const unitSchema = z.object({
  name: z.string().min(1, 'Unit name is required'),
  registration: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'maintenance', 'retired'] as const).default('active'),
});

export type UnitFormValues = z.infer<typeof unitSchema>;
