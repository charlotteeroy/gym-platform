import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';

export async function GET() {
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

    const classes = await prisma.class.findMany({
      where: { gymId: staff.gymId },
      include: {
        instructor: true,
        _count: {
          select: { sessions: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formattedClasses = classes.map((c) => {
      const instructor = c.instructor;
      return {
        id: c.id,
        name: c.name,
        description: c.description,
        color: c.color,
        capacity: c.capacity,
        durationMinutes: c.durationMinutes,
        instructorId: c.instructorId,
        instructorName: instructor ? `${instructor.firstName} ${instructor.lastName}` : 'Unknown',
        sessionCount: c._count.sessions,
      };
    });

    return NextResponse.json(formattedClasses);
  } catch (error) {
    console.error('Error fetching classes:', error);
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
    const { name, description, color, capacity, durationMinutes, instructorId } = body;

    if (!name || !capacity || !durationMinutes || !instructorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify instructor belongs to the same gym
    const instructor = await prisma.staff.findFirst({
      where: { id: instructorId, gymId: staff.gymId },
    });

    if (!instructor) {
      return NextResponse.json({ error: 'Instructor not found' }, { status: 404 });
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        description,
        color: color || '#3b82f6',
        capacity,
        durationMinutes,
        instructorId,
        gymId: staff.gymId,
      },
      include: {
        instructor: true,
      },
    });

    const instructor = newClass.instructor;
    return NextResponse.json({
      id: newClass.id,
      name: newClass.name,
      description: newClass.description,
      color: newClass.color,
      capacity: newClass.capacity,
      durationMinutes: newClass.durationMinutes,
      instructorId: newClass.instructorId,
      instructorName: instructor ? `${instructor.firstName} ${instructor.lastName}` : 'Unknown',
      sessionCount: 0,
    });
  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
