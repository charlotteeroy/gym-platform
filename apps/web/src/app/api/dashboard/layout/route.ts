import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';
import { apiSuccess, apiUnauthorized, apiForbidden, apiError } from '@/lib/api';
import { getDashboardLayout, saveDashboardLayout } from '@gym/core';

// GET /api/dashboard/layout
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const staff = await prisma.staff.findFirst({
      where: { userId: session.user.id },
      include: { gym: true },
    });
    if (!staff) return apiForbidden('No gym access');

    const data = await getDashboardLayout(staff.id);

    return apiSuccess(data);
  } catch (error) {
    console.error('Error fetching dashboard layout:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch dashboard layout' }, 500);
  }
}

// PUT /api/dashboard/layout
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const staff = await prisma.staff.findFirst({
      where: { userId: session.user.id },
      include: { gym: true },
    });
    if (!staff) return apiForbidden('No gym access');

    const body = await request.json();

    const data = await saveDashboardLayout(staff.id, body.widgets);

    return apiSuccess(data);
  } catch (error) {
    console.error('Error saving dashboard layout:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to save dashboard layout' }, 500);
  }
}
