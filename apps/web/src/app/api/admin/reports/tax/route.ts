import { NextRequest } from 'next/server';
import { generateTaxReport, getTaxConfig, getBusinessInfo } from '@gym/core';
import { getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiForbidden, apiUnauthorized } from '@/lib/api';

// GET /api/admin/reports/tax - Generate tax report
export async function GET(request: NextRequest) {
  try {
    const staff = await getStaffWithGym();
    if (!staff) return apiUnauthorized();

    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Permission denied');
    }

    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Default to current quarter
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
    const quarterEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);

    const startDate = startDateParam ? new Date(startDateParam) : quarterStart;
    const endDate = endDateParam ? new Date(endDateParam) : quarterEnd;

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return apiError(
        { code: 'VALIDATION_ERROR', message: 'Invalid date format' },
        400
      );
    }

    if (startDate > endDate) {
      return apiError(
        { code: 'VALIDATION_ERROR', message: 'Start date must be before end date' },
        400
      );
    }

    const [report, taxConfig, businessInfo] = await Promise.all([
      generateTaxReport(staff.gymId, startDate, endDate),
      getTaxConfig(staff.gymId),
      getBusinessInfo(staff.gymId),
    ]);

    return apiSuccess({
      report,
      taxConfig,
      businessInfo,
    });
  } catch (error) {
    console.error('Error generating tax report:', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to generate tax report' },
      500
    );
  }
}
