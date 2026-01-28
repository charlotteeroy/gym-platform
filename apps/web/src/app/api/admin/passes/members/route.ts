import { prisma } from '@gym/database';
import { getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';

// GET /api/admin/passes/members - List all member passes for the gym
export async function GET() {
  try {
    const staff = await getStaffWithGym();
    if (!staff) return apiUnauthorized();

    if (!['OWNER', 'ADMIN', 'MANAGER'].includes(staff.role)) {
      return apiForbidden('Permission denied');
    }

    const memberPasses = await prisma.memberPass.findMany({
      where: { gymId: staff.gymId },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        product: {
          select: {
            name: true,
            type: true,
            priceAmount: true,
            bonusCount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      active: memberPasses.filter((p) => p.status === 'ACTIVE').length,
      depleted: memberPasses.filter((p) => p.status === 'DEPLETED').length,
      expired: memberPasses.filter((p) => p.status === 'EXPIRED').length,
      totalBonusInUse: memberPasses
        .filter((p) => p.status === 'ACTIVE')
        .reduce((sum, p) => sum + p.bonusRemaining, 0),
    };

    return apiSuccess({
      passes: memberPasses.map((p) => ({
        id: p.id,
        status: p.status,
        bonusTotal: p.bonusTotal,
        bonusRemaining: p.bonusRemaining,
        expiresAt: p.expiresAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        member: p.member,
        product: {
          name: p.product.name,
          type: p.product.type,
          priceAmount: Number(p.product.priceAmount),
          bonusCount: p.product.bonusCount,
        },
      })),
      stats,
    });
  } catch (error) {
    console.error('Error listing member passes:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to list member passes' }, 500);
  }
}
