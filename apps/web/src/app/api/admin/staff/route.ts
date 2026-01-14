import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const createStaffSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  phone: z.string().max(20).optional().nullable(),
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR', 'FRONT_DESK']),
  hireDate: z.string().optional(),
  hourlyRate: z.number().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

// GET /api/admin/staff - List staff members
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return apiForbidden('You do not have access to any gym');
    }

    // Only allow OWNER, ADMIN, MANAGER to view staff
    if (!['OWNER', 'ADMIN', 'MANAGER'].includes(staff.role)) {
      return apiForbidden('You do not have permission to view staff');
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');

    const where: Record<string, unknown> = { gymId: staff.gymId };

    if (role) {
      where.role = role;
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const staffMembers = await prisma.staff.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        hireDate: true,
        hourlyRate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess(staffMembers);
  } catch (error) {
    console.error('List staff error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to list staff' }, 500);
  }
}

// POST /api/admin/staff - Create staff member
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const currentStaff = await getStaffWithGym();
    if (!currentStaff) {
      return apiForbidden('You do not have access to any gym');
    }

    // Only OWNER and ADMIN can create staff
    if (!['OWNER', 'ADMIN'].includes(currentStaff.role)) {
      return apiForbidden('You do not have permission to create staff');
    }

    const body = await request.json();
    const parsed = createStaffSchema.safeParse(body);

    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      parsed.error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      return apiError({ code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors }, 400);
    }

    // Check if email already exists in this gym
    const existingStaff = await prisma.staff.findFirst({
      where: {
        gymId: currentStaff.gymId,
        email: parsed.data.email,
      },
    });

    if (existingStaff) {
      return apiError({ code: 'DUPLICATE_EMAIL', message: 'A staff member with this email already exists' }, 400);
    }

    // Check if user exists with this email
    let user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    // Create user if doesn't exist
    if (!user) {
      const password = parsed.data.password || 'TempPassword123!';
      const passwordHash = await bcrypt.hash(password, 10);

      user = await prisma.user.create({
        data: {
          email: parsed.data.email,
          passwordHash,
        },
      });
    }

    // Create staff member
    const newStaff = await prisma.staff.create({
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        role: parsed.data.role,
        hireDate: parsed.data.hireDate ? new Date(parsed.data.hireDate) : new Date(),
        hourlyRate: parsed.data.hourlyRate || null,
        isActive: parsed.data.isActive ?? true,
        userId: user.id,
        gymId: currentStaff.gymId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        hireDate: true,
        hourlyRate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess(newStaff, 201);
  } catch (error) {
    console.error('Create staff error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create staff member' }, 500);
  }
}
