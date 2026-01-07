import { prisma, type Booking, type WaitlistEntry, BookingStatus } from '@gym/database';
import { ERROR_CODES, type ApiError, diffInMinutes } from '@gym/shared';

export type BookingResult =
  | { success: true; booking: Booking }
  | { success: false; error: ApiError };

export type WaitlistResult =
  | { success: true; entry: WaitlistEntry }
  | { success: false; error: ApiError };

/**
 * Book a class session for a member
 */
export async function bookClass(memberId: string, sessionId: string): Promise<BookingResult> {
  // Get session with class details and current bookings
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      class: true,
      _count: { select: { bookings: { where: { status: 'CONFIRMED' } } } },
    },
  });

  if (!session) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Class session not found' },
    };
  }

  // Check if session is cancelled
  if (session.status === 'CANCELLED') {
    return {
      success: false,
      error: { code: ERROR_CODES.INVALID_INPUT, message: 'This class has been cancelled' },
    };
  }

  // Check if booking is still open
  const now = new Date();
  const minutesUntilClass = diffInMinutes(now, session.startTime);

  if (minutesUntilClass < session.class.bookingClosesMinutes) {
    return {
      success: false,
      error: { code: ERROR_CODES.BOOKING_CLOSED, message: 'Booking for this class has closed' },
    };
  }

  // Check if class is full
  const capacity = session.capacityOverride ?? session.class.capacity;
  if (session._count.bookings >= capacity) {
    return {
      success: false,
      error: { code: ERROR_CODES.CLASS_FULL, message: 'This class is full' },
    };
  }

  // Check if member already has a booking
  const existingBooking = await prisma.booking.findUnique({
    where: {
      memberId_sessionId: { memberId, sessionId },
    },
  });

  if (existingBooking) {
    if (existingBooking.status === 'CONFIRMED') {
      return {
        success: false,
        error: { code: ERROR_CODES.ALREADY_EXISTS, message: 'You already have a booking for this class' },
      };
    }
    // Reactivate cancelled booking
    const booking = await prisma.booking.update({
      where: { id: existingBooking.id },
      data: { status: BookingStatus.CONFIRMED, cancelledAt: null },
    });
    return { success: true, booking };
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
  memberId: string
): Promise<{ success: boolean; error?: ApiError }> {
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
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Booking not found' },
    };
  }

  // Verify ownership
  if (booking.memberId !== memberId) {
    return {
      success: false,
      error: { code: ERROR_CODES.FORBIDDEN, message: 'You can only cancel your own bookings' },
    };
  }

  // Check if already cancelled
  if (booking.status === 'CANCELLED') {
    return {
      success: false,
      error: { code: ERROR_CODES.INVALID_INPUT, message: 'Booking is already cancelled' },
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
        message: 'The cancellation deadline has passed',
      },
    };
  }

  // Cancel booking
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
    },
  });

  // Process waitlist if applicable
  await processWaitlist(booking.sessionId);

  return { success: true };
}

/**
 * Join waitlist for a class
 */
export async function joinWaitlist(memberId: string, sessionId: string): Promise<WaitlistResult> {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      class: true,
      _count: { select: { waitlist: true } },
    },
  });

  if (!session) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Class session not found' },
    };
  }

  // Check if waitlist is enabled and has space
  if (!session.class.waitlistEnabled) {
    return {
      success: false,
      error: { code: ERROR_CODES.INVALID_INPUT, message: 'Waitlist is not enabled for this class' },
    };
  }

  if (session._count.waitlist >= session.class.waitlistMax) {
    return {
      success: false,
      error: { code: ERROR_CODES.CLASS_FULL, message: 'Waitlist is full' },
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
      error: { code: ERROR_CODES.ALREADY_EXISTS, message: 'You are already on the waitlist' },
    };
  }

  // Add to waitlist
  const entry = await prisma.waitlistEntry.create({
    data: {
      memberId,
      sessionId,
      position: session._count.waitlist + 1,
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
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Waitlist entry not found' },
    };
  }

  // Remove from waitlist
  await prisma.waitlistEntry.delete({
    where: { id: entry.id },
  });

  // Reorder remaining entries
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
 * Process waitlist when a spot opens up
 */
export async function processWaitlist(sessionId: string): Promise<void> {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      class: true,
      _count: { select: { bookings: { where: { status: 'CONFIRMED' } } } },
    },
  });

  if (!session) return;

  const capacity = session.capacityOverride ?? session.class.capacity;
  const spotsAvailable = capacity - session._count.bookings;

  if (spotsAvailable <= 0) return;

  // Get first person on waitlist
  const nextInLine = await prisma.waitlistEntry.findFirst({
    where: { sessionId },
    orderBy: { position: 'asc' },
  });

  if (!nextInLine) return;

  // Notify and set deadline (in production, send email here)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 2); // 2 hour deadline

  await prisma.waitlistEntry.update({
    where: { id: nextInLine.id },
    data: {
      notifiedAt: new Date(),
      expiresAt,
    },
  });
}

/**
 * Mark attendance for a booking
 */
export async function markAttendance(
  bookingId: string,
  attended: boolean
): Promise<BookingResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Booking not found' },
    };
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: attended ? BookingStatus.ATTENDED : BookingStatus.NO_SHOW,
      attendedAt: attended ? new Date() : null,
    },
  });

  return { success: true, booking: updatedBooking };
}

/**
 * Get member's bookings
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
      status: 'CONFIRMED',
      ...(upcoming
        ? { session: { startTime: { gte: now } } }
        : { session: { startTime: { lt: now } } }),
    },
    include: {
      session: {
        include: { class: true },
      },
    },
    orderBy: {
      session: { startTime: upcoming ? 'asc' : 'desc' },
    },
    take: limit,
  });
}
