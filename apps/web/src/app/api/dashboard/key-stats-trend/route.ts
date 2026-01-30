import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';
import { apiSuccess, apiUnauthorized, apiForbidden, apiError } from '@/lib/api';
import { getKeyStatsTrend } from '@gym/core';

// GET /api/dashboard/key-stats-trend
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const staff = await prisma.staff.findFirst({
      where: { userId: session.user.id },
      include: { gym: true },
    });
    if (!staff) return apiForbidden('No gym access');

    const data = await getKeyStatsTrend(staff.gymId);

    return apiSuccess(data);
  } catch (error) {
    console.error('Error fetching key stats trend:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch key stats trend' }, 500);
  }
}
