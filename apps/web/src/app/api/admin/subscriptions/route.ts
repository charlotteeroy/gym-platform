import { prisma } from '@gym/database';
import { getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiForbidden, apiError } from '@/lib/api';

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
