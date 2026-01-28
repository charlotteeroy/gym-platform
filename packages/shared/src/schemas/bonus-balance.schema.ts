import { z } from 'zod';

export const bonusBalanceTxnTypeSchema = z.enum([
  'PASS_PURCHASE',
  'CLASS_ATTENDED',
  'PURCHASE_APPLIED',
  'MANUAL_ADJUSTMENT',
  'PROMO_BONUS',
]);

export const adjustBonusBalanceSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
  direction: z.enum(['add', 'remove']),
});

export type BonusBalanceTxnType = z.infer<typeof bonusBalanceTxnTypeSchema>;
export type AdjustBonusBalanceInput = z.infer<typeof adjustBonusBalanceSchema>;
