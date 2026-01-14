import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api';
import { z } from 'zod';

const updateExpenseSchema = z.object({
  amount: z.number().positive().optional(),
  category: z.enum(['RENT', 'UTILITIES', 'EQUIPMENT', 'MAINTENANCE', 'MARKETING', 'PAYROLL', 'SUPPLIES', 'INSURANCE', 'OTHER']).optional(),
  description: z.string().min(1).optional(),
  vendor: z.string().optional().nullable(),
  date: z.string().optional(),
  receiptUrl: z.string().url().optional().nullable(),
  staffId: z.string().optional().nullable(),
});

// PATCH /api/admin/expenses/[id] - Update expense
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
      return apiForbidden('You do not have permission to update expenses');
    }

    const { id } = await params;

    const existingExpense = await prisma.expense.findFirst({
      where: { id, gymId: staff.gymId },
    });

    if (!existingExpense) {
      return apiNotFound('Expense not found');
    }

    const body = await request.json();
    const parsed = updateExpenseSchema.safeParse(body);

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

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.date) {
      updateData.date = new Date(parsed.data.date);
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return apiSuccess(expense);
  } catch (error) {
    console.error('Update expense error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update expense' }, 500);
  }
}

// DELETE /api/admin/expenses/[id] - Delete expense
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
      return apiForbidden('You do not have permission to delete expenses');
    }

    const { id } = await params;

    const existingExpense = await prisma.expense.findFirst({
      where: { id, gymId: staff.gymId },
    });

    if (!existingExpense) {
      return apiNotFound('Expense not found');
    }

    await prisma.expense.delete({ where: { id } });

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error('Delete expense error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to delete expense' }, 500);
  }
}
