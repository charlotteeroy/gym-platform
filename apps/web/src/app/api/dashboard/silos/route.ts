import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';
import { apiSuccess, apiUnauthorized, apiForbidden, apiError } from '@/lib/api';
import { getSiloCards } from '@gym/core';

// GET /api/dashboard/silos
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

    const data = await getSiloCards(staff.gymId);

    return apiSuccess(data);
  } catch (error) {
    console.error('Error fetching silo cards:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch silo cards' }, 500);
  }
}
