import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api';
import { z } from 'zod';

const updateStaffSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional().nullable(),
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR', 'FRONT_DESK']).optional(),
  hireDate: z.string().optional(),
  hourlyRate: z.number().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
  // Profile fields
  bio: z.string().max(2000).optional().nullable(),
  specialties: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  instagramUrl: z.string().max(100).optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable(),
  isPublicProfile: z.boolean().optional(),
});

// GET /api/admin/staff/[id] - Get staff member details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const currentStaff = await getStaffWithGym();
    if (!currentStaff) {
      return apiForbidden('You do not have access to any gym');
    }

    // Only allow OWNER, ADMIN, MANAGER to view staff details
    if (!['OWNER', 'ADMIN', 'MANAGER'].includes(currentStaff.role)) {
      return apiForbidden('You do not have permission to view staff details');
    }

    const { id } = await params;

    const staffMember = await prisma.staff.findFirst({
      where: {
        id,
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
        bio: true,
        specialties: true,
        certifications: true,
        instagramUrl: true,
        linkedinUrl: true,
        isPublicProfile: true,
        createdAt: true,
        updatedAt: true,
        instructorClasses: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!staffMember) {
      return apiNotFound('Staff member not found');
    }

    return apiSuccess(staffMember);
  } catch (error) {
    console.error('Get staff error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get staff member' }, 500);
  }
}

// PATCH /api/admin/staff/[id] - Update staff member
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const currentStaff = await getStaffWithGym();
    if (!currentStaff) {
      return apiForbidden('You do not have access to any gym');
    }

    // Only OWNER and ADMIN can update staff
    if (!['OWNER', 'ADMIN'].includes(currentStaff.role)) {
      return apiForbidden('You do not have permission to update staff');
    }

    const { id } = await params;

    // Check if staff exists
    const existingStaff = await prisma.staff.findFirst({
      where: {
        id,
        gymId: currentStaff.gymId,
      },
    });

    if (!existingStaff) {
      return apiNotFound('Staff member not found');
    }

    // Cannot demote or deactivate an OWNER if you're not an OWNER
    if (existingStaff.role === 'OWNER' && currentStaff.role !== 'OWNER') {
      return apiForbidden('Only owners can modify owner accounts');
    }

    const body = await request.json();
    const parsed = updateStaffSchema.safeParse(body);

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

    // Check for duplicate email if changing email
    if (parsed.data.email && parsed.data.email !== existingStaff.email) {
      const duplicateEmail = await prisma.staff.findFirst({
        where: {
          gymId: currentStaff.gymId,
          email: parsed.data.email,
          id: { not: id },
        },
      });

      if (duplicateEmail) {
        return apiError({ code: 'DUPLICATE_EMAIL', message: 'A staff member with this email already exists' }, 400);
      }
    }

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.hireDate) {
      updateData.hireDate = new Date(parsed.data.hireDate);
    }

    const updatedStaff = await prisma.staff.update({
      where: { id },
      data: updateData,
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
        bio: true,
        specialties: true,
        certifications: true,
        instagramUrl: true,
        linkedinUrl: true,
        isPublicProfile: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess(updatedStaff);
  } catch (error) {
    console.error('Update staff error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update staff member' }, 500);
  }
}

// DELETE /api/admin/staff/[id] - Delete staff member
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const currentStaff = await getStaffWithGym();
    if (!currentStaff) {
      return apiForbidden('You do not have access to any gym');
    }

    // Only OWNER can delete staff
    if (currentStaff.role !== 'OWNER') {
      return apiForbidden('Only owners can delete staff members');
    }

    const { id } = await params;

    // Cannot delete yourself
    if (id === currentStaff.id) {
      return apiError({ code: 'SELF_DELETE', message: 'You cannot delete your own account' }, 400);
    }

    // Check if staff exists
    const existingStaff = await prisma.staff.findFirst({
      where: {
        id,
        gymId: currentStaff.gymId,
      },
    });

    if (!existingStaff) {
      return apiNotFound('Staff member not found');
    }

    // Delete staff member
    await prisma.staff.delete({
      where: { id },
    });

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error('Delete staff error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to delete staff member' }, 500);
  }
}
