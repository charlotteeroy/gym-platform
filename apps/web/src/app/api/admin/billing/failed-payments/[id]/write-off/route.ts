import { writeOffFailedPayment } from '@gym/core';
import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';

/**
 * POST /api/admin/billing/failed-payments/[id]/write-off
 * Write off a failed payment as bad debt
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return apiForbidden('No gym access');
    }

    // Only owners can write off payments
    if (staff.role !== 'OWNER') {
      return apiForbidden('Only owners can write off payments');
    }

    const { id: failedPaymentId } = await params;

    // Verify the failed payment belongs to this gym
    const failedPayment = await prisma.failedPaymentAttempt.findFirst({
      where: {
        id: failedPaymentId,
        gymId: staff.gymId,
      },
    });

    if (!failedPayment) {
      return apiError({ code: 'NOT_FOUND', message: 'Failed payment not found' }, 404);
    }

    const result = await writeOffFailedPayment(failedPaymentId);

    if (!result.success) {
      return apiError(result.error!, 400);
    }

    return apiSuccess({ message: 'Payment written off successfully' });
  } catch (error) {
    console.error('Write off payment error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to write off payment' }, 500);
  }
}
