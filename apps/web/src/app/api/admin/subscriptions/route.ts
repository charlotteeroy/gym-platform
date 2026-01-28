import { prisma } from '@gym/database';
import { getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiForbidden, apiError, apiValidationError } from '@/lib/api';
import { z } from 'zod';

const createSubscriptionSchema = z.object({
  memberId: z.string().min(1, 'Member is required'),
  planId: z.string().min(1, 'Plan is required'),
  startDate: z.string().optional(),
});

export async function GET() {
  try {
    const staff = await getStaffWithGym();
    if (!staff) return apiUnauthorized();

    if (!['OWNER', 'ADMIN', 'MANAGER'].includes(staff.role)) {
      return apiForbidden('Permission denied');
    }

    const gymId = staff.gymId;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const subscriptions = await prisma.subscription.findMany({
      where: { member: { gymId } },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const active = subscriptions.filter((s) => s.status === 'ACTIVE').length;
    const paused = subscriptions.filter((s) => s.status === 'PAUSED').length;
    const cancelledThisMonth = subscriptions.filter(
      (s) =>
        s.status === 'CANCELLED' &&
        s.cancelledAt &&
        new Date(s.cancelledAt) >= thirtyDaysAgo
    ).length;
    const setToCancel = subscriptions.filter(
      (s) => s.status === 'ACTIVE' && s.cancelAtPeriodEnd
    ).length;

    const mrr = subscriptions
      .filter((s) => s.status === 'ACTIVE')
      .reduce((sum, sub) => {
        const monthly =
          sub.plan.billingInterval === 'YEARLY'
            ? Number(sub.plan.priceAmount) / 12
            : sub.plan.billingInterval === 'QUARTERLY'
              ? Number(sub.plan.priceAmount) / 3
              : sub.plan.billingInterval === 'WEEKLY'
                ? Number(sub.plan.priceAmount) * 4.33
                : Number(sub.plan.priceAmount);
        return sum + monthly;
      }, 0);

    return apiSuccess({
      subscriptions,
      stats: { active, paused, cancelledThisMonth, setToCancel, mrr },
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch subscriptions' },
      500
    );
  }
}

// POST /api/admin/subscriptions - Assign a subscription to a member
export async function POST(request: Request) {
  try {
    const staff = await getStaffWithGym();
    if (!staff) return apiUnauthorized();

    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Permission denied');
    }

    const body = await request.json();
    const parsed = createSubscriptionSchema.safeParse(body);

    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      parsed.error.errors.forEach((err) => {
        const field = err.path.join('.');
        if (!errors[field]) errors[field] = [];
        errors[field].push(err.message);
      });
      return apiValidationError(errors);
    }

    const { memberId, planId, startDate } = parsed.data;

    // Verify member belongs to the gym
    const member = await prisma.member.findFirst({
      where: { id: memberId, gymId: staff.gymId },
    });

    if (!member) {
      return apiError({ code: 'NOT_FOUND', message: 'Member not found' }, 404);
    }

    // Check if member already has an active subscription
    const existingSubscription = await prisma.subscription.findUnique({
      where: { memberId },
    });

    if (existingSubscription && existingSubscription.status === 'ACTIVE') {
      return apiError(
        { code: 'ALREADY_SUBSCRIBED', message: 'Member already has an active subscription' },
        400
      );
    }

    // Verify plan exists and belongs to the gym
    const plan = await prisma.membershipPlan.findFirst({
      where: { id: planId, gymId: staff.gymId },
    });

    if (!plan) {
      return apiError({ code: 'NOT_FOUND', message: 'Membership plan not found' }, 404);
    }

    // Calculate period dates based on billing interval
    const now = startDate ? new Date(startDate) : new Date();
    let periodEnd: Date;

    switch (plan.billingInterval) {
      case 'WEEKLY':
        periodEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'MONTHLY':
        periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        break;
      case 'QUARTERLY':
        periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 3);
        break;
      case 'YEARLY':
        periodEnd = new Date(now);
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        break;
      default:
        periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Create or update subscription
    let subscription;
    if (existingSubscription) {
      // Update existing cancelled/paused subscription
      subscription = await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          planId,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelledAt: null,
          cancelAtPeriodEnd: false,
          pausedAt: null,
          resumeAt: null,
        },
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          plan: true,
        },
      });
    } else {
      // Create new subscription
      subscription = await prisma.subscription.create({
        data: {
          memberId,
          planId,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          plan: true,
        },
      });
    }

    return apiSuccess(subscription, 201);
  } catch (error) {
    console.error('Error creating subscription:', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to create subscription' },
      500
    );
  }
}
