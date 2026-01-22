import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api';
import { z } from 'zod';

const policyTypes = ['rules', 'cancellation', 'terms', 'privacy'] as const;

const updatePolicySchema = z.object({
  type: z.enum(policyTypes).optional(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(50000).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// GET /api/admin/gym/policies/[id] - Get a single policy
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
      return apiForbidden('You do not have permission to view gym settings');
    }

    const { id } = await params;

    const policy = await prisma.gymPolicy.findFirst({
      where: {
        id,
        gymId: staff.gymId,
      },
    });

    if (!policy) {
      return apiNotFound('Policy not found');
    }

    return apiSuccess(policy);
  } catch (error) {
    console.error('Get policy error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get policy' }, 500);
  }
}

// PATCH /api/admin/gym/policies/[id] - Update a policy
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
      return apiForbidden('You do not have permission to manage gym policies');
    }

    const { id } = await params;

    // Verify policy belongs to this gym
    const existingPolicy = await prisma.gymPolicy.findFirst({
      where: {
        id,
        gymId: staff.gymId,
      },
    });

    if (!existingPolicy) {
      return apiNotFound('Policy not found');
    }

    const body = await request.json();
    const parsed = updatePolicySchema.safeParse(body);

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

    const policy = await prisma.gymPolicy.update({
      where: { id },
      data: parsed.data,
    });

    return apiSuccess(policy);
  } catch (error) {
    console.error('Update policy error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update policy' }, 500);
  }
}

// DELETE /api/admin/gym/policies/[id] - Delete a policy
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
      return apiForbidden('You do not have permission to manage gym policies');
    }

    const { id } = await params;

    // Verify policy belongs to this gym
    const existingPolicy = await prisma.gymPolicy.findFirst({
      where: {
        id,
        gymId: staff.gymId,
      },
    });

    if (!existingPolicy) {
      return apiNotFound('Policy not found');
    }

    await prisma.gymPolicy.delete({
      where: { id },
    });

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error('Delete policy error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to delete policy' }, 500);
  }
}
