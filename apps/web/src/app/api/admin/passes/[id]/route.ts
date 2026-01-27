import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound, apiValidationError } from '@/lib/api';
import { updatePassProductSchema } from '@gym/shared';

// GET /api/admin/passes/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const staff = await getStaffWithGym();
    if (!staff) return apiForbidden('No gym access');

    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { id, gymId: staff.gymId, type: { in: ['CLASS_PACK', 'DROP_IN'] } },
      include: {
        _count: {
          select: {
            passes: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });

    if (!product) return apiNotFound('Pass product not found');

    return apiSuccess(product);
  } catch (error) {
    console.error('Error getting pass product:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get pass product' }, 500);
  }
}

// PATCH /api/admin/passes/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const staff = await getStaffWithGym();
    if (!staff) return apiForbidden('No gym access');

    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Permission denied');
    }

    const { id } = await params;

    const existing = await prisma.product.findFirst({
      where: { id, gymId: staff.gymId, type: { in: ['CLASS_PACK', 'DROP_IN'] } },
    });

    if (!existing) return apiNotFound('Pass product not found');

    const body = await request.json();
    const parsed = updatePassProductSchema.safeParse(body);

    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      parsed.error.errors.forEach((err) => {
        const field = err.path.join('.');
        if (!errors[field]) errors[field] = [];
        errors[field].push(err.message);
      });
      return apiValidationError(errors);
    }

    const { validityDays, ...rest } = parsed.data;

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...(validityDays !== undefined ? { validityDays: validityDays ?? null } : {}),
      },
    });

    return apiSuccess(updated);
  } catch (error) {
    console.error('Error updating pass product:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update pass product' }, 500);
  }
}

// DELETE /api/admin/passes/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const staff = await getStaffWithGym();
    if (!staff) return apiForbidden('No gym access');

    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Permission denied');
    }

    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { id, gymId: staff.gymId, type: { in: ['CLASS_PACK', 'DROP_IN'] } },
      include: {
        _count: {
          select: {
            passes: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });

    if (!product) return apiNotFound('Pass product not found');

    if (product._count.passes > 0) {
      return apiError(
        {
          code: 'HAS_ACTIVE_PASSES',
          message: `Cannot delete: ${product._count.passes} active pass(es) exist. Deactivate instead.`,
        },
        400
      );
    }

    await prisma.product.delete({ where: { id } });

    return apiSuccess({ success: true });
  } catch (error) {
    console.error('Error deleting pass product:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to delete pass product' }, 500);
  }
}
