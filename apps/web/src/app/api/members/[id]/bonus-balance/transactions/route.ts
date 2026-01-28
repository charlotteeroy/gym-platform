import { getMemberById, getTransactionHistory } from '@gym/core';
import { getSession, getCurrentStaff } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api';

// GET /api/members/[id]/bonus-balance/transactions - Paginated transaction history
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

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));

    const history = await getTransactionHistory(id, page, limit);

    return apiSuccess(history);
  } catch (error) {
    console.error('Error getting bonus balance transactions:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get transaction history' }, 500);
  }
}
