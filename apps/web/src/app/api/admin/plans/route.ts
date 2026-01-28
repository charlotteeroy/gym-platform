import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';
import { z } from 'zod';

const createPlanSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  priceAmount: z.number().min(0),
  priceCurrency: z.string().length(3).optional().default('USD'),
  billingInterval: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  bonusCount: z.number().optional().default(-1), // -1 = unlimited
  guestPasses: z.number().optional().default(0),
  features: z.array(z.string()).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

// GET /api/admin/plans - List all membership plans
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return apiForbidden('You do not have access to any gym');
    }

    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('You do not have permission to view plans');
    }

    const plans = await prisma.membershipPlan.findMany({
      where: { gymId: staff.gymId },
      orderBy: [{ isActive: 'desc' }, { priceAmount: 'asc' }],
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    return apiSuccess(plans);
  } catch (error) {
    console.error('List plans error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to list plans' }, 500);
  }
}

// POST /api/admin/plans - Create a new membership plan
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return apiForbidden('You do not have access to any gym');
    }

    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('You do not have permission to create plans');
    }

    const body = await request.json();
    const parsed = createPlanSchema.safeParse(body);

    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      parsed.error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      return apiError({ code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors }, 400);
    }

    const plan = await prisma.membershipPlan.create({
      data: {
        gymId: staff.gymId,
        ...parsed.data,
      },
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    return apiSuccess(plan, 201);
  } catch (error) {
    console.error('Create plan error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create plan' }, 500);
  }
}
