import { getPayrollPeriod, deletePayrollPeriod } from '@gym/core';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';

/**
 * GET /api/admin/payroll/[id]
 * Get a specific payroll period with entries
 */
export async function GET(
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

    // Only owners and admins can view payroll
    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Insufficient permissions');
    }

    const { id } = await params;
    const result = await getPayrollPeriod(staff.gymId, id);

    if (!result.success) {
      return apiError(result.error, 404);
    }

    return apiSuccess(result.period);
  } catch (error) {
    console.error('Get payroll period error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to load payroll period' }, 500);
  }
}

/**
 * DELETE /api/admin/payroll/[id]
 * Delete a draft payroll period
 */
export async function DELETE(
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

    // Only owners can delete payroll
    if (staff.role !== 'OWNER') {
      return apiForbidden('Only owners can delete payroll periods');
    }

    const { id } = await params;
    const result = await deletePayrollPeriod(staff.gymId, id);

    if (!result.success) {
      return apiError(result.error!, 400);
    }

    return apiSuccess({ message: 'Payroll period deleted' });
  } catch (error) {
    console.error('Delete payroll period error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to delete payroll period' }, 500);
  }
}
