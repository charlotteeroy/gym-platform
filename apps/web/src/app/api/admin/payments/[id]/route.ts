import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';
import { z } from 'zod';

const updatePaymentSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
  description: z.string().optional(),
});

// GET /api/admin/payments/[id] - Get single payment
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

    if (!['OWNER', 'ADMIN', 'MANAGER'].includes(staff.role)) {
      return apiForbidden('You do not have permission to view payments');
    }

    const { id } = await params;

    const payment = await prisma.payment.findFirst({
      where: { id, gymId: staff.gymId },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            status: true,
          },
        },
      },
    });

    if (!payment) {
      return apiError({ code: 'NOT_FOUND', message: 'Payment not found' }, 404);
    }

    return apiSuccess(payment);
  } catch (error) {
    console.error('Get payment error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get payment' }, 500);
  }
}

// PATCH /api/admin/payments/[id] - Update payment
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
      return apiForbidden('You do not have permission to update payments');
    }

    const { id } = await params;

    const payment = await prisma.payment.findFirst({
      where: { id, gymId: staff.gymId },
    });

    if (!payment) {
      return apiError({ code: 'NOT_FOUND', message: 'Payment not found' }, 404);
    }

    const body = await request.json();
    const parsed = updatePaymentSchema.safeParse(body);

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

    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: {
        status: parsed.data.status,
        description: parsed.data.description,
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
      },
    });

    // If payment is marked as COMPLETED and linked to invoice, update invoice status
    if (parsed.data.status === 'COMPLETED' && updatedPayment.invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: updatedPayment.invoiceId },
        include: { payments: true },
      });

      if (invoice) {
        const totalPaid = invoice.payments
          .filter((p) => p.status === 'COMPLETED')
          .reduce((sum, p) => sum + Number(p.amount), 0);

        if (totalPaid >= Number(invoice.total)) {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'PAID' },
          });
        }
      }
    }

    return apiSuccess(updatedPayment);
  } catch (error) {
    console.error('Update payment error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update payment' }, 500);
  }
}

// DELETE /api/admin/payments/[id] - Delete payment
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
      return apiForbidden('You do not have permission to delete payments');
    }

    const { id } = await params;

    const payment = await prisma.payment.findFirst({
      where: { id, gymId: staff.gymId },
    });

    if (!payment) {
      return apiError({ code: 'NOT_FOUND', message: 'Payment not found' }, 404);
    }

    // Only allow deleting PENDING or FAILED payments
    if (!['PENDING', 'FAILED'].includes(payment.status)) {
      return apiError({ code: 'INVALID_OPERATION', message: 'Can only delete pending or failed payments' }, 400);
    }

    await prisma.payment.delete({
      where: { id },
    });

    return apiSuccess({ success: true });
  } catch (error) {
    console.error('Delete payment error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to delete payment' }, 500);
  }
}
