import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';
import { z } from 'zod';

const updateInvoiceSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  dueDate: z.string().transform((s) => new Date(s)).optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    id: z.string().optional(),
    description: z.string(),
    quantity: z.number().int().positive().default(1),
    unitPrice: z.number().positive(),
  })).optional(),
});

// GET /api/admin/invoices/[id] - Get single invoice
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
      return apiForbidden('You do not have permission to view invoices');
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
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
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          include: {
            member: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return apiError({ code: 'NOT_FOUND', message: 'Invoice not found' }, 404);
    }

    return apiSuccess(invoice);
  } catch (error) {
    console.error('Get invoice error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get invoice' }, 500);
  }
}

// PATCH /api/admin/invoices/[id] - Update invoice
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
      return apiForbidden('You do not have permission to update invoices');
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, gymId: staff.gymId },
    });

    if (!invoice) {
      return apiError({ code: 'NOT_FOUND', message: 'Invoice not found' }, 404);
    }

    const body = await request.json();
    const parsed = updateInvoiceSchema.safeParse(body);

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
    }

    if (parsed.data.dueDate) {
      updateData.dueDate = parsed.data.dueDate;
    }

    if (parsed.data.notes !== undefined) {
      updateData.notes = parsed.data.notes;
    }

    // If items are provided, recalculate totals
    if (parsed.data.items) {
      // Delete existing items
      await prisma.invoiceItem.deleteMany({
        where: { invoiceId: id },
      });

      // Create new items
      const items = parsed.data.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
        invoiceId: id,
      }));

      await prisma.invoiceItem.createMany({
        data: items,
      });

      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      updateData.subtotal = subtotal;
      updateData.total = subtotal + Number(invoice.tax);
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: true,
        payments: true,
      },
    });

    return apiSuccess(updatedInvoice);
  } catch (error) {
    console.error('Update invoice error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update invoice' }, 500);
  }
}

// DELETE /api/admin/invoices/[id] - Delete invoice
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
      return apiForbidden('You do not have permission to delete invoices');
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, gymId: staff.gymId },
    });

    if (!invoice) {
      return apiError({ code: 'NOT_FOUND', message: 'Invoice not found' }, 404);
    }

    // Only allow deleting DRAFT or CANCELLED invoices
    if (!['DRAFT', 'CANCELLED'].includes(invoice.status)) {
      return apiError({ code: 'INVALID_OPERATION', message: 'Can only delete draft or cancelled invoices' }, 400);
    }

    await prisma.invoice.delete({
      where: { id },
    });

    return apiSuccess({ success: true });
  } catch (error) {
    console.error('Delete invoice error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to delete invoice' }, 500);
  }
}
