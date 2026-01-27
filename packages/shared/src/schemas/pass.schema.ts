import { z } from 'zod';

export const productTypeSchema = z.enum([
  'PT_SESSION',
  'CLASS_PACK',
  'MERCHANDISE',
  'DROP_IN',
  'OTHER',
]);

export const memberPassStatusSchema = z.enum([
  'ACTIVE',
  'EXPIRED',
  'DEPLETED',
  'CANCELLED',
]);

export const createPassProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  description: z.string().max(500).nullable().optional(),
  priceAmount: z.coerce.number().min(0, 'Price must be positive'),
  type: z.enum(['CLASS_PACK', 'DROP_IN']),
  classCredits: z.coerce.number().int().min(1, 'Credits must be at least 1'),
  validityDays: z.coerce.number().int().min(1).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const updatePassProductSchema = createPassProductSchema.partial();

export const assignPassSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  notes: z.string().max(500).optional(),
});

export const checkInWithPassSchema = z.object({
  memberPassId: z.string().optional(),
  isOverride: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export const checkOutSchema = z.object({
  notes: z.string().max(500).optional(),
});

export type ProductType = z.infer<typeof productTypeSchema>;
export type MemberPassStatus = z.infer<typeof memberPassStatusSchema>;
export type CreatePassProductInput = z.infer<typeof createPassProductSchema>;
export type UpdatePassProductInput = z.infer<typeof updatePassProductSchema>;
export type AssignPassInput = z.infer<typeof assignPassSchema>;
export type CheckInWithPassInput = z.infer<typeof checkInWithPassSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
