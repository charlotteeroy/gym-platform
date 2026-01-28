import { getMemberById, getOrCreateBonusBalance, getTransactionHistory } from '@gym/core';
import { getSession, getCurrentStaff } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api';

// GET /api/members/[id]/bonus-balance - Get balance + recent transactions
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const { id } = await params;
    const member = await getMemberById(id);
    if (!member) return apiNotFound('Member not found');

    const staff = await getCurrentStaff(member.gymId);
    if (!staff) return apiForbidden('You do not have access to this member');

    const [balance, history] = await Promise.all([
      getOrCreateBonusBalance(id, member.gymId),
      getTransactionHistory(id, 1, 10),
    ]);

    return apiSuccess({
      memberId: id,
      currentBalance: Number(balance.currentBalance),
      recentTransactions: history.transactions,
    });
  } catch (error) {
    console.error('Error getting bonus balance:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get bonus balance' }, 500);
  }
}
