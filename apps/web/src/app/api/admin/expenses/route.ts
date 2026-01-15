import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';
import { z } from 'zod';

const createExpenseSchema = z.object({
  amount: z.number().positive(),
  category: z.enum(['RENT', 'UTILITIES', 'EQUIPMENT', 'MAINTENANCE', 'MARKETING', 'PAYROLL', 'SUPPLIES', 'INSURANCE', 'OTHER']),
  description: z.string().min(1),
  vendor: z.string().optional(),
  date: z.string(),
  receiptUrl: z.string().url().optional(),
  staffId: z.string().optional(),
});

const updateExpenseSchema = createExpenseSchema.partial();

// GET /api/admin/expenses - List expenses
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return apiForbidden('You do not have access to any gym');
    }

    // Only OWNER, ADMIN, MANAGER can view expenses
    if (!['OWNER', 'ADMIN', 'MANAGER'].includes(staff.role)) {
      return apiForbidden('You do not have permission to view expenses');
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const categories = searchParams.get('categories'); // Comma-separated list
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = { gymId: staff.gymId };

    if (categories) {
      // Support comma-separated list of categories
      const categoryList = categories.split(',').map(c => c.trim());
      where.category = { in: categoryList };
    } else if (category) {
      where.category = category;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        (where.date as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.date as Record<string, Date>).lte = new Date(endDate);
      }
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 100,
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

    // Calculate stats
    const allExpenses = await prisma.expense.findMany({
      where: { gymId: staff.gymId },
    });

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const stats = {
      totalExpenses: allExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
      thisMonthExpenses: allExpenses
        .filter((e) => e.date >= thisMonth)
        .reduce((sum, e) => sum + Number(e.amount), 0),
      byCategory: Object.fromEntries(
        ['RENT', 'UTILITIES', 'EQUIPMENT', 'MAINTENANCE', 'MARKETING', 'PAYROLL', 'SUPPLIES', 'INSURANCE', 'OTHER'].map((cat) => [
          cat,
          allExpenses
            .filter((e) => e.category === cat)
            .reduce((sum, e) => sum + Number(e.amount), 0),
        ])
      ),
      count: allExpenses.length,
    };

    return apiSuccess({ expenses, stats });
  } catch (error) {
    console.error('List expenses error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to list expenses' }, 500);
  }
}

// POST /api/admin/expenses - Create expense
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

    // Only OWNER, ADMIN can create expenses
    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('You do not have permission to create expenses');
    }

    const body = await request.json();
    const parsed = createExpenseSchema.safeParse(body);

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

    const expense = await prisma.expense.create({
      data: {
        amount: parsed.data.amount,
        category: parsed.data.category,
        description: parsed.data.description,
        vendor: parsed.data.vendor || null,
        date: new Date(parsed.data.date),
        receiptUrl: parsed.data.receiptUrl || null,
        staffId: parsed.data.staffId || null,
        gymId: staff.gymId,
      },
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

    return apiSuccess(expense, 201);
  } catch (error) {
    console.error('Create expense error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create expense' }, 500);
  }
}
