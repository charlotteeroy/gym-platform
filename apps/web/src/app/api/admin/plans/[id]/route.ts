import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api';
import { z } from 'zod';

const updatePlanSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  priceAmount: z.number().min(0).optional(),
  priceCurrency: z.string().length(3).optional(),
  billingInterval: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  classCredits: z.number().optional(),
  guestPasses: z.number().optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/admin/plans/[id] - Get a single plan
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const plan = await prisma.membershipPlan.findFirst({
      where: {
        id,
        gymId: staff.gymId,
      },
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    if (!plan) {
      return apiNotFound('Plan not found');
    }

    return apiSuccess(plan);
  } catch (error) {
    console.error('Get plan error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get plan' }, 500);
  }
}

// PATCH /api/admin/plans/[id] - Update a plan
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return apiForbidden('You do not have permission to update plans');
    }

    const { id } = await params;

    // Verify plan belongs to this gym
    const existingPlan = await prisma.membershipPlan.findFirst({
      where: {
        id,
        gymId: staff.gymId,
      },
    });

    if (!existingPlan) {
      return apiNotFound('Plan not found');
    }

    const body = await request.json();
    const parsed = updatePlanSchema.safeParse(body);

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

    const plan = await prisma.membershipPlan.update({
      where: { id },
      data: parsed.data,
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    return apiSuccess(plan);
  } catch (error) {
    console.error('Update plan error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update plan' }, 500);
  }
}

// DELETE /api/admin/plans/[id] - Delete a plan
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return apiForbidden('You do not have permission to delete plans');
    }

    const { id } = await params;

    // Verify plan belongs to this gym
    const existingPlan = await prisma.membershipPlan.findFirst({
      where: {
        id,
        gymId: staff.gymId,
      },
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    if (!existingPlan) {
      return apiNotFound('Plan not found');
    }

    // Don't delete plans with active subscriptions
    if (existingPlan._count.subscriptions > 0) {
      return apiError(
        { code: 'HAS_SUBSCRIPTIONS', message: 'Cannot delete a plan with active subscriptions. Deactivate it instead.' },
        400
      );
    }

    await prisma.membershipPlan.delete({
      where: { id },
    });

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error('Delete plan error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to delete plan' }, 500);
  }
}
