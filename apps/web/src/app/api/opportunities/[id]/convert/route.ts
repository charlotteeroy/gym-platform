import { NextRequest } from 'next/server';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api';
import { getOpportunityById, recordConversion } from '@gym/core';

// POST /api/opportunities/[id]/convert - Record a conversion
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
    const { convertedTo, subscriptionId, purchaseId, revenueAmount, revenueType } = data as {
      convertedTo: string;
      subscriptionId?: string;
      purchaseId?: string;
      revenueAmount: number;
      revenueType: string;
    };

    if (!convertedTo || revenueAmount === undefined || !revenueType) {
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'convertedTo, revenueAmount, and revenueType are required',
      }, 400);
    }

    await recordConversion(id, {
      convertedTo,
      subscriptionId,
      purchaseId,
      revenueAmount,
      revenueType,
    });

    return apiSuccess({ message: 'Conversion recorded' }, 201);
  } catch (error) {
    console.error('Error recording conversion:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to record conversion' }, 500);
  }
}
