import {
  prisma,
  type Class,
  type ClassSession,
  type RecurrenceRule,
  SessionStatus,
} from '@gym/database';
import {
  type CreateClassInput,
  type UpdateClassInput,
  type RecurrenceRuleInput,
  type CreateSessionInput,
  ERROR_CODES,
  type ApiError,
  addDays,
  setTimeFromString,
  DAY_OF_WEEK_MAP,
  type DayOfWeek,
} from '@gym/shared';

export type ClassResult =
  | { success: true; class: Class }
  | { success: false; error: ApiError };

export type SessionResult =
  | { success: true; session: ClassSession }
  | { success: false; error: ApiError };

/**
 * Create a new class
 */
export async function createClass(gymId: string, input: CreateClassInput): Promise<ClassResult> {
  const classData = await prisma.class.create({
    data: {
      ...input,
      gymId,
    },
  });

  return { success: true, class: classData };
}

/**
 * Get class by ID
 */
export async function getClassById(classId: string): Promise<Class | null> {
  return prisma.class.findUnique({
    where: { id: classId },
    include: { instructor: true },
  });
}

/**
 * Update a class
 */
export async function updateClass(
  classId: string,
  input: UpdateClassInput
): Promise<ClassResult> {
  const existingClass = await prisma.class.findUnique({
    where: { id: classId },
  });

  if (!existingClass) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Class not found' },
    };
  }

  const updatedClass = await prisma.class.update({
    where: { id: classId },
    data: input,
  });

  return { success: true, class: updatedClass };
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
 * Create a single class session
 */
export async function createSession(
  gymId: string,
  input: CreateSessionInput
): Promise<SessionResult> {
  const classData = await prisma.class.findUnique({
    where: { id: input.classId },
  });

  if (!classData) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Class not found' },
    };
  }

  if (classData.gymId !== gymId) {
    return {
      success: false,
      error: { code: ERROR_CODES.FORBIDDEN, message: 'Class does not belong to this gym' },
    };
  }

  const session = await prisma.classSession.create({
    data: {
      classId: input.classId,
      gymId,
      startTime: input.startTime,
      endTime: input.endTime,
      capacityOverride: input.capacityOverride,
    },
  });

  return { success: true, session };
}

/**
 * Create a recurrence rule and generate sessions
 */
export async function createRecurringSchedule(
  gymId: string,
  classId: string,
  input: RecurrenceRuleInput,
  generateWeeks = 4
): Promise<{ rule: RecurrenceRule; sessionsCreated: number }> {
  const classData = await prisma.class.findUnique({
    where: { id: classId },
  });

  if (!classData || classData.gymId !== gymId) {
    throw new Error('Class not found');
  }

  // Create recurrence rule
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
  const sessions = generateSessionsFromRule(rule, classData, gymId, generateWeeks);

  await prisma.classSession.createMany({
    data: sessions,
  });

  return { rule, sessionsCreated: sessions.length };
}

/**
 * Generate session data from a recurrence rule
 */
function generateSessionsFromRule(
  rule: RecurrenceRule,
  classData: Class,
  gymId: string,
  weeks: number
): Array<{
  classId: string;
  gymId: string;
  startTime: Date;
  endTime: Date;
}> {
  const sessions: Array<{
    classId: string;
    gymId: string;
    startTime: Date;
    endTime: Date;
  }> = [];

  const endDate = rule.endDate || addDays(new Date(), weeks * 7);
  let currentDate = new Date(rule.startDate);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();

    // Check if this day is in the schedule
    const dayMatches = rule.byDay.some(
      (day) => DAY_OF_WEEK_MAP[day as DayOfWeek] === dayOfWeek
    );

    if (dayMatches) {
      const startTime = setTimeFromString(currentDate, rule.startTime);
      const endTime = new Date(startTime.getTime() + classData.durationMinutes * 60 * 1000);

      // Only add future sessions
      if (startTime > new Date()) {
        sessions.push({
          classId: classData.id,
          gymId,
          startTime,
          endTime,
        });
      }
    }

    // Move to next day (adjust for interval if weekly/monthly)
    currentDate = addDays(currentDate, 1);
  }

  return sessions;
}

/**
 * Cancel a class session
 */
export async function cancelSession(
  sessionId: string,
  reason?: string
): Promise<SessionResult> {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Session not found' },
    };
  }

  const updatedSession = await prisma.classSession.update({
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

  // Remove waitlist entries
  await prisma.waitlistEntry.deleteMany({
    where: { sessionId },
  });

  return { success: true, session: updatedSession };
}

/**
 * Get upcoming sessions for a gym
 */
export async function getUpcomingSessions(
  gymId: string,
  options: { days?: number; classId?: string } = {}
): Promise<ClassSession[]> {
  const { days = 7, classId } = options;
  const now = new Date();
  const endDate = addDays(now, days);

  return prisma.classSession.findMany({
    where: {
      gymId,
      startTime: { gte: now, lte: endDate },
      status: SessionStatus.SCHEDULED,
      ...(classId ? { classId } : {}),
    },
    include: {
      class: { include: { instructor: true } },
      _count: { select: { bookings: { where: { status: 'CONFIRMED' } } } },
    },
    orderBy: { startTime: 'asc' },
  });
}

/**
 * Get session details with bookings
 */
export async function getSessionWithBookings(sessionId: string) {
  return prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      class: { include: { instructor: true } },
      bookings: {
        where: { status: 'CONFIRMED' },
        include: { member: true },
      },
      waitlist: {
        orderBy: { position: 'asc' },
        include: { member: true },
      },
    },
  });
}
