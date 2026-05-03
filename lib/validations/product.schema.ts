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
  // Category is a free string keyed against CATEGORY_DEFINITIONS so trade
  // types can introduce their own categories. Validated for length only.
  category:    z.string().min(1, 'Category is required').max(40),
  // Per-product VAT override. null/undefined = use the category default
  // (CATEGORY_DEFINITIONS[category].vatable).
  is_vatable:  z.boolean().nullable().optional(),
  is_active:   z.boolean().default(true),
});

export type ProductFormValues = z.infer<typeof productSchema>;
