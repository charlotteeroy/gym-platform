import { getMemberById, getMemberProfile } from '@gym/core';
import { getSession, getCurrentStaff } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api';

// GET /api/members/[id]/profile - Get full member profile with stats
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

    const profile = await getMemberProfile(id);

    if (!profile) {
      return apiNotFound('Member not found');
    }

    return apiSuccess(profile);
  } catch (error) {
    console.error('Get member profile error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get member profile' }, 500);
  }
}
