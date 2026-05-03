import { z } from 'zod';

export const priceTierSchema = z.object({
  label: z.string().min(1, 'Label required').max(40),
  price: z.coerce.number().min(0, 'Price must be 0 or greater').max(9999),
});

export const productSchema = z.object({
  name:        z.string().min(1, 'Product name is required').max(120),
  sku:         z.string().max(80).optional().or(z.literal('')),
  price_tiers: z.array(priceTierSchema).min(1, 'At least one price is required'),
  unit_cost:   z.coerce.number().min(0, 'Cost must be 0 or greater').max(9999),
  unit:        z.string().min(1, 'Unit is required'),
  category:    z.enum(['hot_drinks', 'cold_drinks', 'specials', 'food', 'other'] as const),
  is_active:   z.boolean().default(true),
});

export type ProductFormValues = z.infer<typeof productSchema>;
