import { prisma } from '@gym/database';
import type { BonusBalanceTxnType } from '@gym/database';

const ERROR_CODES = {
  NOT_FOUND: 'NOT_FOUND',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
} as const;

export type BonusBalanceResult =
  | { success: true; balance: number; transactionId?: string }
  | { success: false; error: { code: string; message: string } };

/**
 * Get or lazily create a BonusBalance record for a member.
 */
export async function getOrCreateBonusBalance(memberId: string, gymId: string) {
  let record = await prisma.bonusBalance.findUnique({ where: { memberId } });
  if (!record) {
    record = await prisma.bonusBalance.create({
      data: { memberId, gymId, currentBalance: 0 },
    });
  }
  return record;
}

/**
 * Get the current bonus balance for a member (returns number).
 */
export async function getBonusBalance(memberId: string): Promise<number> {
  const record = await prisma.bonusBalance.findUnique({ where: { memberId } });
  return record ? Number(record.currentBalance) : 0;
}

/**
 * Check if a member has sufficient bonus balance.
 */
export async function hasSufficientBalance(memberId: string, amount: number): Promise<boolean> {
  const balance = await getBonusBalance(memberId);
  return balance >= amount;
}

/**
 * Add to a member's bonus balance (credit).
 * Creates audit transaction.
 */
export async function addBonusBalance(
  memberId: string,
  gymId: string,
  amount: number,
  type: BonusBalanceTxnType,
  referenceType: string | null,
  referenceId: string | null,
  description: string,
  createdBy: string
): Promise<BonusBalanceResult> {
  const result = await prisma.$transaction(async (tx) => {
    // Upsert the balance record
    const balance = await tx.bonusBalance.upsert({
      where: { memberId },
      create: { memberId, gymId, currentBalance: amount },
      update: { currentBalance: { increment: amount } },
    });

    const newBalance = Number(balance.currentBalance);

    // Create audit transaction
    const txn = await tx.bonusBalanceTransaction.create({
      data: {
        type,
        amount,
        balanceAfter: newBalance,
        referenceType,
        referenceId,
        description,
        createdBy,
        memberId,
        gymId,
      },
    });

    return { balance: newBalance, transactionId: txn.id };
  });

  return { success: true, ...result };
}

/**
 * Deduct from a member's bonus balance (debit).
 * Validates sufficient funds. Creates audit transaction.
 */
export async function deductBonusBalance(
  memberId: string,
  gymId: string,
  amount: number,
  type: BonusBalanceTxnType,
  referenceType: string | null,
  referenceId: string | null,
  description: string,
  createdBy: string
): Promise<BonusBalanceResult> {
  const result = await prisma.$transaction(async (tx) => {
    const balance = await tx.bonusBalance.findUnique({ where: { memberId } });
    const currentBalance = balance ? Number(balance.currentBalance) : 0;

    if (currentBalance < amount) {
      return {
        success: false as const,
        error: {
          code: ERROR_CODES.INSUFFICIENT_BALANCE,
          message: `Insufficient bonus balance. Available: $${currentBalance.toFixed(2)}, Requested: $${amount.toFixed(2)}`,
        },
      };
    }

    const updated = await tx.bonusBalance.upsert({
      where: { memberId },
      create: { memberId, gymId, currentBalance: 0 },
      update: { currentBalance: { decrement: amount } },
    });

    const newBalance = Number(updated.currentBalance);

    const txn = await tx.bonusBalanceTransaction.create({
      data: {
        type,
        amount: -amount, // Store as negative for deductions
        balanceAfter: newBalance,
        referenceType,
        referenceId,
        description,
        createdBy,
        memberId,
        gymId,
      },
    });

    return { success: true as const, balance: newBalance, transactionId: txn.id };
  });

  if ('error' in result) {
    return result as BonusBalanceResult;
  }
  return result as BonusBalanceResult;
}

/**
 * Get paginated transaction history for a member.
 */
export async function getTransactionHistory(
  memberId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.bonusBalanceTransaction.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.bonusBalanceTransaction.count({ where: { memberId } }),
  ]);

  return {
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      balanceAfter: Number(t.balanceAfter),
      description: t.description,
      referenceType: t.referenceType,
      referenceId: t.referenceId,
      createdBy: t.createdBy,
      createdAt: t.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}
