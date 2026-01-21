import { processPayroll } from '@gym/core';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';

/**
 * POST /api/admin/payroll/[id]/process
 * Process payroll (create payouts)
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

    // Only owners can process payroll
    if (staff.role !== 'OWNER') {
      return apiForbidden('Only owners can process payroll');
    }

    const { id } = await params;
    const result = await processPayroll(staff.gymId, id);

    if (!result.success) {
      return apiError(result.error!, 400);
    }

    return apiSuccess({
      message: 'Payroll processed successfully',
      processedCount: result.processedCount,
      failedCount: result.failedCount,
    });
  } catch (error) {
    console.error('Process payroll error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to process payroll' }, 500);
  }
}
