import { NextRequest } from 'next/server';
import {
  getExchangeRates,
  updateManualRates,
  fetchLiveRates,
} from '@gym/core';
import { getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiForbidden, apiUnauthorized, apiValidationError } from '@/lib/api';
import { z } from 'zod';

const updateRatesSchema = z.object({
  usdToCad: z.number().positive().optional(),
  eurToCad: z.number().positive().optional(),
});

// GET /api/admin/settings/currency/rates - Get current exchange rates
export async function GET() {
  try {
    const staff = await getStaffWithGym();
    if (!staff) return apiUnauthorized();

    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Permission denied');
    }

    const rates = await getExchangeRates(staff.gymId);

    return apiSuccess(rates);
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch exchange rates' },
      500
    );
  }
}

// POST /api/admin/settings/currency/rates - Update or refresh rates
export async function POST(request: NextRequest) {
  try {
    const staff = await getStaffWithGym();
    if (!staff) return apiUnauthorized();

    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Permission denied');
    }

    const body = await request.json();

    // If action is 'refresh', fetch live rates
    if (body.action === 'refresh') {
      const liveRates = await fetchLiveRates();
      if (!liveRates) {
        return apiError(
          { code: 'EXTERNAL_SERVICE_ERROR', message: 'Failed to fetch live rates from Bank of Canada' },
          503
        );
      }
      return apiSuccess(liveRates);
    }

    // Otherwise, update manual rates
    const parsed = updateRatesSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error.flatten().fieldErrors);
    }

    const { usdToCad, eurToCad } = parsed.data;

    if (!usdToCad && !eurToCad) {
      return apiValidationError({
        usdToCad: ['At least one rate must be provided'],
      });
    }

    const settings = await updateManualRates(staff.gymId, {
      usdToCad,
      eurToCad,
    });

    const rates = await getExchangeRates(staff.gymId);

    return apiSuccess(rates);
  } catch (error) {
    console.error('Error updating exchange rates:', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to update exchange rates' },
      500
    );
  }
}
