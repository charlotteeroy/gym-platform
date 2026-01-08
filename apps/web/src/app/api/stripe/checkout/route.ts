import { createCheckoutSession } from '@gym/core';
import { getSession, getCurrentMember } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const body = await request.json();
    const { planId, gymId } = body;

    if (!planId || !gymId) {
      return apiError({ code: 'INVALID_INPUT', message: 'Plan ID and Gym ID are required' }, 400);
    }

    // Get member for this gym
    const member = await getCurrentMember(gymId);
    if (!member) {
      return apiError({ code: 'NOT_FOUND', message: 'Member not found' }, 404);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/dashboard?subscription=success`;
    const cancelUrl = `${baseUrl}/dashboard?subscription=cancelled`;

    const result = await createCheckoutSession(member.id, planId, successUrl, cancelUrl);

    if (!result || !result.success) {
      return apiError(result?.error || { code: 'CHECKOUT_FAILED', message: 'Failed to create checkout session' }, 400);
    }

    return apiSuccess({ url: result.sessionUrl });
  } catch (error) {
    console.error('Checkout error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create checkout session' }, 500);
  }
}
