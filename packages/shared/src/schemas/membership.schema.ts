import { z } from 'zod';

export const billingIntervalSchema = z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']);
export const subscriptionStatusSchema = z.enum([
  'ACTIVE',
  'PAST_DUE',
  'PAUSED',
  'CANCELLED',
  'EXPIRED',
]);

export const createMembershipPlanSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  description: z.string().max(500).nullable().optional(),
  priceAmount: z.coerce.number().min(0, 'Price must be positive'),
  priceCurrency: z.string().length(3).default('USD'),
  billingInterval: billingIntervalSchema,
  classCredits: z.coerce.number().int().min(-1).default(-1), // -1 = unlimited
  guestPasses: z.coerce.number().int().min(0).default(0),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export const updateMembershipPlanSchema = createMembershipPlanSchema.partial();

export const assignSubscriptionSchema = z.object({
  memberId: z.string().cuid('Invalid member ID'),
  planId: z.string().cuid('Invalid plan ID'),
  startDate: z.coerce.date().optional(),
});

export type BillingInterval = z.infer<typeof billingIntervalSchema>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
export type CreateMembershipPlanInput = z.infer<typeof createMembershipPlanSchema>;
export type UpdateMembershipPlanInput = z.infer<typeof updateMembershipPlanSchema>;
export type AssignSubscriptionInput = z.infer<typeof assignSubscriptionSchema>;

// Billing interval to days mapping
export const BILLING_INTERVAL_DAYS: Record<BillingInterval, number> = {
  WEEKLY: 7,
  MONTHLY: 30,
  QUARTERLY: 90,
  YEARLY: 365,
};
