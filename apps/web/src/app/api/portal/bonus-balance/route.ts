import { prisma } from '@gym/database';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api';
import { getOrCreateBonusBalance, getTransactionHistory } from '@gym/core';

// GET /api/portal/bonus-balance - Get member's own bonus balance
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const member = await prisma.member.findFirst({
      where: { userId: session.user.id },
    });

    if (!member) {
      return apiError({ code: 'NOT_FOUND', message: 'Member profile not found' }, 404);
    }

    const [balance, history] = await Promise.all([
      getOrCreateBonusBalance(member.id, member.gymId),
      getTransactionHistory(member.id, 1, 10),
    ]);

    return apiSuccess({
      memberId: member.id,
      currentBalance: Number(balance.currentBalance),
      recentTransactions: history.transactions,
    });
  } catch (error) {
    console.error('Error getting portal bonus balance:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get bonus balance' }, 500);
  }
}
