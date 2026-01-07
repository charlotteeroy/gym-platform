import { getSession } from '@/lib/auth';
import { apiSuccess, apiUnauthorized } from '@/lib/api';
import { prisma } from '@gym/database';

export async function GET() {
  const session = await getSession();

  if (!session) {
    return apiUnauthorized();
  }

  // Get user's staff and member associations
  const [staff, members] = await Promise.all([
    prisma.staff.findMany({
      where: { userId: session.user.id, isActive: true },
      include: { gym: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.member.findMany({
      where: { userId: session.user.id },
      include: { gym: { select: { id: true, name: true, slug: true } } },
    }),
  ]);

  return apiSuccess({
    user: {
      id: session.user.id,
      email: session.user.email,
    },
    gyms: staff.map((s) => ({
      gym: s.gym,
      role: s.role,
      staffId: s.id,
    })),
    memberships: members.map((m) => ({
      gym: m.gym,
      memberId: m.id,
      status: m.status,
    })),
  });
}
