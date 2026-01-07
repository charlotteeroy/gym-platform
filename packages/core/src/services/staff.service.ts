import { prisma, type Staff, StaffRole } from '@gym/database';
import {
  type CreateStaffInput,
  type UpdateStaffInput,
  ROLE_PERMISSIONS,
  ERROR_CODES,
  type ApiError,
} from '@gym/shared';
import { hashPassword } from './auth.service';

export type StaffResult =
  | { success: true; staff: Staff }
  | { success: false; error: ApiError };

/**
 * Create a new staff member
 */
export async function createStaff(gymId: string, input: CreateStaffInput): Promise<StaffResult> {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    // Check if they're already staff at this gym
    const existingStaff = await prisma.staff.findUnique({
      where: {
        gymId_email: {
          gymId,
          email: input.email,
        },
      },
    });

    if (existingStaff) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.ALREADY_EXISTS,
          message: 'A staff member with this email already exists',
        },
      };
    }
  }

  const passwordHash = await hashPassword(input.password);

  const result = await prisma.$transaction(async (tx) => {
    // Create or get user
    let user = await tx.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
        },
      });
    }

    // Create staff
    const staff = await tx.staff.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        role: input.role,
        hourlyRate: input.hourlyRate,
        userId: user.id,
        gymId,
      },
    });

    return staff;
  });

  return { success: true, staff: result };
}

/**
 * Get staff by ID
 */
export async function getStaffById(staffId: string): Promise<Staff | null> {
  return prisma.staff.findUnique({
    where: { id: staffId },
  });
}

/**
 * Get staff by user ID
 */
export async function getStaffByUserId(userId: string, gymId: string): Promise<Staff | null> {
  return prisma.staff.findFirst({
    where: { userId, gymId },
  });
}

/**
 * Update staff
 */
export async function updateStaff(staffId: string, input: UpdateStaffInput): Promise<StaffResult> {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
  });

  if (!staff) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Staff member not found',
      },
    };
  }

  // Check email uniqueness if changing
  if (input.email && input.email !== staff.email) {
    const existingStaff = await prisma.staff.findUnique({
      where: {
        gymId_email: {
          gymId: staff.gymId,
          email: input.email,
        },
      },
    });

    if (existingStaff) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.ALREADY_EXISTS,
          message: 'A staff member with this email already exists',
        },
      };
    }
  }

  const updatedStaff = await prisma.staff.update({
    where: { id: staffId },
    data: input,
  });

  return { success: true, staff: updatedStaff };
}

/**
 * Deactivate staff (soft delete)
 */
export async function deactivateStaff(staffId: string): Promise<StaffResult> {
  const staff = await prisma.staff.update({
    where: { id: staffId },
    data: { isActive: false },
  });

  return { success: true, staff };
}

/**
 * Reactivate staff
 */
export async function reactivateStaff(staffId: string): Promise<StaffResult> {
  const staff = await prisma.staff.update({
    where: { id: staffId },
    data: { isActive: true },
  });

  return { success: true, staff };
}

/**
 * List gym staff
 */
export async function listStaff(
  gymId: string,
  options: { includeInactive?: boolean; role?: StaffRole } = {}
): Promise<Staff[]> {
  const { includeInactive = false, role } = options;

  return prisma.staff.findMany({
    where: {
      gymId,
      ...(includeInactive ? {} : { isActive: true }),
      ...(role ? { role } : {}),
    },
    orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
  });
}

/**
 * Get instructors for a gym
 */
export async function listInstructors(gymId: string): Promise<Staff[]> {
  return prisma.staff.findMany({
    where: {
      gymId,
      isActive: true,
      role: { in: [StaffRole.INSTRUCTOR, StaffRole.OWNER, StaffRole.ADMIN, StaffRole.MANAGER] },
    },
    orderBy: { firstName: 'asc' },
  });
}

/**
 * Check if staff has permission
 */
export function hasPermission(role: StaffRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] as readonly string[];

  // Owner has all permissions
  if (permissions.includes('*')) {
    return true;
  }

  // Check exact match
  if (permissions.includes(permission)) {
    return true;
  }

  // Check wildcard permissions (e.g., "members:*" matches "members:create")
  const [resource] = permission.split(':');
  if (resource && permissions.includes(`${resource}:*`)) {
    return true;
  }

  return false;
}

/**
 * Check if staff can manage another staff member
 */
export function canManageStaff(managerRole: StaffRole, targetRole: StaffRole): boolean {
  const roleHierarchy: Record<StaffRole, number> = {
    OWNER: 5,
    ADMIN: 4,
    MANAGER: 3,
    INSTRUCTOR: 2,
    FRONT_DESK: 1,
  };

  return roleHierarchy[managerRole] > roleHierarchy[targetRole];
}
