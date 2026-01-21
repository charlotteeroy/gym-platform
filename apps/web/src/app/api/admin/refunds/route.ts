import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';

/**
 * GET /api/admin/refunds
 * List all refunds for the gym
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return apiForbidden('No gym access');
    }

    // Only owners, admins, and managers can view refunds
    if (!['OWNER', 'ADMIN', 'MANAGER'].includes(staff.role)) {
      return apiForbidden('Insufficient permissions');
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    const where = {
      gymId: staff.gymId,
      ...(status && { status: status as any }),
    };

    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        include: {
          payment: {
            include: {
              member: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          processedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.refund.count({ where }),
    ]);

    return apiSuccess({
      items: refunds,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List refunds error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to load refunds' }, 500);
  }
}
