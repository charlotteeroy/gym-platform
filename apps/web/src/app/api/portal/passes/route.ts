import { prisma } from '@gym/database';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api';
import { getMemberPasses, getMemberAccessSummary } from '@gym/core';

// GET /api/portal/passes - Get member's pass balances
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const member = await prisma.member.findFirst({
      where: { userId: session.user.id },
    });

    if (!member) {
      return apiError({ code: 'NOT_FOUND', message: 'Member profile not found' }, 404);
    }

    const [passes, accessSummary] = await Promise.all([
      getMemberPasses(member.id),
      getMemberAccessSummary(member.id),
    ]);

    return apiSuccess({
      passes,
      accessSummary,
    });
  } catch (error) {
    console.error('Error getting portal passes:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get pass data' }, 500);
  }
}
