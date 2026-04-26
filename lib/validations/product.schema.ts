import { z } from 'zod';

export const productSchema = z.object({
  name:          z.string().min(1, 'Product name is required').max(120),
  sku:           z.string().max(80).optional().or(z.literal('')),
  selling_price: z.coerce.number().min(0, 'Price must be 0 or greater').max(9999),
  unit_cost:     z.coerce.number().min(0, 'Cost must be 0 or greater').max(9999),
  unit:          z.string().min(1, 'Unit is required'),
  category:      z.enum(['hot_drinks', 'cold_drinks', 'food', 'other'] as const),
  is_active:     z.boolean().default(true),
});

export type ProductFormValues = z.infer<typeof productSchema>;
