import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';
import { redirect } from 'next/navigation';
import { ClassCalendar } from './class-calendar';

async function getClassesData() {
  const session = await getSession();
  if (!session) return null;

  const member = await prisma.member.findFirst({
    where: { userId: session.user.id },
    include: {
      bookings: {
        select: { sessionId: true },
      },
    },
  });

  if (!member) return null;

  // Get class sessions for the next 14 days (2 weeks for calendar navigation)
  const now = new Date();
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const sessions = await prisma.classSession.findMany({
    where: {
      gymId: member.gymId,
      startTime: {
        gte: now,
        lte: twoWeeksFromNow,
      },
      status: { not: 'CANCELLED' },
    },
    include: {
      class: {
        include: {
          instructor: true,
        },
      },
      _count: {
        select: { bookings: true },
      },
    },
    orderBy: { startTime: 'asc' },
  });

  const bookedSessionIds = new Set(member.bookings.map((b) => b.sessionId));

  return {
    member,
    sessions: sessions.map((s) => ({
      id: s.id,
      startTime: s.startTime,
      endTime: s.endTime,
      isBooked: bookedSessionIds.has(s.id),
      spotsLeft: s.class.capacity - s._count.bookings,
      class: {
        id: s.class.id,
        name: s.class.name,
        description: s.class.description,
        color: s.class.color,
        capacity: s.class.capacity,
        durationMinutes: s.class.durationMinutes,
      },
      instructor: s.class.instructor
        ? {
            firstName: s.class.instructor.firstName,
            lastName: s.class.instructor.lastName,
          }
        : null,
    })),
  };
}

export default async function ClassesPage() {
  const data = await getClassesData();

  if (!data) {
    redirect('/member-login');
  }

  const { sessions, member } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Class Schedule</h1>
        <p className="text-muted-foreground mt-1">
          Browse and book available classes. Click on a class to see details and book.
        </p>
      </div>

      <ClassCalendar sessions={sessions} memberId={member.id} />
    </div>
  );
}
