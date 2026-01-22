import { NextRequest } from 'next/server';
import {
  getTaxConfig,
  upsertTaxConfig,
  getAllProvinces,
  validateGstHstNumber,
  validateQstNumber,
} from '@gym/core';
import { getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiForbidden, apiUnauthorized, apiValidationError } from '@/lib/api';
import { z } from 'zod';

const updateTaxConfigSchema = z.object({
  province: z.string().length(2),
  gstHstNumber: z.string().optional().nullable(),
  pstNumber: z.string().optional().nullable(),
  qstNumber: z.string().optional().nullable(),
  isSmallSupplier: z.boolean().optional(),
});

// GET /api/admin/settings/tax - Get tax configuration
export async function GET() {
  try {
    const staff = await getStaffWithGym();
    if (!staff) return apiUnauthorized();

    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Permission denied');
    }

    const taxConfig = await getTaxConfig(staff.gymId);
    const provinces = getAllProvinces();

    return apiSuccess({
      config: taxConfig,
      provinces,
    });
  } catch (error) {
    console.error('Error fetching tax config:', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch tax configuration' },
      500
    );
  }
}

// PUT /api/admin/settings/tax - Update tax configuration
export async function PUT(request: NextRequest) {
  try {
    const staff = await getStaffWithGym();
    if (!staff) return apiUnauthorized();

    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Permission denied');
    }

    const body = await request.json();
    const parsed = updateTaxConfigSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error.flatten().fieldErrors);
    }

    const { province, gstHstNumber, pstNumber, qstNumber, isSmallSupplier } = parsed.data;

    // Validate GST/HST number if provided
    if (gstHstNumber) {
      const validation = validateGstHstNumber(gstHstNumber);
      if (!validation.valid) {
        return apiValidationError({ gstHstNumber: [validation.error!] });
      }
    }

    // Validate QST number if provided and province is Quebec
    if (qstNumber && province === 'QC') {
      const validation = validateQstNumber(qstNumber);
      if (!validation.valid) {
        return apiValidationError({ qstNumber: [validation.error!] });
      }
    }

    const config = await upsertTaxConfig(staff.gymId, {
      province: province as any,
      gstHstNumber,
      pstNumber,
      qstNumber,
      isSmallSupplier,
    });

    return apiSuccess(config);
  } catch (error) {
    console.error('Error updating tax config:', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to update tax configuration' },
      500
    );
  }
}
