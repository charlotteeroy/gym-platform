import { updatePayrollEntry, deletePayrollEntry } from '@gym/core';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';
import { z } from 'zod';

const updateEntrySchema = z.object({
  baseAmount: z.number().min(0).optional(),
  commissionsAmount: z.number().min(0).optional(),
  bonusAmount: z.number().min(0).optional(),
  deductionsAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

/**
 * PATCH /api/admin/payroll/[id]/entries/[entryId]
 * Update a payroll entry
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
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

    // Only owners can update payroll entries
    if (staff.role !== 'OWNER') {
      return apiForbidden('Only owners can update payroll entries');
    }

    const { entryId } = await params;
    const body = await request.json();
    const parsed = updateEntrySchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        { code: 'VALIDATION_ERROR', message: 'Invalid input' },
        400
      );
    }

    const result = await updatePayrollEntry(staff.gymId, entryId, parsed.data);

    if (!result.success) {
      return apiError(result.error!, 400);
    }

    return apiSuccess({ message: 'Payroll entry updated' });
  } catch (error) {
    console.error('Update payroll entry error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update payroll entry' }, 500);
  }
}

/**
 * DELETE /api/admin/payroll/[id]/entries/[entryId]
 * Delete a payroll entry
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
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

    // Only owners can delete payroll entries
    if (staff.role !== 'OWNER') {
      return apiForbidden('Only owners can delete payroll entries');
    }

    const { entryId } = await params;
    const result = await deletePayrollEntry(staff.gymId, entryId);

    if (!result.success) {
      return apiError(result.error!, 400);
    }

    return apiSuccess({ message: 'Payroll entry deleted' });
  } catch (error) {
    console.error('Delete payroll entry error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to delete payroll entry' }, 500);
  }
}
