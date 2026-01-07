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

/**
 * List members with pagination and filtering
 */
export async function listMembers(
  gymId: string,
  filters: MemberFilterInput
): Promise<PaginatedResponse<Member>> {
  const { status, search, page, limit, sortBy, sortOrder } = filters;

  const where = {
    gymId,
    ...(status ? { status } : {}),
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

  const [items, total] = await Promise.all([
    prisma.member.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.member.count({ where }),
  ]);

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
 */
export async function checkInMember(
  memberId: string,
  method: CheckInMethod = CheckInMethod.MANUAL
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

  // Check if subscription is valid
  if (
    member.subscription &&
    member.subscription.status !== 'ACTIVE' &&
    member.subscription.status !== 'PAST_DUE'
  ) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.SUBSCRIPTION_REQUIRED,
        message: 'Active subscription required',
      },
    };
  }

  const checkIn = await prisma.checkIn.create({
    data: {
      memberId,
      gymId: member.gymId,
      method,
    },
  });

  return { success: true, checkIn };
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
