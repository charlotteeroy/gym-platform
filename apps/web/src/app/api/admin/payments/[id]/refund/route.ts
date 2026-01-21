import { createRefund } from '@gym/core';
import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';

/**
 * POST /api/admin/payments/[id]/refund
 * Process a refund for a payment
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

    // Only owners and admins can process refunds
    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Only owners and admins can process refunds');
    }

    const { id: paymentId } = await params;

    // Verify payment belongs to this gym
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        gymId: staff.gymId,
      },
    });

    if (!payment) {
      return apiError({ code: 'NOT_FOUND', message: 'Payment not found' }, 404);
    }

    const body = await request.json();
    const { amount, reason } = body;

    // Validate amount if provided
    if (amount !== undefined && amount !== null) {
      if (typeof amount !== 'number' || amount <= 0) {
        return apiError({ code: 'INVALID_INPUT', message: 'Invalid refund amount' }, 400);
      }
      if (amount > Number(payment.amount)) {
        return apiError({ code: 'INVALID_INPUT', message: 'Refund amount exceeds payment amount' }, 400);
      }
    }

    // Process refund
    const result = await createRefund(
      paymentId,
      amount || null, // null for full refund
      reason || null,
      staff.id
    );

    if (!result.success) {
      return apiError(result.error, 400);
    }

    // Fetch the created refund
    const refund = await prisma.refund.findUnique({
      where: { id: result.refundId },
      include: {
        payment: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        processedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return apiSuccess({
      refund,
      message: amount
        ? `Partial refund of ${amount} processed successfully`
        : 'Full refund processed successfully',
    });
  } catch (error) {
    console.error('Refund processing error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to process refund' }, 500);
  }
}
