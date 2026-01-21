import { resumeStripeSubscription, undoCancellation } from '@gym/core';
import { prisma } from '@gym/database';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api';

/**
 * POST /api/portal/billing/subscription/resume
 * Resume a paused subscription or undo a scheduled cancellation
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    // Get member
    const member = await prisma.member.findFirst({
      where: { userId: session.user.id },
      include: { subscription: true },
    });

    if (!member) {
      return apiError({ code: 'NOT_FOUND', message: 'Member not found' }, 404);
    }

    if (!member.subscription) {
      return apiError({ code: 'NOT_FOUND', message: 'No subscription found' }, 404);
    }

    // Check if subscription is paused or scheduled to cancel
    if (member.subscription.status === 'PAUSED') {
      // Resume paused subscription
      const result = await resumeStripeSubscription(member.id);

      if (!result.success) {
        return apiError(result.error!, 400);
      }

      return apiSuccess({
        message: 'Your subscription has been resumed.',
        status: 'ACTIVE',
      });
    } else if (member.subscription.cancelAtPeriodEnd) {
      // Undo scheduled cancellation
      const result = await undoCancellation(member.id);

      if (!result.success) {
        return apiError(result.error!, 400);
      }

      return apiSuccess({
        message: 'Your subscription cancellation has been reversed.',
        cancelAtPeriodEnd: false,
      });
    } else {
      return apiError(
        { code: 'INVALID_INPUT', message: 'Subscription is not paused or scheduled for cancellation' },
        400
      );
    }
  } catch (error) {
    console.error('Subscription resume error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to resume subscription' }, 500);
  }
}
