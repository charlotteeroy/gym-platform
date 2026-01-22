import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';
import { z } from 'zod';

const brandingSchema = z.object({
  tagline: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  websiteUrl: z.string().url().optional().nullable(),
  facebookUrl: z.string().url().optional().nullable(),
  instagramUrl: z.string().max(100).optional().nullable(), // Can be @handle or URL
});

// GET /api/admin/gym/branding - Get gym branding settings
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

    const gym = await prisma.gym.findUnique({
      where: { id: staff.gymId },
      select: {
        id: true,
        name: true,
        tagline: true,
        description: true,
        logoUrl: true,
        coverImageUrl: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        websiteUrl: true,
        facebookUrl: true,
        instagramUrl: true,
      },
    });

    return apiSuccess(gym);
  } catch (error) {
    console.error('Get branding error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get branding settings' }, 500);
  }
}

// PATCH /api/admin/gym/branding - Update gym branding settings
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

    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('You do not have permission to update gym settings');
    }

    const body = await request.json();
    const parsed = brandingSchema.safeParse(body);

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
        tagline: true,
        description: true,
        logoUrl: true,
        coverImageUrl: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        websiteUrl: true,
        facebookUrl: true,
        instagramUrl: true,
      },
    });

    return apiSuccess(gym);
  } catch (error) {
    console.error('Update branding error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update branding settings' }, 500);
  }
}
