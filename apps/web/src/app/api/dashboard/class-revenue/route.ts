import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';
import { apiSuccess, apiUnauthorized, apiForbidden, apiError } from '@/lib/api';
import { getPerClassRevenue } from '@gym/core';

function getRangeDates(range: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case '6m':
      start.setMonth(start.getMonth() - 6);
      break;
    case '12m':
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setDate(start.getDate() - 30);
  }

  return { start, end };
}

// GET /api/dashboard/class-revenue
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    const sortBy = searchParams.get('sortBy') || 'revenue';

    const { start, end } = getRangeDates(range);

    const result = await getPerClassRevenue(staff.gymId, start, end, sortBy);

    // Map to the shape the frontend expects
    const data = {
      rows: result.items.map((item) => ({
        name: item.className,
        sessions: item.sessions,
        revenue: item.revenue,
        avgPerSession: item.avgPerSession,
        trendPercent: item.trend,
        amSessions: Math.round(item.amRevenue / (item.avgPerSession || 1)),
        pmSessions: Math.round(item.pmRevenue / (item.avgPerSession || 1)),
      })),
      totals: {
        sessions: result.items.reduce((sum, i) => sum + i.sessions, 0),
        revenue: result.items.reduce((sum, i) => sum + i.revenue, 0),
        avgPerSession:
          result.items.length > 0
            ? Math.round(
                (result.items.reduce((sum, i) => sum + i.revenue, 0) /
                  result.items.reduce((sum, i) => sum + i.sessions, 0)) *
                  100
              ) / 100
            : 0,
      },
      timeSlots: result.timeSlots,
    };

    return apiSuccess(data);
  } catch (error) {
    console.error('Error fetching class revenue:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch class revenue' }, 500);
  }
}
