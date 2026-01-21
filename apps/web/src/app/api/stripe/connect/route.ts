import { createOnboardingLink, getConnectAccountStatus } from '@gym/core';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';

/**
 * GET /api/stripe/connect
 * Get the Connect account status for the current gym
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return apiForbidden('No gym access');
    }

    // Only owners and admins can view Connect status
    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Only owners and admins can manage Stripe settings');
    }

    const result = await getConnectAccountStatus(staff.gymId);

    if (!result.success) {
      return apiError(result.error, 400);
    }

    return apiSuccess({
      status: result.status,
      chargesEnabled: result.chargesEnabled,
      payoutsEnabled: result.payoutsEnabled,
      onboardingComplete: result.onboardingComplete,
      requirements: result.requirements,
    });
  } catch (error) {
    console.error('Get Connect status error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get Connect status' }, 500);
  }
}

/**
 * POST /api/stripe/connect
 * Create a Stripe Connect Express account and return the onboarding link
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return apiForbidden('No gym access');
    }

    // Only owners can set up Stripe Connect
    if (staff.role !== 'OWNER') {
      return apiForbidden('Only the gym owner can set up Stripe payments');
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/admin/settings/stripe?onboarding=complete`;
    const refreshUrl = `${baseUrl}/admin/settings/stripe?onboarding=refresh`;

    const result = await createOnboardingLink(staff.gymId, returnUrl, refreshUrl);

    if (!result.success) {
      return apiError(result.error, 400);
    }

    return apiSuccess({ onboardingUrl: result.url });
  } catch (error) {
    console.error('Create Connect account error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create payment account' }, 500);
  }
}
