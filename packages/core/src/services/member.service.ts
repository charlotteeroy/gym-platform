import { prisma, type Member, type CheckIn, MemberStatus, CheckInMethod } from '@gym/database';
import {
  type CreateMemberInput,
  type UpdateMemberInput,
  type MemberFilterInput,
  type PaginatedResponse,
  ERROR_CODES,
  type ApiError,
} from '@gym/shared';
import { hashPassword } from './auth.service';
import { getActivePasses, deductCredit } from './pass.service';

export type MemberResult =
  | { success: true; member: Member }
  | { success: false; error: ApiError };

export type MemberWithSubscription = Member & {
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: Date;
    plan: {
      id: string;
      name: string;
    };
  } | null;
};

/**
 * Create a new member
 */
export async function createMember(
  gymId: string,
  input: CreateMemberInput,
  password?: string
): Promise<MemberResult> {
  // Check if member already exists in this gym
  const existingMember = await prisma.member.findUnique({
    where: {
      gymId_email: {
        gymId,
        email: input.email,
      },
    },
  });

  if (existingMember) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.ALREADY_EXISTS,
        message: 'A member with this email already exists',
      },
    };
  }

  // Check if user exists with this email
  let user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  // If user doesn't exist and password provided, create user
  if (!user && password) {
    const passwordHash = await hashPassword(password);
    user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
      },
    });
  } else if (!user) {
    // Generate a temporary password for the user
    const tempPassword = Math.random().toString(36).slice(-12);
    const passwordHash = await hashPassword(tempPassword);
    user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
      },
    });
    // TODO: Send welcome email with password reset link
  }

  // Create member
  const member = await prisma.member.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      dateOfBirth: input.dateOfBirth,
      emergencyContact: input.emergencyContact,
      notes: input.notes,
      userId: user.id,
      gymId,
    },
  });

  return { success: true, member };
}

/**
 * Get member by ID
 */
export async function getMemberById(memberId: string): Promise<Member | null> {
  return prisma.member.findUnique({
    where: { id: memberId },
  });
}

/**
 * Get member by ID with subscription
 */
export async function getMemberWithSubscription(
  memberId: string
): Promise<MemberWithSubscription | null> {
  return prisma.member.findUnique({
    where: { id: memberId },
    include: {
      subscription: {
        include: {
          plan: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Get member by user ID
 */
export async function getMemberByUserId(userId: string, gymId: string): Promise<Member | null> {
  return prisma.member.findFirst({
    where: { userId, gymId },
  });
}

/**
 * Update a member
 */
export async function updateMember(memberId: string, input: UpdateMemberInput): Promise<MemberResult> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
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

  // If email is being changed, check it's not already in use
  if (input.email && input.email !== member.email) {
    const existingMember = await prisma.member.findUnique({
      where: {
        gymId_email: {
          gymId: member.gymId,
          email: input.email,
        },
      },
    });

    if (existingMember) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.ALREADY_EXISTS,
          message: 'A member with this email already exists',
        },
      };
    }
  }

  const updatedMember = await prisma.member.update({
    where: { id: memberId },
    data: input,
  });

  return { success: true, member: updatedMember };
}

/**
 * Update member status
 */
export async function updateMemberStatus(
  memberId: string,
  status: MemberStatus
): Promise<MemberResult> {
  const member = await prisma.member.update({
    where: { id: memberId },
    data: { status },
  });

  return { success: true, member };
}

// Extended member type with calculated fields
type MemberWithActivity = Member & {
  visitCount?: number;
  lastActivity?: Date | null;
  planName?: string | null;
  subscriptionStatus?: string | null;
  totalPassCredits?: number;
  bonusBalanceAmount?: number;
};

/**
 * List members with pagination and filtering
 */
export async function listMembers(
  gymId: string,
  filters: MemberFilterInput
): Promise<PaginatedResponse<MemberWithActivity>> {
  const { status, search, tags, activityLevel, page, limit, sortBy, sortOrder } = filters;

  // Build base where clause
  // When filtering by activityLevel (but no explicit status), default to ACTIVE members
  // to match the insights API which only counts ACTIVE members in activity distribution
  const effectiveStatus = status || (activityLevel ? 'ACTIVE' : undefined);

  const baseWhere: Record<string, unknown> = {
    gymId,
    ...(effectiveStatus ? { status: effectiveStatus } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  // Add tags filter
  if (tags && tags.length > 0) {
    baseWhere.tags = {
      some: {
        tagId: { in: tags },
      },
    };
  }

  // For activity-based filtering and sorting, we need to fetch with check-in counts
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Get all matching members with their check-in counts, subscription, passes, and bonus balance
  const membersWithCheckIns = await prisma.member.findMany({
    where: baseWhere,
    include: {
      checkIns: {
        where: { checkedInAt: { gte: thirtyDaysAgo } },
        select: { id: true, checkedInAt: true },
      },
      tags: {
        include: { tag: { select: { id: true, name: true, color: true } } },
      },
      subscription: {
        select: {
          status: true,
          plan: { select: { name: true } },
        },
      },
      passes: {
        where: { status: 'ACTIVE' },
        select: { creditsRemaining: true },
      },
      bonusBalance: {
        select: { currentBalance: true },
      },
    },
  });

  // Calculate activity metrics for each member
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  let processedMembers = membersWithCheckIns.map((member) => {
    const visitCount = member.checkIns.length;
    const lastCheckIn = member.checkIns.length > 0
      ? member.checkIns.reduce((latest, current) =>
          current.checkedInAt > latest.checkedInAt ? current : latest
        )
      : null;

    // Determine activity level based on visit count in last 30 days
    // Note: 'declining' is handled separately via isDeclining flag (based on recency, not count)
    let memberActivityLevel: 'high' | 'medium' | 'low' | 'inactive';
    if (visitCount >= 12) {
      memberActivityLevel = 'high';
    } else if (visitCount >= 4) {
      memberActivityLevel = 'medium';
    } else if (visitCount >= 1) {
      memberActivityLevel = 'low';
    } else {
      memberActivityLevel = 'inactive';
    }

    // Check if declining (active member who hasn't visited in 14+ days)
    const isDeclining = member.status === 'ACTIVE' &&
      (!lastCheckIn || lastCheckIn.checkedInAt < fourteenDaysAgo);

    // Compute subscription, pass, and bonus balance summaries
    const planName = member.subscription?.plan?.name ?? null;
    const subscriptionStatus = member.subscription?.status ?? null;
    const totalPassCredits = member.passes?.reduce((sum, p) => sum + p.creditsRemaining, 0) ?? 0;
    const bonusBalanceAmount = member.bonusBalance ? Number(member.bonusBalance.currentBalance) : 0;

    return {
      ...member,
      checkIns: undefined, // Remove the raw checkIns array
      passes: undefined, // Remove raw passes array
      bonusBalance: undefined, // Remove raw bonusBalance object
      subscription: undefined, // Remove raw subscription object
      visitCount,
      lastActivity: lastCheckIn?.checkedInAt ?? null,
      activityLevel: memberActivityLevel,
      isDeclining,
      planName,
      subscriptionStatus,
      totalPassCredits,
      bonusBalanceAmount,
    };
  });

  // Filter by activity level if specified
  if (activityLevel) {
    if (activityLevel === 'declining') {
      processedMembers = processedMembers.filter((m) => m.isDeclining);
    } else {
      processedMembers = processedMembers.filter(
        (m) => m.activityLevel === activityLevel
      );
    }
  }

  // Sort
  if (sortBy === 'visitCount') {
    processedMembers.sort((a, b) =>
      sortOrder === 'desc' ? b.visitCount - a.visitCount : a.visitCount - b.visitCount
    );
  } else if (sortBy === 'lastActivity') {
    processedMembers.sort((a, b) => {
      const aTime = a.lastActivity?.getTime() ?? 0;
      const bTime = b.lastActivity?.getTime() ?? 0;
      return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
    });
  } else {
    // Default Prisma-like sorting for other fields
    processedMembers.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortBy];
      const bVal = (b as Record<string, unknown>)[sortBy];
      if (aVal === null || aVal === undefined) return sortOrder === 'desc' ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortOrder === 'desc' ? -1 : 1;
      if (aVal < bVal) return sortOrder === 'desc' ? 1 : -1;
      if (aVal > bVal) return sortOrder === 'desc' ? -1 : 1;
      return 0;
    });
  }

  const total = processedMembers.length;

  // Paginate
  const items = processedMembers.slice((page - 1) * limit, page * limit).map((m) => {
    // Remove internal fields from the returned object
    const { activityLevel: _activityLevel, isDeclining: _isDeclining, ...rest } = m;
    return rest as MemberWithActivity;
  });

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Check in a member
 *
 * Access hierarchy: Subscription → Active Pass → Staff Override → Denied
 */
export async function checkInMember(
  memberId: string,
  method: CheckInMethod = CheckInMethod.MANUAL,
  options?: {
    memberPassId?: string;
    isOverride?: boolean;
    overrideBy?: string;
    notes?: string;
  }
): Promise<{ success: true; checkIn: CheckIn } | { success: false; error: ApiError }> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { subscription: true },
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

  if (member.status !== MemberStatus.ACTIVE) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.FORBIDDEN,
        message: 'Member is not active',
      },
    };
  }

  const hasActiveSubscription =
    member.subscription &&
    (member.subscription.status === 'ACTIVE' || member.subscription.status === 'PAST_DUE');

  let memberPassId: string | undefined;
  let creditsUsed = 0;

  if (hasActiveSubscription) {
    // Subscription-based check-in — no pass needed
  } else if (options?.memberPassId) {
    // Pass-based check-in — deduct credit
    const result = await deductCredit(options.memberPassId, 1);
    if (!result.success) {
      return {
        success: false,
        error: {
          code: 'PASS_ERROR',
          message: result.error.message,
        },
      };
    }
    memberPassId = options.memberPassId;
    creditsUsed = 1;
  } else if (!options?.isOverride) {
    // No subscription, no pass specified — try to auto-select a pass
    const activePasses = await getActivePasses(memberId);
    const passToUse = activePasses[0];
    if (passToUse) {
      // Use the pass closest to expiring first
      const result = await deductCredit(passToUse.id, 1);
      if (!result.success) {
        return {
          success: false,
          error: {
            code: 'PASS_ERROR',
            message: result.error.message,
          },
        };
      }
      memberPassId = passToUse.id;
      creditsUsed = 1;
    } else {
      return {
        success: false,
        error: {
          code: 'ACCESS_REQUIRED',
          message: 'No active subscription or pass with remaining credits',
        },
      };
    }
  }
  // If isOverride is true, we skip all access checks

  const checkIn = await prisma.checkIn.create({
    data: {
      memberId,
      gymId: member.gymId,
      method,
      memberPassId: memberPassId || undefined,
      creditsUsed,
      isOverride: options?.isOverride || false,
      overrideBy: options?.overrideBy || undefined,
      notes: options?.notes || undefined,
    },
  });

  return { success: true, checkIn };
}

/**
 * Check out a member (record exit time)
 */
export async function checkOutMember(
  checkInId: string,
  notes?: string
): Promise<{ success: true; checkIn: CheckIn } | { success: false; error: ApiError }> {
  const checkIn = await prisma.checkIn.findUnique({
    where: { id: checkInId },
  });

  if (!checkIn) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Check-in record not found',
      },
    };
  }

  if (checkIn.checkedOutAt) {
    return {
      success: false,
      error: {
        code: 'ALREADY_CHECKED_OUT',
        message: 'Member has already checked out',
      },
    };
  }

  const updated = await prisma.checkIn.update({
    where: { id: checkInId },
    data: {
      checkedOutAt: new Date(),
      ...(notes ? { notes: checkIn.notes ? `${checkIn.notes}\n${notes}` : notes } : {}),
    },
  });

  return { success: true, checkIn: updated };
}

/**
 * Get member check-in history
 */
export async function getMemberCheckIns(
  memberId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<CheckIn[]> {
  const { limit = 50, offset = 0 } = options;

  return prisma.checkIn.findMany({
    where: { memberId },
    orderBy: { checkedInAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Get member stats
 */
export async function getMemberStats(
  memberId: string
): Promise<{
  totalCheckIns: number;
  checkInsThisMonth: number;
  totalBookings: number;
  upcomingBookings: number;
}> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalCheckIns, checkInsThisMonth, totalBookings, upcomingBookings] = await Promise.all([
    prisma.checkIn.count({ where: { memberId } }),
    prisma.checkIn.count({
      where: {
        memberId,
        checkedInAt: { gte: startOfMonth },
      },
    }),
    prisma.booking.count({
      where: {
        memberId,
        status: { in: ['CONFIRMED', 'ATTENDED'] },
      },
    }),
    prisma.booking.count({
      where: {
        memberId,
        status: 'CONFIRMED',
        session: {
          startTime: { gte: now },
        },
      },
    }),
  ]);

  return {
    totalCheckIns,
    checkInsThisMonth,
    totalBookings,
    upcomingBookings,
  };
}

/**
 * Delete a member
 */
export async function deleteMember(memberId: string): Promise<{ success: boolean; error?: ApiError }> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
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

  await prisma.member.delete({
    where: { id: memberId },
  });

  return { success: true };
}

export type MemberAnalytics = {
  dailyActivity: Array<{ date: string; checkIns: number; bookings: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
  summary: {
    totalCheckIns: number;
    avgWeeklyVisits: number;
    mostActiveHour: number | null;
    mostActiveDay: string | null;
    streakDays: number;
    lastVisit: Date | null;
  };
};

/**
 * Get member analytics for charts
 */
export async function getMemberAnalytics(
  memberId: string,
  days: number = 30
): Promise<MemberAnalytics> {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Get all check-ins for the period
  const checkIns = await prisma.checkIn.findMany({
    where: {
      memberId,
      checkedInAt: { gte: startDate },
    },
    orderBy: { checkedInAt: 'asc' },
  });

  // Get all bookings for the period
  const bookings = await prisma.booking.findMany({
    where: {
      memberId,
      status: { in: ['CONFIRMED', 'ATTENDED'] },
      createdAt: { gte: startDate },
    },
    include: {
      session: true,
    },
  });

  // Calculate daily activity
  const dailyMap: Record<string, { checkIns: number; bookings: number }> = {};

  // Helper to get date string
  const toDateStr = (date: Date): string => date.toISOString().slice(0, 10);

  // Initialize all days
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = toDateStr(date);
    dailyMap[dateStr] = { checkIns: 0, bookings: 0 };
  }

  // Count check-ins per day
  checkIns.forEach((checkIn) => {
    const dateStr = toDateStr(checkIn.checkedInAt);
    if (dailyMap[dateStr]) {
      dailyMap[dateStr].checkIns++;
    }
  });

  // Count bookings per day
  bookings.forEach((booking) => {
    const dateStr = toDateStr(booking.createdAt);
    if (dailyMap[dateStr]) {
      dailyMap[dateStr].bookings++;
    }
  });

  const dailyActivity = Object.entries(dailyMap)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calculate hourly distribution
  const hourlyMap: Record<number, number> = {};
  for (let i = 0; i < 24; i++) {
    hourlyMap[i] = 0;
  }

  checkIns.forEach((checkIn) => {
    const hour = checkIn.checkedInAt.getHours();
    if (hourlyMap[hour] !== undefined) {
      hourlyMap[hour]++;
    }
  });

  const hourlyDistribution = Object.entries(hourlyMap)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => a.hour - b.hour);

  // Find most active hour
  const maxHourCount = Math.max(...hourlyDistribution.map((h) => h.count));
  const mostActiveHour = maxHourCount > 0
    ? hourlyDistribution.find((h) => h.count === maxHourCount)?.hour ?? null
    : null;

  // Calculate day of week distribution
  const dayMap: Record<string, number> = {
    Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0,
    Thursday: 0, Friday: 0, Saturday: 0,
  };
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  checkIns.forEach((checkIn) => {
    const dayIndex = checkIn.checkedInAt.getDay();
    const dayName = dayNames[dayIndex];
    if (dayName && dayMap[dayName] !== undefined) {
      dayMap[dayName]++;
    }
  });

  const maxDayCount = Math.max(...Object.values(dayMap));
  const mostActiveDay = maxDayCount > 0
    ? Object.entries(dayMap).find(([, count]) => count === maxDayCount)?.[0] ?? null
    : null;

  // Calculate average weekly visits
  const totalCheckIns = checkIns.length;
  const weeks = days / 7;
  const avgWeeklyVisits = weeks > 0 ? Math.round((totalCheckIns / weeks) * 10) / 10 : 0;

  // Calculate streak (consecutive days with check-ins)
  let streakDays = 0;
  const today = toDateStr(new Date());
  const sortedDates = [...new Set(checkIns.map((c) => toDateStr(c.checkedInAt)))].sort().reverse();

  if (sortedDates.length > 0) {
    let currentDate = new Date();
    for (const dateStr of sortedDates) {
      const checkDate = toDateStr(currentDate);
      if (dateStr === checkDate) {
        streakDays++;
        currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
      } else if (dateStr < checkDate) {
        // Check if they visited yesterday
        currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
        if (dateStr === toDateStr(currentDate)) {
          streakDays++;
          currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
        } else {
          break;
        }
      }
    }
  }

  // Get last visit
  const lastCheckIn = await prisma.checkIn.findFirst({
    where: { memberId },
    orderBy: { checkedInAt: 'desc' },
  });

  return {
    dailyActivity,
    hourlyDistribution,
    summary: {
      totalCheckIns,
      avgWeeklyVisits,
      mostActiveHour,
      mostActiveDay,
      streakDays,
      lastVisit: lastCheckIn?.checkedInAt ?? null,
    },
  };
}

export type MemberProfile = {
  member: Member;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: Date;
    plan: { id: string; name: string };
  } | null;
  tags: Array<{ id: string; name: string; color: string }>;
  stats: {
    totalCheckIns: number;
    checkInsThisMonth: number;
    totalBookings: number;
    upcomingBookings: number;
  };
  recentActivity: Array<{
    type: 'check_in' | 'booking' | 'tag_added';
    timestamp: Date;
    description: string;
  }>;
};

/**
 * Get full member profile with all related data
 */
export async function getMemberProfile(memberId: string): Promise<MemberProfile | null> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      subscription: {
        include: {
          plan: {
            select: { id: true, name: true },
          },
        },
      },
      tags: {
        include: {
          tag: {
            select: { id: true, name: true, color: true },
          },
        },
        orderBy: { appliedAt: 'desc' },
      },
    },
  });

  if (!member) {
    return null;
  }

  // Get stats
  const stats = await getMemberStats(memberId);

  // Get recent activity
  const [recentCheckIns, recentBookings] = await Promise.all([
    prisma.checkIn.findMany({
      where: { memberId },
      orderBy: { checkedInAt: 'desc' },
      take: 10,
    }),
    prisma.booking.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        session: {
          include: {
            class: true,
          },
        },
      },
    }),
  ]);

  const recentActivity: MemberProfile['recentActivity'] = [
    ...recentCheckIns.map((c) => ({
      type: 'check_in' as const,
      timestamp: c.checkedInAt,
      description: `Checked in via ${c.method.toLowerCase().replace('_', ' ')}`,
    })),
    ...recentBookings.map((b) => ({
      type: 'booking' as const,
      timestamp: b.createdAt,
      description: `Booked ${b.session.class.name}`,
    })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 15);

  return {
    member,
    subscription: member.subscription,
    tags: member.tags.map((mt) => mt.tag),
    stats,
    recentActivity,
  };
}
