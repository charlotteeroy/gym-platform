import { prisma, type Gym, type Staff, StaffRole } from '@gym/database';
import {
  type CreateGymInput,
  type UpdateGymInput,
  type CreateStaffInput,
  slugify,
  ERROR_CODES,
  type ApiError,
} from '@gym/shared';
import { hashPassword } from './auth.service';

export type GymResult =
  | { success: true; gym: Gym }
  | { success: false; error: ApiError };

export type GymWithStaff = Gym & { staff: Staff[] };

/**
 * Create a new gym with an owner
 */
export async function createGym(
  input: CreateGymInput,
  ownerData: Omit<CreateStaffInput, 'role'>
): Promise<{ success: true; gym: Gym; owner: Staff } | { success: false; error: ApiError }> {
  // Check if slug is available
  const existingGym = await prisma.gym.findUnique({
    where: { slug: input.slug },
  });

  if (existingGym) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.ALREADY_EXISTS,
        message: 'A gym with this URL slug already exists',
      },
    };
  }

  // Check if owner email is already in use
  const existingUser = await prisma.user.findUnique({
    where: { email: ownerData.email },
  });

  if (existingUser) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.ALREADY_EXISTS,
        message: 'A user with this email already exists',
      },
    };
  }

  // Hash owner password
  const passwordHash = await hashPassword(ownerData.password);

  // Create gym, user, and owner staff in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create gym
    const gym = await tx.gym.create({
      data: {
        name: input.name,
        slug: input.slug,
        email: input.email,
        phone: input.phone,
        address: input.address,
        timezone: input.timezone,
        currency: input.currency,
      },
    });

    // Create user for owner
    const user = await tx.user.create({
      data: {
        email: ownerData.email,
        passwordHash,
      },
    });

    // Create owner staff
    const owner = await tx.staff.create({
      data: {
        firstName: ownerData.firstName,
        lastName: ownerData.lastName,
        email: ownerData.email,
        phone: ownerData.phone,
        role: StaffRole.OWNER,
        hourlyRate: ownerData.hourlyRate,
        userId: user.id,
        gymId: gym.id,
      },
    });

    return { gym, owner };
  });

  return { success: true, ...result };
}

/**
 * Get a gym by ID
 */
export async function getGymById(gymId: string): Promise<Gym | null> {
  return prisma.gym.findUnique({
    where: { id: gymId },
  });
}

/**
 * Get a gym by slug
 */
export async function getGymBySlug(slug: string): Promise<Gym | null> {
  return prisma.gym.findUnique({
    where: { slug },
  });
}

/**
 * Get gym with staff
 */
export async function getGymWithStaff(gymId: string): Promise<GymWithStaff | null> {
  return prisma.gym.findUnique({
    where: { id: gymId },
    include: {
      staff: {
        where: { isActive: true },
        orderBy: { firstName: 'asc' },
      },
    },
  });
}

/**
 * Update a gym
 */
export async function updateGym(gymId: string, input: UpdateGymInput): Promise<GymResult> {
  // If slug is being changed, check availability
  if (input.slug) {
    const existingGym = await prisma.gym.findFirst({
      where: {
        slug: input.slug,
        id: { not: gymId },
      },
    });

    if (existingGym) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.ALREADY_EXISTS,
          message: 'A gym with this URL slug already exists',
        },
      };
    }
  }

  const gym = await prisma.gym.update({
    where: { id: gymId },
    data: input,
  });

  return { success: true, gym };
}

/**
 * Check if a slug is available
 */
export async function isSlugAvailable(slug: string, excludeGymId?: string): Promise<boolean> {
  const gym = await prisma.gym.findFirst({
    where: {
      slug,
      ...(excludeGymId ? { id: { not: excludeGymId } } : {}),
    },
  });

  return !gym;
}

/**
 * Generate a unique slug from a name
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 1;

  while (!(await isSlugAvailable(slug))) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Get gym stats
 */
export async function getGymStats(gymId: string): Promise<{
  totalMembers: number;
  activeMembers: number;
  totalClasses: number;
  upcomingSessions: number;
}> {
  const now = new Date();

  const [totalMembers, activeMembers, totalClasses, upcomingSessions] = await Promise.all([
    prisma.member.count({ where: { gymId } }),
    prisma.member.count({ where: { gymId, status: 'ACTIVE' } }),
    prisma.class.count({ where: { gymId, isActive: true } }),
    prisma.classSession.count({
      where: {
        gymId,
        startTime: { gte: now },
        status: 'SCHEDULED',
      },
    }),
  ]);

  return {
    totalMembers,
    activeMembers,
    totalClasses,
    upcomingSessions,
  };
}
