import { getMemberById, removeTagFromMember } from '@gym/core';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api';

// DELETE /api/members/[id]/tags/[tagId] - Remove a tag from a member
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const { id, tagId } = await params;
    const member = await getMemberById(id);

    if (!member) {
      return apiNotFound('Member not found');
    }

    // Verify staff access
    const staff = await getStaffWithGym();
    if (!staff || staff.gymId !== member.gymId) {
      return apiForbidden('You do not have access to this member');
    }

    const result = await removeTagFromMember(id, tagId);

    if (!result.success) {
      return apiError(result.error!, 400);
    }

    return apiSuccess({ success: true });
  } catch (error) {
    console.error('Remove tag from member error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to remove tag from member' }, 500);
  }
}
