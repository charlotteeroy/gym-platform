import { getFailedPayments } from '@gym/core';
import { FailedPaymentStatus } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';

/**
 * GET /api/admin/billing/failed-payments
 * List failed payment attempts for the gym
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return apiForbidden('No gym access');
    }

    // Only owners, admins, and managers can view failed payments
    if (!['OWNER', 'ADMIN', 'MANAGER'].includes(staff.role)) {
      return apiForbidden('Insufficient permissions');
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const statusParam = searchParams.get('status');

    // Validate status
    let status: FailedPaymentStatus | undefined;
    if (statusParam && Object.values(FailedPaymentStatus).includes(statusParam as FailedPaymentStatus)) {
      status = statusParam as FailedPaymentStatus;
    }

    const result = await getFailedPayments(staff.gymId, status, page, limit);

    if (!result.success) {
      return apiError(result.error, 500);
    }

    return apiSuccess(result);
  } catch (error) {
    console.error('List failed payments error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to load failed payments' }, 500);
  }
}
