import { z } from 'zod';
import { UNIT_STATUSES } from '@/constants';

export const unitSchema = z.object({
  name: z.string().min(1, 'Unit name is required'),
  registration: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(UNIT_STATUSES as [string, ...string[]]).default('active'),
});

export type UnitFormValues = z.infer<typeof unitSchema>;
