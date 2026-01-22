import { NextRequest } from 'next/server';
import { getBusinessInfo, upsertBusinessInfo, getAllProvinces } from '@gym/core';
import { getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiForbidden, apiUnauthorized, apiValidationError } from '@/lib/api';
import { z } from 'zod';

const businessInfoSchema = z.object({
  legalName: z.string().min(1, 'Legal name is required'),
  businessNumber: z.string().optional().nullable(),
  corporationNumber: z.string().optional().nullable(),
  businessType: z.enum(['SOLE_PROPRIETOR', 'PARTNERSHIP', 'CORPORATION']),
  streetAddress: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  province: z.string().length(2, 'Province code must be 2 characters'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().optional().default('CA'),
  businessPhone: z.string().optional().nullable(),
  businessEmail: z.string().email().optional().nullable(),
  provincialRegistrations: z.record(z.string()).optional().nullable(),
});

// GET /api/admin/settings/business - Get business info
export async function GET() {
  try {
    const staff = await getStaffWithGym();
    if (!staff) return apiUnauthorized();

    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Permission denied');
    }

    const businessInfo = await getBusinessInfo(staff.gymId);
    const provinces = getAllProvinces();

    return apiSuccess({
      info: businessInfo,
      provinces,
      businessTypes: [
        { value: 'SOLE_PROPRIETOR', label: 'Sole Proprietor' },
        { value: 'PARTNERSHIP', label: 'Partnership' },
        { value: 'CORPORATION', label: 'Corporation' },
      ],
    });
  } catch (error) {
    console.error('Error fetching business info:', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch business information' },
      500
    );
  }
}

// PUT /api/admin/settings/business - Update business info
export async function PUT(request: NextRequest) {
  try {
    const staff = await getStaffWithGym();
    if (!staff) return apiUnauthorized();

    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Permission denied');
    }

    const body = await request.json();
    const parsed = businessInfoSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error.flatten().fieldErrors);
    }

    // Validate Canadian postal code format
    const postalCodeRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
    if (parsed.data.country === 'CA' && !postalCodeRegex.test(parsed.data.postalCode)) {
      return apiValidationError({
        postalCode: ['Invalid Canadian postal code format (e.g., A1A 1A1)'],
      });
    }

    // Validate business number format (9 digits)
    if (parsed.data.businessNumber) {
      const bnRegex = /^\d{9}$/;
      if (!bnRegex.test(parsed.data.businessNumber.replace(/\s/g, ''))) {
        return apiValidationError({
          businessNumber: ['CRA Business Number must be 9 digits'],
        });
      }
    }

    const info = await upsertBusinessInfo(staff.gymId, parsed.data);

    return apiSuccess(info);
  } catch (error) {
    console.error('Error updating business info:', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to update business information' },
      500
    );
  }
}
