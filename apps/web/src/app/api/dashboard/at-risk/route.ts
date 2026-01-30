import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';
import { apiSuccess, apiUnauthorized, apiForbidden, apiError } from '@/lib/api';
import { getAtRiskEnhanced } from '@gym/core';

// GET /api/dashboard/at-risk
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const staff = await prisma.staff.findFirst({
      where: { userId: session.user.id },
      include: { gym: true },
    });
    if (!staff) return apiForbidden('No gym access');

    if (!['OWNER', 'ADMIN', 'MANAGER'].includes(staff.role)) {
      return apiForbidden('Insufficient permissions');
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '20';
    const redMin = searchParams.get('redMin') || '70';
    const amberMin = searchParams.get('amberMin') || '50';

    const data = await getAtRiskEnhanced(staff.gymId, parseInt(limit), {
      red: parseInt(redMin),
      amber: parseInt(amberMin),
    });

    return apiSuccess(data);
  } catch (error) {
    console.error('Error fetching at-risk members:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch at-risk members' }, 500);
  }
}
