import { NextRequest } from 'next/server';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api';
import {
  getOpportunityById,
  updateOpportunityStatus,
  logOpportunityAction,
  type OpportunityStatus,
} from '@gym/core';

// GET /api/opportunities/[id] - Get single opportunity with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const staff = await getStaffWithGym();
    if (!staff) return apiForbidden('No gym access');

    const { id } = await params;

    const opportunity = await getOpportunityById(id, staff.gymId);

    if (!opportunity) return apiNotFound('Opportunity not found');

    return apiSuccess(opportunity);
  } catch (error) {
    console.error('Error fetching opportunity:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch opportunity' }, 500);
  }
}

// Valid status transitions
const VALID_STATUSES: OpportunityStatus[] = ['NEW', 'CONTACTED', 'FOLLOW_UP', 'WON', 'LOST', 'DISMISSED', 'EXPIRED'];

// PATCH /api/opportunities/[id] - Update opportunity status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const staff = await getStaffWithGym();
    if (!staff) return apiForbidden('No gym access');

    const { id } = await params;
    const data = await request.json();
    const { status, notes, contactMethod } = data as {
      status: OpportunityStatus;
      notes?: string;
      contactMethod?: string;
    };

    // Validate status
    if (!status || !VALID_STATUSES.includes(status)) {
      return apiError({
        code: 'VALIDATION_ERROR',
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
      }, 400);
    }

    // Verify opportunity belongs to gym
    const existing = await getOpportunityById(id, staff.gymId);
    if (!existing) return apiNotFound('Opportunity not found');

    const updated = await updateOpportunityStatus(id, status, staff.id, notes);

    // Log the action if contacted
    if (status === 'CONTACTED' && contactMethod) {
      await logOpportunityAction(id, `contacted_${contactMethod}`, staff.id, notes);
    }

    return apiSuccess(updated);
  } catch (error) {
    console.error('Error updating opportunity:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update opportunity' }, 500);
  }
}
