import { z } from 'zod';

// Accept domain or full URL; normalised to https:// at parse time.
// Examples accepted: "example.com", "www.example.com", "http://example.com",
// "https://example.com", "https://example.com/apply".
const websiteSchema = z
  .string()
  .optional()
  .transform((v) => {
    if (!v) return '';
    const s = v.trim();
    if (!s) return '';
    // strip leading "//" or "http://" / "https://" then re-prefix https://
    const stripped = s.replace(/^https?:\/\//i, '').replace(/^\/\//, '');
    return `https://${stripped}`;
  })
  .refine((v) => v === '' || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v), {
    message: 'Enter a valid website (e.g. example.com)',
  });

export const companySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  contact_name: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: websiteSchema,
  notes: z.string().optional(),
});

export type CompanyFormValues = z.infer<typeof companySchema>;
