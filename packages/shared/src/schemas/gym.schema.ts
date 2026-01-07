import { z } from 'zod';

export const slugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(50, 'Slug must be less than 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
  .toLowerCase()
  .trim();

export const timezoneSchema = z.string().default('UTC');

export const currencySchema = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD']).default('USD');

export const createGymSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  slug: slugSchema,
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  phone: z.string().optional(),
  address: z.string().optional(),
  timezone: timezoneSchema,
  currency: currencySchema,
});

export const updateGymSchema = createGymSchema.partial();

export type CreateGymInput = z.infer<typeof createGymSchema>;
export type UpdateGymInput = z.infer<typeof updateGymSchema>;
