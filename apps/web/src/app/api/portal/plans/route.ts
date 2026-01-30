import { prisma } from '@gym/database';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiError } from '@/lib/api';

// GET /api/portal/plans - Get all available membership plans for the member's gym
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const member = await prisma.member.findUnique({
      where: { userId: session.user.id },
      select: { gymId: true, subscription: { select: { planId: true } } },
    });

    if (!member) {
      return apiError({ code: 'NOT_FOUND', message: 'Member not found' }, 404);
    }

    const plans = await prisma.membershipPlan.findMany({
      where: {
        gymId: member.gymId,
        isActive: true,
      },
      orderBy: { priceAmount: 'asc' },
    });

    // Mark the member's current plan
    const plansWithCurrent = plans.map((plan) => ({
      ...plan,
      isCurrent: plan.id === member.subscription?.planId,
    }));

    return apiSuccess(plansWithCurrent);
  } catch (error) {
    console.error('Error fetching plans:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch plans' }, 500);
  }
}
