import { prisma } from '@gym/database';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiNotFound } from '@/lib/api';

// GET /api/staff/[id] - Get a single trainer's public profile
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    // Get the member's gym
    const member = await prisma.member.findFirst({
      where: { userId: session.user.id },
      select: { gymId: true },
    });

    // If not a member, check if they're staff
    let gymId = member?.gymId;
    if (!gymId) {
      const staff = await prisma.staff.findFirst({
        where: { userId: session.user.id },
        select: { gymId: true },
      });
      gymId = staff?.gymId;
    }

    if (!gymId) {
      return apiUnauthorized('You do not have access to any gym');
    }

    const { id } = await params;

    const trainer = await prisma.staff.findFirst({
      where: {
        id,
        gymId,
        isActive: true,
        isPublicProfile: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        bio: true,
        specialties: true,
        certifications: true,
        instagramUrl: true,
        linkedinUrl: true,
        instructorClasses: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            durationMinutes: true,
          },
        },
      },
    });

    if (!trainer) {
      return apiNotFound('Trainer not found');
    }

    return apiSuccess(trainer);
  } catch (error) {
    console.error('Get trainer error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get trainer' }, 500);
  }
}
