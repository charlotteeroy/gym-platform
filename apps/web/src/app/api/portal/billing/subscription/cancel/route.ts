import { cancelStripeSubscription } from '@gym/core';
import { prisma } from '@gym/database';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api';

/**
 * POST /api/portal/billing/subscription/cancel
 * Request subscription cancellation (at period end by default)
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const body = await request.json().catch(() => ({}));
    const { immediately = false, reason } = body;

    // Get member
    const member = await prisma.member.findFirst({
      where: { userId: session.user.id },
      include: { subscription: true },
    });

    if (!member) {
      return apiError({ code: 'NOT_FOUND', message: 'Member not found' }, 404);
    }

    if (!member.subscription) {
      return apiError({ code: 'NOT_FOUND', message: 'No active subscription found' }, 404);
    }

    // Check if already cancelled
    if (member.subscription.status === 'CANCELLED') {
      return apiError({ code: 'INVALID_INPUT', message: 'Subscription is already cancelled' }, 400);
    }

    // Cancel via Stripe
    const result = await cancelStripeSubscription(member.id, immediately);

    if (!result.success) {
      return apiError(result.error!, 400);
    }

    // Log cancellation reason if provided
    if (reason) {
      console.log(`Cancellation reason for member ${member.id}: ${reason}`);
      // Could store this in a cancellation_reasons table if needed
    }

    return apiSuccess({
      message: immediately
        ? 'Your subscription has been cancelled.'
        : 'Your subscription will be cancelled at the end of the current billing period.',
      cancelledAt: immediately ? new Date().toISOString() : null,
      cancelAtPeriodEnd: !immediately,
    });
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to cancel subscription' }, 500);
  }
}
