import { addPayrollEntry } from '@gym/core';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';
import { z } from 'zod';

const addEntrySchema = z.object({
  staffId: z.string().min(1),
  baseAmount: z.number().min(0),
  commissionsAmount: z.number().min(0).optional(),
  bonusAmount: z.number().min(0).optional(),
  deductionsAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/admin/payroll/[id]/entries
 * Add an entry to a payroll period
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

    // Only owners can add payroll entries
    if (staff.role !== 'OWNER') {
      return apiForbidden('Only owners can add payroll entries');
    }

    const { id: payrollPeriodId } = await params;
    const body = await request.json();
    const parsed = addEntrySchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        { code: 'VALIDATION_ERROR', message: 'Invalid input' },
        400
      );
    }

    const result = await addPayrollEntry(
      staff.gymId,
      payrollPeriodId,
      parsed.data.staffId,
      {
        baseAmount: parsed.data.baseAmount,
        commissionsAmount: parsed.data.commissionsAmount,
        bonusAmount: parsed.data.bonusAmount,
        deductionsAmount: parsed.data.deductionsAmount,
        notes: parsed.data.notes,
      }
    );

    if (!result.success) {
      return apiError(result.error, 400);
    }

    return apiSuccess({ id: result.entryId, message: 'Payroll entry added' });
  } catch (error) {
    console.error('Add payroll entry error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to add payroll entry' }, 500);
  }
}
