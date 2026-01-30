import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';
import { apiSuccess, apiUnauthorized, apiForbidden, apiError } from '@/lib/api';
import { getRevenueBySilo } from '@gym/core';

// GET /api/dashboard/revenue-breakdown
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const staff = await prisma.staff.findFirst({
      where: { userId: session.user.id },
      include: { gym: true },
    });
    if (!staff) return apiForbidden('No gym access');

    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Insufficient permissions');
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const data = await getRevenueBySilo(staff.gymId, startOfMonth, now);

    return apiSuccess(data);
  } catch (error) {
    console.error('Error fetching revenue breakdown:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch revenue breakdown' }, 500);
  }
}
