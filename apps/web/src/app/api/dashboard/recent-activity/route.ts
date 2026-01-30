import { prisma } from '@gym/database';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiForbidden, apiError } from '@/lib/api';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const staff = await prisma.staff.findFirst({
      where: { userId: session.user.id },
      include: { gym: true },
    });
    if (!staff) return apiForbidden('No gym access');

    const recentBookings = await prisma.booking.findMany({
      where: { member: { gymId: staff.gymId } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        member: { select: { firstName: true, lastName: true } },
        session: { include: { class: { select: { name: true } } } },
      },
    });

    const data = recentBookings.map((b) => ({
      id: b.id,
      memberFirstName: b.member.firstName,
      memberLastName: b.member.lastName,
      className: b.session.class.name,
      createdAt: b.createdAt.toISOString(),
    }));

    return apiSuccess(data);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch recent activity' }, 500);
  }
}
