import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiServerError } from '@/lib/api';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const member = await prisma.member.findFirst({
      where: { userId: session.user.id },
    });

    if (!member) {
      return apiForbidden('Member account not found');
    }

    const bookings = await prisma.booking.findMany({
      where: { memberId: member.id },
      include: {
        session: {
          include: {
            class: {
              include: {
                instructor: true,
              },
            },
          },
        },
      },
      orderBy: { session: { startTime: 'desc' } },
    });

    return apiSuccess({ bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    return apiServerError('Failed to fetch bookings');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const member = await prisma.member.findFirst({
      where: { userId: session.user.id },
    });

    if (!member) {
      return apiForbidden('Member account not found');
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return apiError(
        { code: 'VALIDATION_ERROR', message: 'Session ID is required' },
        400
      );
    }

    // Check if session exists and has availability
    const classSession = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        class: true,
        _count: { select: { bookings: true } },
      },
    });

    if (!classSession) {
      return apiError(
        { code: 'NOT_FOUND', message: 'Class session not found' },
        404
      );
    }

    if (classSession.gymId !== member.gymId) {
      return apiForbidden('Cannot book class at different gym');
    }

    if (classSession.status === 'CANCELLED' || classSession.cancelledAt) {
      return apiError(
        { code: 'CLASS_CANCELLED', message: 'This class has been cancelled' },
        400
      );
    }

    if (classSession.startTime < new Date()) {
      return apiError(
        { code: 'PAST_CLASS', message: 'Cannot book past classes' },
        400
      );
    }

    if (classSession._count.bookings >= classSession.class.capacity) {
      return apiError(
        { code: 'CLASS_FULL', message: 'Class is full' },
        400
      );
    }

    // Check if already booked
    const existingBooking = await prisma.booking.findUnique({
      where: {
        memberId_sessionId: {
          memberId: member.id,
          sessionId,
        },
      },
    });

    if (existingBooking) {
      return apiError(
        { code: 'ALREADY_BOOKED', message: 'You have already booked this class' },
        400
      );
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        memberId: member.id,
        sessionId,
      },
      include: {
        session: {
          include: { class: true },
        },
      },
    });

    return apiSuccess({ booking });
  } catch (error) {
    console.error('Create booking error:', error);
    return apiServerError('Failed to create booking');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const member = await prisma.member.findFirst({
      where: { userId: session.user.id },
    });

    if (!member) {
      return apiForbidden('Member account not found');
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return apiError(
        { code: 'VALIDATION_ERROR', message: 'Session ID is required' },
        400
      );
    }

    // Find and delete booking
    const booking = await prisma.booking.findUnique({
      where: {
        memberId_sessionId: {
          memberId: member.id,
          sessionId,
        },
      },
      include: {
        session: true,
      },
    });

    if (!booking) {
      return apiError(
        { code: 'NOT_FOUND', message: 'Booking not found' },
        404
      );
    }

    // Check if class hasn't started yet (allow cancellation up to class start)
    if (booking.session.startTime < new Date()) {
      return apiError(
        { code: 'PAST_BOOKING', message: 'Cannot cancel past bookings' },
        400
      );
    }

    await prisma.booking.delete({
      where: { id: booking.id },
    });

    return apiSuccess({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Delete booking error:', error);
    return apiServerError('Failed to cancel booking');
  }
}
