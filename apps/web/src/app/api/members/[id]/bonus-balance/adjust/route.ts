import { getMemberById, addBonusBalance, deductBonusBalance } from '@gym/core';
import { getSession, getCurrentStaff } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound, apiValidationError } from '@/lib/api';
import { adjustBonusBalanceSchema } from '@gym/shared';

// POST /api/members/[id]/bonus-balance/adjust - Manual adjustment (OWNER/ADMIN only)
export async function POST(
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

    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Only owners and admins can adjust bonus balances');
    }

    const body = await request.json();
    const parsed = adjustBonusBalanceSchema.safeParse(body);

    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      parsed.error.errors.forEach((err) => {
        const field = err.path.join('.');
        if (!errors[field]) errors[field] = [];
        errors[field].push(err.message);
      });
      return apiValidationError(errors);
    }

    const { amount, reason, direction } = parsed.data;

    if (direction === 'add') {
      const result = await addBonusBalance(
        id,
        member.gymId,
        amount,
        'MANUAL_ADJUSTMENT',
        'adjustment',
        null,
        reason,
        staff.id
      );
      if (!result.success) {
        return apiError(result.error, 400);
      }
      return apiSuccess({ balance: result.balance, transactionId: result.transactionId });
    } else {
      const result = await deductBonusBalance(
        id,
        member.gymId,
        amount,
        'MANUAL_ADJUSTMENT',
        'adjustment',
        null,
        reason,
        staff.id
      );
      if (!result.success) {
        return apiError(result.error, 400);
      }
      return apiSuccess({ balance: result.balance, transactionId: result.transactionId });
    }
  } catch (error) {
    console.error('Error adjusting bonus balance:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to adjust bonus balance' }, 500);
  }
}
