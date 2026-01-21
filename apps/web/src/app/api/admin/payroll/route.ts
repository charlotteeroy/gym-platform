import { getPayrollPeriods, createPayrollPeriod } from '@gym/core';
import { PayrollStatus } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';
import { z } from 'zod';

const createPayrollSchema = z.object({
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
});

/**
 * GET /api/admin/payroll
 * List payroll periods for the gym
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

    // Only owners and admins can view payroll
    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Insufficient permissions');
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const statusParam = searchParams.get('status');

    let status: PayrollStatus | undefined;
    if (statusParam && Object.values(PayrollStatus).includes(statusParam as PayrollStatus)) {
      status = statusParam as PayrollStatus;
    }

    const result = await getPayrollPeriods(staff.gymId, status, page, limit);

    if (!result.success) {
      return apiError(result.error, 500);
    }

    return apiSuccess(result);
  } catch (error) {
    console.error('List payroll periods error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to load payroll periods' }, 500);
  }
}

/**
 * POST /api/admin/payroll
 * Create a new payroll period
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return apiForbidden('No gym access');
    }

    // Only owners can create payroll
    if (staff.role !== 'OWNER') {
      return apiForbidden('Only owners can create payroll periods');
    }

    const body = await request.json();
    const parsed = createPayrollSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        { code: 'VALIDATION_ERROR', message: 'Invalid input' },
        400
      );
    }

    const { startDate, endDate } = parsed.data;

    if (startDate >= endDate) {
      return apiError({ code: 'INVALID_INPUT', message: 'End date must be after start date' }, 400);
    }

    const result = await createPayrollPeriod(staff.gymId, startDate, endDate);

    if (!result.success) {
      return apiError(result.error, 400);
    }

    return apiSuccess({ id: result.payrollPeriodId, message: 'Payroll period created' });
  } catch (error) {
    console.error('Create payroll period error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create payroll period' }, 500);
  }
}
