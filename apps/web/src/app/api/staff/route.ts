import { prisma } from '@gym/database';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api';

// GET /api/staff - Get public trainer profiles (for members)
export async function GET() {
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

    // Get trainers with public profiles (INSTRUCTOR or with public profile enabled)
    const trainers = await prisma.staff.findMany({
      where: {
        gymId,
        isActive: true,
        isPublicProfile: true,
        role: { in: ['INSTRUCTOR', 'MANAGER', 'OWNER', 'ADMIN'] },
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
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { firstName: 'asc' },
      ],
    });

    return apiSuccess(trainers);
  } catch (error) {
    console.error('Get trainers error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get trainers' }, 500);
  }
}
