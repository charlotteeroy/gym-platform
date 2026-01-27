import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiValidationError } from '@/lib/api';
import { createPassProductSchema } from '@gym/shared';

// GET /api/admin/passes - List all pass products for the gym
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const staff = await getStaffWithGym();
    if (!staff) return apiForbidden('No gym access');

    if (!['OWNER', 'ADMIN', 'MANAGER'].includes(staff.role)) {
      return apiForbidden('Permission denied');
    }

    const products = await prisma.product.findMany({
      where: {
        gymId: staff.gymId,
        type: { in: ['CLASS_PACK', 'DROP_IN'] },
      },
      include: {
        _count: {
          select: {
            passes: { where: { status: 'ACTIVE' } },
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { priceAmount: 'asc' }],
    });

    return apiSuccess(products);
  } catch (error) {
    console.error('Error listing pass products:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to list pass products' }, 500);
  }
}

// POST /api/admin/passes - Create a new pass product
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const staff = await getStaffWithGym();
    if (!staff) return apiForbidden('No gym access');

    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Permission denied');
    }

    const body = await request.json();
    const parsed = createPassProductSchema.safeParse(body);

    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      parsed.error.errors.forEach((err) => {
        const field = err.path.join('.');
        if (!errors[field]) errors[field] = [];
        errors[field].push(err.message);
      });
      return apiValidationError(errors);
    }

    const { name, description, priceAmount, type, classCredits, validityDays, isActive } = parsed.data;

    const product = await prisma.product.create({
      data: {
        name,
        description,
        priceAmount,
        type,
        classCredits,
        validityDays: validityDays ?? null,
        isActive,
        gymId: staff.gymId,
      },
    });

    return apiSuccess(product, 201);
  } catch (error) {
    console.error('Error creating pass product:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create pass product' }, 500);
  }
}
