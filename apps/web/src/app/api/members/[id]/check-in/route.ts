import { getMemberById, checkInMember } from '@gym/core';
import { getSession, getCurrentStaff } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api';

// POST /api/members/[id]/check-in - Check in a member
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
    const staff = await getCurrentStaff(member.gymId);
    if (!staff) {
      return apiForbidden('You do not have access to this member');
    }

    const result = await checkInMember(id);

    if (!result.success) {
      return apiError(result.error, 400);
    }

    return apiSuccess(result.checkIn, 201);
  } catch (error) {
    console.error('Check-in error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to check in member' }, 500);
  }
}
