import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api';
import { z } from 'zod';

const updateGymSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  timezone: z.string().optional(),
  currency: z.string().length(3).optional(),
  logoUrl: z.string().url().optional().nullable(),
});

// GET /api/admin/gym - Get gym profile
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

    // Only allow OWNER and ADMIN to view gym profile
    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('You do not have permission to view gym settings');
    }

    const gym = await prisma.gym.findUnique({
      where: { id: staff.gymId },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        timezone: true,
        currency: true,
        logoUrl: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            members: true,
            staff: true,
          },
        },
      },
    });

    if (!gym) {
      return apiNotFound('Gym not found');
    }

    return apiSuccess(gym);
  } catch (error) {
    console.error('Get gym error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get gym profile' }, 500);
  }
}

// PATCH /api/admin/gym - Update gym profile
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return apiForbidden('You do not have access to any gym');
    }

    // Only allow OWNER and ADMIN to update gym profile
    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('You do not have permission to update gym settings');
    }

    const body = await request.json();
    const parsed = updateGymSchema.safeParse(body);

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

    const gym = await prisma.gym.update({
      where: { id: staff.gymId },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        timezone: true,
        currency: true,
        logoUrl: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess(gym);
  } catch (error) {
    console.error('Update gym error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update gym profile' }, 500);
  }
}
