import {
  prisma,
  type Booking,
  type WaitlistEntry,
  BookingStatus,
  SessionStatus,
} from '@gym/database';
import { ERROR_CODES, type ApiError } from '@gym/shared';
import { addMinutes, diffInMinutes } from '@gym/shared';
import { getSessionAvailability } from './class.service';

export type BookingResult =
  | { success: true; booking: Booking }
  | { success: false; error: ApiError };

export type WaitlistResult =
  | { success: true; entry: WaitlistEntry }
  | { success: false; error: ApiError };

/**
 * Book a class session for a member
 */
export async function bookSession(memberId: string, sessionId: string): Promise<BookingResult> {
  // Get session with class details
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: { class: true },
  });

  if (!session) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Session not found',
      },
    };
  }

  // Check session status
  if (session.status !== SessionStatus.SCHEDULED) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.INVALID_INPUT,
        message: 'Session is not available for booking',
      },
    };
  }

  // Check booking window
  const now = new Date();
  const bookingOpens = addMinutes(session.startTime, -session.class.bookingOpensHours * 60);
  const bookingCloses = addMinutes(session.startTime, -session.class.bookingClosesMinutes);

  if (now < bookingOpens) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.BOOKING_CLOSED,
        message: `Booking opens ${session.class.bookingOpensHours} hours before class`,
      },
    };
  }

  if (now > bookingCloses) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.BOOKING_CLOSED,
        message: 'Booking is closed for this session',
      },
    };
  }

  // Check for existing booking
  const existingBooking = await prisma.booking.findUnique({
    where: {
      memberId_sessionId: { memberId, sessionId },
    },
  });

  if (existingBooking && existingBooking.status === BookingStatus.CONFIRMED) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.ALREADY_EXISTS,
        message: 'You already have a booking for this session',
      },
    };
  }

  // Check member subscription and credits
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      subscription: {
        include: { plan: true },
      },
    },
  });

  if (!member) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Member not found',
      },
    };
  }

  if (member.status !== 'ACTIVE') {
    return {
      success: false,
      error: {
        code: ERROR_CODES.FORBIDDEN,
        message: 'Member is not active',
      },
    };
  }

  if (!member.subscription || member.subscription.status !== 'ACTIVE') {
    return {
      success: false,
      error: {
        code: ERROR_CODES.SUBSCRIPTION_REQUIRED,
        message: 'Active subscription required to book classes',
      },
    };
  }

  // Check capacity
  const availability = await getSessionAvailability(sessionId);

  if (availability.available <= 0) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.CLASS_FULL,
        message: 'This session is full. You can join the waitlist.',
      },
    };
  }

  // Create booking
  const booking = await prisma.booking.create({
    data: {
      memberId,
      sessionId,
      status: BookingStatus.CONFIRMED,
    },
  });

  return { success: true, booking };
}

/**
 * Cancel a booking
 */
export async function cancelBooking(
  bookingId: string,
  memberId?: string
): Promise<BookingResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      session: {
        include: { class: true },
      },
    },
  });

  if (!booking) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Booking not found',
      },
    };
  }

  // Verify ownership if memberId provided
  if (memberId && booking.memberId !== memberId) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.FORBIDDEN,
        message: 'You can only cancel your own bookings',
      },
    };
  }

  if (booking.status !== BookingStatus.CONFIRMED) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.INVALID_INPUT,
        message: 'Booking is not active',
      },
    };
  }

  // Check cancellation deadline
  const now = new Date();
  const minutesUntilClass = diffInMinutes(now, booking.session.startTime);

  if (minutesUntilClass < booking.session.class.cancellationMinutes) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.CANCELLATION_DEADLINE_PASSED,
        message: `Cancellation deadline is ${booking.session.class.cancellationMinutes} minutes before class`,
      },
    };
  }

  // Cancel booking
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
    },
  });

  // Promote from waitlist
  await promoteFromWaitlist(booking.sessionId);

  return { success: true, booking: updatedBooking };
}

/**
 * Join waitlist for a session
 */
export async function joinWaitlist(memberId: string, sessionId: string): Promise<WaitlistResult> {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: { class: true },
  });

  if (!session) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Session not found',
      },
    };
  }

  if (!session.class.waitlistEnabled) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.INVALID_INPUT,
        message: 'Waitlist is not enabled for this class',
      },
    };
  }

  // Check if already on waitlist
  const existingEntry = await prisma.waitlistEntry.findUnique({
    where: {
      memberId_sessionId: { memberId, sessionId },
    },
  });

  if (existingEntry) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.ALREADY_EXISTS,
        message: 'You are already on the waitlist',
      },
    };
  }

  // Check if already booked
  const existingBooking = await prisma.booking.findUnique({
    where: {
      memberId_sessionId: { memberId, sessionId },
    },
  });

  if (existingBooking && existingBooking.status === BookingStatus.CONFIRMED) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.ALREADY_EXISTS,
        message: 'You already have a booking for this session',
      },
    };
  }

  // Check waitlist capacity
  const waitlistCount = await prisma.waitlistEntry.count({
    where: { sessionId },
  });

  if (waitlistCount >= session.class.waitlistMax) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.CLASS_FULL,
        message: 'Waitlist is full',
      },
    };
  }

  // Add to waitlist
  const entry = await prisma.waitlistEntry.create({
    data: {
      memberId,
      sessionId,
      position: waitlistCount + 1,
    },
  });

  return { success: true, entry };
}

/**
 * Leave waitlist
 */
export async function leaveWaitlist(
  memberId: string,
  sessionId: string
): Promise<{ success: boolean; error?: ApiError }> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: {
      memberId_sessionId: { memberId, sessionId },
    },
  });

  if (!entry) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Waitlist entry not found',
      },
    };
  }

  await prisma.waitlistEntry.delete({
    where: { id: entry.id },
  });

  // Reorder positions
  await prisma.waitlistEntry.updateMany({
    where: {
      sessionId,
      position: { gt: entry.position },
    },
    data: {
      position: { decrement: 1 },
    },
  });

  return { success: true };
}

/**
 * Promote first person from waitlist to booking
 */
async function promoteFromWaitlist(sessionId: string): Promise<void> {
  const firstInLine = await prisma.waitlistEntry.findFirst({
    where: { sessionId },
    orderBy: { position: 'asc' },
  });

  if (!firstInLine) {
    return;
  }

  // Check if spot is available
  const availability = await getSessionAvailability(sessionId);

  if (availability.available <= 0) {
    return;
  }

  // Create booking for waitlisted member
  await prisma.$transaction(async (tx) => {
    // Create booking
    await tx.booking.create({
      data: {
        memberId: firstInLine.memberId,
        sessionId,
        status: BookingStatus.CONFIRMED,
      },
    });

    // Remove from waitlist
    await tx.waitlistEntry.delete({
      where: { id: firstInLine.id },
    });

    // Reorder waitlist
    await tx.waitlistEntry.updateMany({
      where: {
        sessionId,
        position: { gt: firstInLine.position },
      },
      data: {
        position: { decrement: 1 },
      },
    });
  });

  // TODO: Send notification to promoted member
}

/**
 * Mark booking as attended
 */
export async function markAttended(bookingId: string): Promise<BookingResult> {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.ATTENDED,
      attendedAt: new Date(),
    },
  });

  return { success: true, booking };
}

/**
 * Mark booking as no-show
 */
export async function markNoShow(bookingId: string): Promise<BookingResult> {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.NO_SHOW,
    },
  });

  return { success: true, booking };
}

/**
 * Get member's upcoming bookings
 */
export async function getMemberBookings(
  memberId: string,
  options: { upcoming?: boolean; limit?: number } = {}
): Promise<Booking[]> {
  const { upcoming = true, limit = 20 } = options;
  const now = new Date();

  return prisma.booking.findMany({
    where: {
      memberId,
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.ATTENDED] },
      ...(upcoming
        ? {
            session: {
              startTime: { gte: now },
            },
          }
        : {}),
    },
    include: {
      session: {
        include: {
          class: {
            include: { instructor: true },
          },
        },
      },
    },
    orderBy: {
      session: { startTime: upcoming ? 'asc' : 'desc' },
    },
    take: limit,
  });
}
