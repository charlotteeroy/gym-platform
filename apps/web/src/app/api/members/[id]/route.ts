import { getMemberById, updateMember, deleteMember, checkInMember } from '@gym/core';
import { updateMemberSchema } from '@gym/shared';
import { getSession, getCurrentStaff } from '@/lib/auth';
import { apiSuccess, apiError, apiValidationError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api';

// GET /api/members/[id] - Get member details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const { id } = await params;
    const member = await getMemberById(id);

    if (!member) {
      return apiNotFound('Member not found');
    }

    // Verify staff access
    const staff = await getCurrentStaff(member.gymId);
    if (!staff) {
      return apiForbidden('You do not have access to this member');
    }

    return apiSuccess(member);
  } catch (error) {
    console.error('Get member error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get member' }, 500);
  }
}

// PATCH /api/members/[id] - Update member
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const { id } = await params;
    const member = await getMemberById(id);

    if (!member) {
      return apiNotFound('Member not found');
    }

    // Verify staff access
    const staff = await getCurrentStaff(member.gymId);
    if (!staff) {
      return apiForbidden('You do not have access to this member');
    }

    const body = await request.json();

    // Validate input
    const parsed = updateMemberSchema.safeParse(body);
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      parsed.error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      return apiValidationError(errors);
    }

    const result = await updateMember(id, parsed.data);

    if (!result.success) {
      return apiError(result.error, 400);
    }

    return apiSuccess(result.member);
  } catch (error) {
    console.error('Update member error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update member' }, 500);
  }
}

// DELETE /api/members/[id] - Delete member
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const { id } = await params;
    const member = await getMemberById(id);

    if (!member) {
      return apiNotFound('Member not found');
    }

    // Verify staff access
    const staff = await getCurrentStaff(member.gymId);
    if (!staff) {
      return apiForbidden('You do not have access to this member');
    }

    const result = await deleteMember(id);

    if (!result.success) {
      return apiError(result.error!, 400);
    }

    return apiSuccess({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Delete member error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to delete member' }, 500);
  }
}
