import { getMemberById, getMemberTags, addTagToMember, getTagById } from '@gym/core';
import { addMemberTagSchema } from '@gym/shared';
import { getSession, getCurrentStaff, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiValidationError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api';

// GET /api/members/[id]/tags - Get all tags for a member
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

    const tags = await getMemberTags(id);

    return apiSuccess({ tags });
  } catch (error) {
    console.error('Get member tags error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get member tags' }, 500);
  }
}

// POST /api/members/[id]/tags - Add a tag to a member
export async function POST(
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
    const staff = await getStaffWithGym();
    if (!staff || staff.gymId !== member.gymId) {
      return apiForbidden('You do not have access to this member');
    }

    const body = await request.json();

    // Validate input
    const parsed = addMemberTagSchema.safeParse(body);
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

    // Verify tag exists and belongs to same gym
    const tag = await getTagById(parsed.data.tagId);
    if (!tag || tag.gymId !== member.gymId) {
      return apiNotFound('Tag not found');
    }

    const result = await addTagToMember(id, parsed.data.tagId, staff.id);

    if (!result.success) {
      return apiError(result.error, 400);
    }

    return apiSuccess({ memberTag: result.memberTag }, 201);
  } catch (error) {
    console.error('Add tag to member error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to add tag to member' }, 500);
  }
}
