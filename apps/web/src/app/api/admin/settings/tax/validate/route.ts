import { NextRequest } from 'next/server';
import { validateGstHstNumber, validateQstNumber } from '@gym/core';
import { getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiForbidden, apiUnauthorized, apiValidationError } from '@/lib/api';
import { z } from 'zod';

const validateNumberSchema = z.object({
  type: z.enum(['gst_hst', 'qst']),
  number: z.string(),
});

// POST /api/admin/settings/tax/validate - Validate tax number
export async function POST(request: NextRequest) {
  try {
    const staff = await getStaffWithGym();
    if (!staff) return apiUnauthorized();

    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Permission denied');
    }

    const body = await request.json();
    const parsed = validateNumberSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error.flatten().fieldErrors);
    }

    const { type, number } = parsed.data;

    let result: { valid: boolean; error?: string };

    if (type === 'gst_hst') {
      result = validateGstHstNumber(number);
    } else {
      result = validateQstNumber(number);
    }

    return apiSuccess(result);
  } catch (error) {
    console.error('Error validating tax number:', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to validate tax number' },
      500
    );
  }
}
