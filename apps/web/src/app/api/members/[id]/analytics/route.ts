import { getMemberById, getMemberAnalytics } from '@gym/core';
import { getSession, getCurrentStaff } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api';

// GET /api/members/[id]/analytics - Get member activity analytics
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

    // Get days parameter from query string (default 30)
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const validDays = Math.min(Math.max(days, 7), 90); // Between 7 and 90 days

    const analytics = await getMemberAnalytics(id, validDays);

    return apiSuccess(analytics);
  } catch (error) {
    console.error('Get member analytics error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get member analytics' }, 500);
  }
}
