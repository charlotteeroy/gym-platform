import { NextRequest } from 'next/server';
import {
  getCurrencySettings,
  upsertCurrencySettings,
  getExchangeRates,
  getAllCurrencies,
  isValidCurrency,
} from '@gym/core';
import { getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiForbidden, apiUnauthorized, apiValidationError } from '@/lib/api';
import { z } from 'zod';

const currencySettingsSchema = z.object({
  baseCurrency: z.string().length(3),
  enabledCurrencies: z.array(z.string().length(3)),
  usdToCad: z.number().positive().optional().nullable(),
  eurToCad: z.number().positive().optional().nullable(),
  useAutoRates: z.boolean().optional(),
});

// GET /api/admin/settings/currency - Get currency settings
export async function GET() {
  try {
    const staff = await getStaffWithGym();
    if (!staff) return apiUnauthorized();

    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Permission denied');
    }

    const [settings, rates] = await Promise.all([
      getCurrencySettings(staff.gymId),
      getExchangeRates(staff.gymId),
    ]);

    const currencies = getAllCurrencies();

    return apiSuccess({
      settings,
      currentRates: rates,
      supportedCurrencies: currencies,
    });
  } catch (error) {
    console.error('Error fetching currency settings:', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch currency settings' },
      500
    );
  }
}

// PUT /api/admin/settings/currency - Update currency settings
export async function PUT(request: NextRequest) {
  try {
    const staff = await getStaffWithGym();
    if (!staff) return apiUnauthorized();

    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Permission denied');
    }

    const body = await request.json();
    const parsed = currencySettingsSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error.flatten().fieldErrors);
    }

    const { baseCurrency, enabledCurrencies, usdToCad, eurToCad, useAutoRates } = parsed.data;

    // Validate base currency
    if (!isValidCurrency(baseCurrency)) {
      return apiValidationError({
        baseCurrency: ['Invalid currency code'],
      });
    }

    // Validate enabled currencies
    for (const currency of enabledCurrencies) {
      if (!isValidCurrency(currency)) {
        return apiValidationError({
          enabledCurrencies: [`Invalid currency code: ${currency}`],
        });
      }
    }

    // Base currency must be in enabled currencies
    if (!enabledCurrencies.includes(baseCurrency)) {
      return apiValidationError({
        enabledCurrencies: ['Base currency must be included in enabled currencies'],
      });
    }

    const settings = await upsertCurrencySettings(staff.gymId, {
      baseCurrency: baseCurrency as any,
      enabledCurrencies: enabledCurrencies as any[],
      usdToCad,
      eurToCad,
      useAutoRates,
    });

    return apiSuccess(settings);
  } catch (error) {
    console.error('Error updating currency settings:', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to update currency settings' },
      500
    );
  }
}
