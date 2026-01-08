import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const staff = await prisma.staff.findFirst({
      where: { userId: session.user.id },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Not a staff member' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const sessions = await prisma.classSession.findMany({
      where: {
        gymId: staff.gymId,
        ...(startDate && endDate
          ? {
              startTime: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            }
          : {}),
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

    const formattedSessions = sessions.map((s) => {
      const instructor = s.class.instructor;
      return {
        id: s.id,
        classId: s.classId,
        className: s.class.name,
        color: s.class.color,
        instructorName: instructor ? `${instructor.firstName} ${instructor.lastName}` : 'Unknown',
        startTime: s.startTime.toISOString(),
        endTime: s.endTime.toISOString(),
        capacity: s.class.capacity,
        bookingsCount: s._count.bookings,
        status: s.status,
      };
    });

    return NextResponse.json(formattedSessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const staff = await prisma.staff.findFirst({
      where: { userId: session.user.id },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Not a staff member' }, { status: 403 });
    }

    const body = await request.json();
    const { classId, startTime, endTime } = body;

    if (!classId || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the class belongs to the same gym
    const classType = await prisma.class.findFirst({
      where: { id: classId, gymId: staff.gymId },
    });

    if (!classType) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const newSession = await prisma.classSession.create({
      data: {
        classId,
        gymId: staff.gymId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: 'SCHEDULED',
      },
      include: {
        class: {
          include: {
            instructor: true,
          },
        },
      },
    });

    const instructor = newSession.class.instructor;
    return NextResponse.json({
      id: newSession.id,
      classId: newSession.classId,
      className: newSession.class.name,
      color: newSession.class.color,
      instructorName: instructor ? `${instructor.firstName} ${instructor.lastName}` : 'Unknown',
      startTime: newSession.startTime.toISOString(),
      endTime: newSession.endTime.toISOString(),
      capacity: newSession.class.capacity,
      bookingsCount: 0,
      status: newSession.status,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
