import { prisma } from '@gym/database';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiError } from '@/lib/api';

// GET /api/portal/products - Get all available passes/products for the member's gym
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const member = await prisma.member.findUnique({
      where: { userId: session.user.id },
      select: { gymId: true },
    });

    if (!member) {
      return apiError({ code: 'NOT_FOUND', message: 'Member not found' }, 404);
    }

    const products = await prisma.product.findMany({
      where: {
        gymId: member.gymId,
        isActive: true,
        type: { in: ['CLASS_PACK', 'DROP_IN', 'COMBO'] },
      },
      orderBy: { priceAmount: 'asc' },
    });

    return apiSuccess(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch products' }, 500);
  }
}
