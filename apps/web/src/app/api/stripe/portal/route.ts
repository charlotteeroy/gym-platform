import { createBillingPortalSession } from '@gym/core';
import { getSession, getCurrentMember } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const body = await request.json();
    const { gymId } = body;

    if (!gymId) {
      return apiError({ code: 'INVALID_INPUT', message: 'Gym ID is required' }, 400);
    }

    // Get member for this gym
    const member = await getCurrentMember(gymId);
    if (!member) {
      return apiError({ code: 'NOT_FOUND', message: 'Member not found' }, 404);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/dashboard`;

    const result = await createBillingPortalSession(member.id, returnUrl);

    if (!result.success) {
      return apiError(result.error, 400);
    }

    return apiSuccess({ url: result.sessionUrl });
  } catch (error) {
    console.error('Billing portal error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to access billing portal' }, 500);
  }
}
