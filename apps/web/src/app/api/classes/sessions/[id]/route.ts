import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const body = await request.json();
    const { classId, startTime, endTime } = body;

    // Verify the session belongs to the same gym
    const existingSession = await prisma.classSession.findFirst({
      where: { id, gymId: staff.gymId },
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // If changing class type, verify the new class belongs to the same gym
    if (classId && classId !== existingSession.classId) {
      const classType = await prisma.class.findFirst({
        where: { id: classId, gymId: staff.gymId },
      });

      if (!classType) {
        return NextResponse.json({ error: 'Class not found' }, { status: 404 });
      }
    }

    const updatedSession = await prisma.classSession.update({
      where: { id },
      data: {
        ...(classId && { classId }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
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
    });

    const instructor = updatedSession.class.instructor;
    return NextResponse.json({
      id: updatedSession.id,
      classId: updatedSession.classId,
      className: updatedSession.class.name,
      color: updatedSession.class.color,
      instructorName: instructor ? `${instructor.firstName} ${instructor.lastName}` : 'Unknown',
      startTime: updatedSession.startTime.toISOString(),
      endTime: updatedSession.endTime.toISOString(),
      capacity: updatedSession.class.capacity,
      bookingsCount: updatedSession._count.bookings,
      status: updatedSession.status,
    });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;

    // Verify the session belongs to the same gym
    const existingSession = await prisma.classSession.findFirst({
      where: { id, gymId: staff.gymId },
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Delete associated bookings first
    await prisma.booking.deleteMany({
      where: { sessionId: id },
    });

    // Delete the session
    await prisma.classSession.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
