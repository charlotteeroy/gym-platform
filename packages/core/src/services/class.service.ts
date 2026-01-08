import {
  prisma,
  type Class,
  type ClassSession,
  type RecurrenceRule,
  SessionStatus,
  Frequency,
} from '@gym/database';
import {
  type CreateClassInput,
  type UpdateClassInput,
  type RecurrenceRuleInput,
  type CreateSessionInput,
  DAY_OF_WEEK_MAP,
  ERROR_CODES,
  type ApiError,
} from '@gym/shared';
import { addDays, addMinutes, setTimeFromString } from '@gym/shared';

export type ClassResult =
  | { success: true; class: Class }
  | { success: false; error: ApiError };

export type SessionResult =
  | { success: true; session: ClassSession }
  | { success: false; error: ApiError };

/**
 * Create a class
 */
export async function createClass(gymId: string, input: CreateClassInput): Promise<ClassResult> {
  const classEntity = await prisma.class.create({
    data: {
      ...input,
      gymId,
    },
  });

  return { success: true, class: classEntity };
}

/**
 * Get class by ID
 */
export async function getClassById(classId: string): Promise<Class | null> {
  return prisma.class.findUnique({
    where: { id: classId },
  });
}

/**
 * Get class with sessions
 */
export async function getClassWithSessions(
  classId: string,
  options: { from?: Date; to?: Date } = {}
): Promise<(Class & { sessions: ClassSession[] }) | null> {
  const { from = new Date(), to = addDays(new Date(), 30) } = options;

  return prisma.class.findUnique({
    where: { id: classId },
    include: {
      sessions: {
        where: {
          startTime: { gte: from, lte: to },
          status: { not: SessionStatus.CANCELLED },
        },
        orderBy: { startTime: 'asc' },
      },
      instructor: true,
    },
  });
}

/**
 * Update class
 */
export async function updateClass(classId: string, input: UpdateClassInput): Promise<ClassResult> {
  const classEntity = await prisma.class.findUnique({
    where: { id: classId },
  });

  if (!classEntity) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Class not found',
      },
    };
  }

  const updated = await prisma.class.update({
    where: { id: classId },
    data: input,
  });

  return { success: true, class: updated };
}

/**
 * Deactivate class
 */
export async function deactivateClass(classId: string): Promise<ClassResult> {
  const updated = await prisma.class.update({
    where: { id: classId },
    data: { isActive: false },
  });

  return { success: true, class: updated };
}

/**
 * List classes for a gym
 */
export async function listClasses(
  gymId: string,
  options: { includeInactive?: boolean } = {}
): Promise<Class[]> {
  const { includeInactive = false } = options;

  return prisma.class.findMany({
    where: {
      gymId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    include: { instructor: true },
    orderBy: { name: 'asc' },
  });
}

/**
 * Create a recurrence rule and generate sessions
 */
export async function createRecurrenceRule(
  classId: string,
  input: RecurrenceRuleInput,
  generateUntil: Date = addDays(new Date(), 90)
): Promise<{ rule: RecurrenceRule; sessionsCreated: number }> {
  const classEntity = await prisma.class.findUnique({
    where: { id: classId },
  });

  if (!classEntity) {
    throw new Error('Class not found');
  }

  const rule = await prisma.recurrenceRule.create({
    data: {
      classId,
      frequency: input.frequency,
      interval: input.interval,
      byDay: input.byDay,
      startTime: input.startTime,
      startDate: input.startDate,
      endDate: input.endDate,
    },
  });

  // Generate sessions
  const sessions = generateSessionsFromRule(
    rule,
    classEntity,
    input.endDate ?? generateUntil
  );

  if (sessions.length > 0) {
    await prisma.classSession.createMany({
      data: sessions.map((session) => ({
        classId,
        gymId: classEntity.gymId,
        startTime: session.startTime,
        endTime: session.endTime,
      })),
    });
  }

  return { rule, sessionsCreated: sessions.length };
}

/**
 * Generate sessions from a recurrence rule
 */
function generateSessionsFromRule(
  rule: RecurrenceRule,
  classEntity: Class,
  until: Date
): Array<{ startTime: Date; endTime: Date }> {
  const sessions: Array<{ startTime: Date; endTime: Date }> = [];
  const dayNumbers = rule.byDay.map((day) => DAY_OF_WEEK_MAP[day as keyof typeof DAY_OF_WEEK_MAP]);

  let currentDate = new Date(rule.startDate);

  while (currentDate <= until) {
    const dayOfWeek = currentDate.getDay();

    if (dayNumbers.includes(dayOfWeek)) {
      const startTime = setTimeFromString(currentDate, rule.startTime);

      // Only add future sessions
      if (startTime > new Date()) {
        const endTime = addMinutes(startTime, classEntity.durationMinutes);
        sessions.push({ startTime, endTime });
      }
    }

    // Move to next day
    currentDate = addDays(currentDate, 1);

    // Apply interval for weekly/monthly
    if (rule.frequency === Frequency.WEEKLY && currentDate.getDay() === 0) {
      currentDate = addDays(currentDate, (rule.interval - 1) * 7);
    }
  }

  return sessions;
}

/**
 * Create a single session
 */
export async function createClassSession(input: CreateSessionInput): Promise<SessionResult> {
  const classEntity = await prisma.class.findUnique({
    where: { id: input.classId },
  });

  if (!classEntity) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Class not found',
      },
    };
  }

  const session = await prisma.classSession.create({
    data: {
      classId: input.classId,
      gymId: classEntity.gymId,
      startTime: input.startTime,
      endTime: input.endTime,
      capacityOverride: input.capacityOverride,
    },
  });

  return { success: true, session };
}

/**
 * Get session by ID
 */
export async function getSessionById(sessionId: string): Promise<ClassSession | null> {
  return prisma.classSession.findUnique({
    where: { id: sessionId },
  });
}

/**
 * Get session with details
 */
export async function getSessionWithDetails(sessionId: string) {
  return prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      class: {
        include: { instructor: true },
      },
      bookings: {
        include: { member: true },
        where: { status: { not: 'CANCELLED' } },
      },
      waitlist: {
        include: { member: true },
        orderBy: { position: 'asc' },
      },
    },
  });
}

/**
 * Cancel a session
 */
export async function cancelSession(
  sessionId: string,
  reason?: string
): Promise<SessionResult> {
  const session = await prisma.classSession.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: reason,
    },
  });

  // Cancel all bookings for this session
  await prisma.booking.updateMany({
    where: { sessionId, status: 'CONFIRMED' },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });

  return { success: true, session };
}

/**
 * Get upcoming sessions for a gym
 */
export async function getUpcomingSessions(
  gymId: string,
  options: { from?: Date; to?: Date; classId?: string; limit?: number } = {}
): Promise<ClassSession[]> {
  const { from = new Date(), to = addDays(new Date(), 7), classId, limit = 50 } = options;

  return prisma.classSession.findMany({
    where: {
      gymId,
      startTime: { gte: from, lte: to },
      status: SessionStatus.SCHEDULED,
      ...(classId ? { classId } : {}),
    },
    include: {
      class: {
        include: { instructor: true },
      },
      _count: {
        select: { bookings: { where: { status: 'CONFIRMED' } } },
      },
    },
    orderBy: { startTime: 'asc' },
    take: limit,
  });
}

/**
 * Get session availability
 */
export async function getSessionAvailability(sessionId: string): Promise<{
  capacity: number;
  booked: number;
  available: number;
  waitlistCount: number;
}> {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      class: true,
      _count: {
        select: {
          bookings: { where: { status: 'CONFIRMED' } },
          waitlist: true,
        },
      },
    },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  const capacity = session.capacityOverride ?? session.class.capacity;
  const booked = session._count.bookings;

  return {
    capacity,
    booked,
    available: Math.max(0, capacity - booked),
    waitlistCount: session._count.waitlist,
  };
}
