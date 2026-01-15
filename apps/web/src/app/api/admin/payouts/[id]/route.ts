import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';
import { z } from 'zod';

const updatePayoutSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED']).optional(),
  description: z.string().optional(),
  processedAt: z.string().transform((s) => new Date(s)).optional(),
});

// GET /api/admin/payouts/[id] - Get single payout
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
      return apiForbidden('You do not have permission to view payouts');
    }

    const { id } = await params;

    const payout = await prisma.payout.findFirst({
      where: { id, gymId: staff.gymId },
    });

    if (!payout) {
      return apiError({ code: 'NOT_FOUND', message: 'Payout not found' }, 404);
    }

    // Get recipient details if instructor payout
    let recipient = null;
    if (payout.recipientType === 'instructor' && payout.recipientId) {
      recipient = await prisma.staff.findUnique({
        where: { id: payout.recipientId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          hourlyRate: true,
        },
      });
    }

    return apiSuccess({ ...payout, recipient });
  } catch (error) {
    console.error('Get payout error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get payout' }, 500);
  }
}

// PATCH /api/admin/payouts/[id] - Update payout
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
      return apiForbidden('You do not have permission to update payouts');
    }

    const { id } = await params;

    const payout = await prisma.payout.findFirst({
      where: { id, gymId: staff.gymId },
    });

    if (!payout) {
      return apiError({ code: 'NOT_FOUND', message: 'Payout not found' }, 404);
    }

    // Can't update PAID or CANCELLED payouts
    if (['PAID', 'CANCELLED'].includes(payout.status)) {
      return apiError({ code: 'INVALID_OPERATION', message: 'Cannot update paid or cancelled payouts' }, 400);
    }

    const body = await request.json();
    const parsed = updatePayoutSchema.safeParse(body);

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

    const updateData: Record<string, unknown> = {};

    if (parsed.data.status) {
      updateData.status = parsed.data.status;
      // Auto-set processedAt when marked as PAID
      if (parsed.data.status === 'PAID' && !parsed.data.processedAt) {
        updateData.processedAt = new Date();
      }
    }

    if (parsed.data.description !== undefined) {
      updateData.description = parsed.data.description;
    }

    if (parsed.data.processedAt) {
      updateData.processedAt = parsed.data.processedAt;
    }

    const updatedPayout = await prisma.payout.update({
      where: { id },
      data: updateData,
    });

    return apiSuccess(updatedPayout);
  } catch (error) {
    console.error('Update payout error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update payout' }, 500);
  }
}

// DELETE /api/admin/payouts/[id] - Cancel/delete payout
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
      return apiForbidden('You do not have permission to delete payouts');
    }

    const { id } = await params;

    const payout = await prisma.payout.findFirst({
      where: { id, gymId: staff.gymId },
    });

    if (!payout) {
      return apiError({ code: 'NOT_FOUND', message: 'Payout not found' }, 404);
    }

    // Only allow deleting PENDING payouts, or cancel PROCESSING ones
    if (payout.status === 'PAID') {
      return apiError({ code: 'INVALID_OPERATION', message: 'Cannot delete paid payouts' }, 400);
    }

    if (payout.status === 'PROCESSING') {
      // Mark as cancelled instead of deleting
      await prisma.payout.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
      return apiSuccess({ success: true, cancelled: true });
    }

    await prisma.payout.delete({
      where: { id },
    });

    return apiSuccess({ success: true });
  } catch (error) {
    console.error('Delete payout error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to delete payout' }, 500);
  }
}
