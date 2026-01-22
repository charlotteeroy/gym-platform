import { NextRequest } from 'next/server';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';
import {
  getOpportunities,
  getOpportunitySummary,
  detectAllOpportunities,
  expireStaleOpportunities,
  type OpportunityType,
  type OpportunityStatus,
  type OpportunityConfidence,
} from '@gym/core';

// GET /api/opportunities - List opportunities with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const staff = await getStaffWithGym();
    if (!staff) return apiForbidden('No gym access');

    const { searchParams } = new URL(request.url);

    const filters = {
      types: searchParams.get('types')?.split(',').filter(Boolean) as OpportunityType[] | undefined,
      statuses: searchParams.get('statuses')?.split(',').filter(Boolean) as OpportunityStatus[] | undefined,
      confidence: searchParams.get('confidence')?.split(',').filter(Boolean) as OpportunityConfidence[] | undefined,
      memberId: searchParams.get('memberId') || undefined,
      minValue: searchParams.get('minValue') ? Number(searchParams.get('minValue')) : undefined,
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
    };

    const [opportunities, summary] = await Promise.all([
      getOpportunities(staff.gymId, filters),
      getOpportunitySummary(staff.gymId),
    ]);

    return apiSuccess({
      ...opportunities,
      summary,
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch opportunities' }, 500);
  }
}

// POST /api/opportunities - Trigger opportunity detection
export async function POST() {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const staff = await getStaffWithGym();
    if (!staff) return apiForbidden('No gym access');

    // Only OWNER, ADMIN, MANAGER can trigger detection
    if (!['OWNER', 'ADMIN', 'MANAGER'].includes(staff.role)) {
      return apiForbidden('Insufficient permissions');
    }

    // Expire stale opportunities first
    const expired = await expireStaleOpportunities(staff.gymId);

    // Run detection
    const results = await detectAllOpportunities(staff.gymId);

    return apiSuccess({
      ...results,
      expired,
      message: `Detected ${results.detected} new opportunities`,
    }, 201);
  } catch (error) {
    console.error('Error detecting opportunities:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to detect opportunities' }, 500);
  }
}
