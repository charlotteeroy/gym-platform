import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';
import { z } from 'zod';

const openingHoursSchema = z.object({
  hours: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    openTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    closeTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    isClosed: z.boolean(),
  })),
});

// GET /api/admin/gym/hours - Get gym opening hours
export async function GET() {
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

    const openingHours = await prisma.openingHours.findMany({
      where: { gymId: staff.gymId },
      orderBy: { dayOfWeek: 'asc' },
    });

    // If no hours exist, return default structure
    if (openingHours.length === 0) {
      const defaultHours = Array.from({ length: 7 }, (_, i) => ({
        id: null,
        dayOfWeek: i,
        openTime: i === 0 ? null : '06:00', // Sunday closed by default
        closeTime: i === 0 ? null : '22:00',
        isClosed: i === 0, // Sunday closed by default
      }));
      return apiSuccess(defaultHours);
    }

    return apiSuccess(openingHours);
  } catch (error) {
    console.error('Get opening hours error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get opening hours' }, 500);
  }
}

// PUT /api/admin/gym/hours - Update all opening hours
export async function PUT(request: Request) {
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
      return apiForbidden('You do not have permission to update gym settings');
    }

    const body = await request.json();
    const parsed = openingHoursSchema.safeParse(body);

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

    // Delete existing hours and create new ones in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete all existing hours for this gym
      await tx.openingHours.deleteMany({
        where: { gymId: staff.gymId },
      });

      // Create new hours
      const createdHours = await tx.openingHours.createMany({
        data: parsed.data.hours.map((hour) => ({
          gymId: staff.gymId,
          dayOfWeek: hour.dayOfWeek,
          openTime: hour.isClosed ? null : hour.openTime,
          closeTime: hour.isClosed ? null : hour.closeTime,
          isClosed: hour.isClosed,
        })),
      });

      // Fetch and return the created hours
      return tx.openingHours.findMany({
        where: { gymId: staff.gymId },
        orderBy: { dayOfWeek: 'asc' },
      });
    });

    return apiSuccess(result);
  } catch (error) {
    console.error('Update opening hours error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update opening hours' }, 500);
  }
}
