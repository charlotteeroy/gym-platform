/**
 * Revenue Forecasting & Churn Prediction API
 *
 * Purpose: Provides forecast data for the billing dashboard
 * Product Context: Supports Owner Pillar - "Long-term Resilience" with predictive analytics
 *
 * @see CLAUDE.md - Revenue Forecasting & Churn Prediction Feature
 */

import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';
import { getForecastData } from '@gym/core';

/**
 * GET /api/admin/billing/forecast
 *
 * Returns comprehensive forecast data including:
 * - Current and normalized MRR
 * - 30/60/90-day revenue projections with confidence intervals
 * - Churn metrics and at-risk member analysis
 * - Historical revenue data for charting
 * - Upcoming renewals by week
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return apiForbidden('You do not have access to any gym');
    }

    // Only OWNER, ADMIN, MANAGER can view forecast data
    if (!['OWNER', 'ADMIN', 'MANAGER'].includes(staff.role)) {
      return apiForbidden('You do not have permission to view forecast data');
    }

    // Get comprehensive forecast data
    const forecastData = await getForecastData(staff.gymId);

    return apiSuccess(forecastData);
  } catch (error) {
    console.error('Get forecast data error:', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to get forecast data' },
      500
    );
  }
}
