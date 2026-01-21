import { approvePayroll } from '@gym/core';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';

/**
 * POST /api/admin/payroll/[id]/approve
 * Approve a payroll period
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return apiForbidden('No gym access');
    }

    // Only owners can approve payroll
    if (staff.role !== 'OWNER') {
      return apiForbidden('Only owners can approve payroll');
    }

    const { id } = await params;
    const result = await approvePayroll(staff.gymId, id);

    if (!result.success) {
      return apiError(result.error!, 400);
    }

    return apiSuccess({ message: 'Payroll approved' });
  } catch (error) {
    console.error('Approve payroll error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to approve payroll' }, 500);
  }
}
