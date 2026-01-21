import { retryFailedPayment } from '@gym/core';
import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';

/**
 * POST /api/admin/billing/failed-payments/[id]/retry
 * Retry a failed payment
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

    // Only owners and admins can retry payments
    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Only owners and admins can retry payments');
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

    const result = await retryFailedPayment(failedPaymentId);

    if (!result.success) {
      return apiError(result.error!, 400);
    }

    return apiSuccess({ message: 'Payment retry initiated successfully' });
  } catch (error) {
    console.error('Retry payment error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to retry payment' }, 500);
  }
}
