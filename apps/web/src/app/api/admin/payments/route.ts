import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';
import { z } from 'zod';

const createPaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['CARD', 'CASH', 'BANK_TRANSFER', 'OTHER']),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
  description: z.string().optional(),
  memberId: z.string().optional(),
  invoiceId: z.string().optional(),
});

// GET /api/admin/payments - List payments
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

    // Only OWNER, ADMIN, MANAGER can view payments
    if (!['OWNER', 'ADMIN', 'MANAGER'].includes(staff.role)) {
      return apiForbidden('You do not have permission to view payments');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const method = searchParams.get('method');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = { gymId: staff.gymId };

    if (status) {
      where.status = status;
    }

    if (method) {
      where.method = method;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, Date>).lte = new Date(endDate);
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
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

    // Calculate stats
    const allPayments = await prisma.payment.findMany({
      where: { gymId: staff.gymId },
    });

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const stats = {
      totalRevenue: allPayments
        .filter((p) => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + Number(p.amount), 0),
      thisMonthRevenue: allPayments
        .filter((p) => p.status === 'COMPLETED' && p.createdAt >= thisMonth)
        .reduce((sum, p) => sum + Number(p.amount), 0),
      pendingAmount: allPayments
        .filter((p) => p.status === 'PENDING')
        .reduce((sum, p) => sum + Number(p.amount), 0),
      totalPayments: allPayments.length,
    };

    return apiSuccess({ payments, stats });
  } catch (error) {
    console.error('List payments error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to list payments' }, 500);
  }
}

// POST /api/admin/payments - Record a manual payment
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

    // Only OWNER, ADMIN can create payments
    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('You do not have permission to create payments');
    }

    const body = await request.json();
    const parsed = createPaymentSchema.safeParse(body);

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

    const payment = await prisma.payment.create({
      data: {
        amount: parsed.data.amount,
        method: parsed.data.method,
        status: parsed.data.status || 'COMPLETED',
        description: parsed.data.description || null,
        memberId: parsed.data.memberId || null,
        invoiceId: parsed.data.invoiceId || null,
        gymId: staff.gymId,
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
      },
    });

    return apiSuccess(payment, 201);
  } catch (error) {
    console.error('Create payment error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create payment' }, 500);
  }
}
