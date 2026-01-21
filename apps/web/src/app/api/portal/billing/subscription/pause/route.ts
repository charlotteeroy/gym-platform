import { pauseStripeSubscription } from '@gym/core';
import { prisma } from '@gym/database';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api';

/**
 * POST /api/portal/billing/subscription/pause
 * Pause subscription
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const body = await request.json().catch(() => ({}));
    const { resumeAt } = body; // Optional: ISO date string for auto-resume

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

    // Check if subscription can be paused
    if (member.subscription.status !== 'ACTIVE') {
      return apiError(
        { code: 'INVALID_INPUT', message: 'Only active subscriptions can be paused' },
        400
      );
    }

    const resumeDate = resumeAt ? new Date(resumeAt) : undefined;

    // Pause via Stripe
    const result = await pauseStripeSubscription(member.id, resumeDate);

    if (!result.success) {
      return apiError(result.error!, 400);
    }

    return apiSuccess({
      message: resumeDate
        ? `Your subscription has been paused and will resume on ${resumeDate.toLocaleDateString()}.`
        : 'Your subscription has been paused.',
      pausedAt: new Date().toISOString(),
      resumeAt: resumeDate?.toISOString() || null,
    });
  } catch (error) {
    console.error('Subscription pause error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to pause subscription' }, 500);
  }
}
