import { NextRequest } from 'next/server';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api';
import { getOpportunityById, logOpportunityAction } from '@gym/core';

// POST /api/opportunities/[id]/actions - Log an action taken
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const staff = await getStaffWithGym();
    if (!staff) return apiForbidden('No gym access');

    const { id } = await params;

    // Verify opportunity belongs to gym
    const opportunity = await getOpportunityById(id, staff.gymId);
    if (!opportunity) return apiNotFound('Opportunity not found');

    const data = await request.json();
    const { action, notes } = data as { action: string; notes?: string };

    if (!action || typeof action !== 'string' || action.trim().length === 0) {
      return apiError({ code: 'VALIDATION_ERROR', message: 'Action is required and must be a non-empty string' }, 400);
    }

    // Validate action length to prevent abuse
    if (action.length > 100) {
      return apiError({ code: 'VALIDATION_ERROR', message: 'Action must be 100 characters or less' }, 400);
    }

    // Validate notes length if provided
    if (notes && notes.length > 5000) {
      return apiError({ code: 'VALIDATION_ERROR', message: 'Notes must be 5000 characters or less' }, 400);
    }

    const logged = await logOpportunityAction(id, action, staff.id, notes);

    return apiSuccess(logged, 201);
  } catch (error) {
    console.error('Error logging action:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to log action' }, 500);
  }
}
