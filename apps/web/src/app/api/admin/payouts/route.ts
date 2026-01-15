import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';
import { z } from 'zod';

const createPayoutSchema = z.object({
  amount: z.number().positive(),
  recipientType: z.enum(['gym', 'instructor']).default('gym'),
  recipientId: z.string().optional(),
  description: z.string().optional(),
  scheduledAt: z.string().transform((s) => new Date(s)).optional(),
});

// GET /api/admin/payouts - List payouts
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

    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('You do not have permission to view payouts');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const recipientType = searchParams.get('recipientType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = { gymId: staff.gymId };

    if (status) {
      where.status = status;
    }

    if (recipientType) {
      where.recipientType = recipientType;
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

    const payouts = await prisma.payout.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Fetch instructor details for instructor payouts
    const instructorIds = payouts
      .filter((p) => p.recipientType === 'instructor' && p.recipientId)
      .map((p) => p.recipientId as string);

    const instructors = instructorIds.length > 0
      ? await prisma.staff.findMany({
          where: { id: { in: instructorIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        })
      : [];

    const instructorMap = new Map(instructors.map((i) => [i.id, i]));

    const payoutsWithRecipients = payouts.map((payout) => ({
      ...payout,
      recipient: payout.recipientType === 'instructor' && payout.recipientId
        ? instructorMap.get(payout.recipientId) || null
        : null,
    }));

    // Calculate stats
    const allPayouts = await prisma.payout.findMany({
      where: { gymId: staff.gymId },
    });

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const stats = {
      totalPayouts: allPayouts.length,
      pendingCount: allPayouts.filter((p) => p.status === 'PENDING').length,
      processingCount: allPayouts.filter((p) => p.status === 'PROCESSING').length,
      paidCount: allPayouts.filter((p) => p.status === 'PAID').length,
      failedCount: allPayouts.filter((p) => p.status === 'FAILED').length,
      totalAmount: allPayouts
        .filter((p) => p.status === 'PAID')
        .reduce((sum, p) => sum + Number(p.amount), 0),
      thisMonthAmount: allPayouts
        .filter((p) => p.status === 'PAID' && p.processedAt && p.processedAt >= thisMonth)
        .reduce((sum, p) => sum + Number(p.amount), 0),
      pendingAmount: allPayouts
        .filter((p) => ['PENDING', 'PROCESSING'].includes(p.status))
        .reduce((sum, p) => sum + Number(p.amount), 0),
    };

    return apiSuccess({ payouts: payoutsWithRecipients, stats });
  } catch (error) {
    console.error('List payouts error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to list payouts' }, 500);
  }
}

// POST /api/admin/payouts - Create payout
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
      return apiForbidden('You do not have permission to create payouts');
    }

    const body = await request.json();
    const parsed = createPayoutSchema.safeParse(body);

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

    // If instructor payout, verify instructor exists
    if (parsed.data.recipientType === 'instructor' && parsed.data.recipientId) {
      const instructor = await prisma.staff.findFirst({
        where: { id: parsed.data.recipientId, gymId: staff.gymId, role: 'INSTRUCTOR' },
      });

      if (!instructor) {
        return apiError({ code: 'NOT_FOUND', message: 'Instructor not found' }, 404);
      }
    }

    const payout = await prisma.payout.create({
      data: {
        amount: parsed.data.amount,
        recipientType: parsed.data.recipientType,
        recipientId: parsed.data.recipientId || null,
        description: parsed.data.description || null,
        scheduledAt: parsed.data.scheduledAt || null,
        gymId: staff.gymId,
      },
    });

    return apiSuccess(payout, 201);
  } catch (error) {
    console.error('Create payout error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create payout' }, 500);
  }
}
