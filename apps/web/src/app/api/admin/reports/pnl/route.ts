import { getPnLReport } from '@gym/core';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';

/**
 * GET /api/admin/reports/pnl
 * Get P&L (Profit & Loss) report for the gym
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

    // Only owners can view P&L reports
    if (staff.role !== 'OWNER') {
      return apiForbidden('Only owners can view financial reports');
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Default to current month if no dates provided
    const now = new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = endDateParam
      ? new Date(endDateParam)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const result = await getPnLReport(staff.gymId, startDate, endDate);

    if (!result.success) {
      return apiError(result.error, 500);
    }

    return apiSuccess(result.report);
  } catch (error) {
    console.error('P&L report error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to generate P&L report' }, 500);
  }
}
