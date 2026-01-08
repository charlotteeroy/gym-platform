import { listMembershipPlans, createMembershipPlan, syncPlanToStripe } from '@gym/core';
import { createMembershipPlanSchema } from '@gym/shared';
import { getSession, getCurrentStaff } from '@/lib/auth';
import { apiSuccess, apiError, apiValidationError, apiUnauthorized, apiForbidden } from '@/lib/api';

// GET /api/plans - List membership plans
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gymId = searchParams.get('gymId');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    if (!gymId) {
      return apiError({ code: 'INVALID_INPUT', message: 'Gym ID is required' }, 400);
    }

    const plans = await listMembershipPlans(gymId, { includeInactive });

    return apiSuccess(plans);
  } catch (error) {
    console.error('List plans error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to list plans' }, 500);
  }
}

// POST /api/plans - Create membership plan
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const body = await request.json();
    const { gymId, ...planData } = body;

    if (!gymId) {
      return apiError({ code: 'INVALID_INPUT', message: 'Gym ID is required' }, 400);
    }

    // Verify staff access
    const staff = await getCurrentStaff(gymId);
    if (!staff || !['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Only owners and admins can create plans');
    }

    // Validate input
    const parsed = createMembershipPlanSchema.safeParse(planData);
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      parsed.error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      return apiValidationError(errors);
    }

    // Create plan
    const result = await createMembershipPlan(gymId, parsed.data);

    if (!result || !result.success) {
      return apiError(result?.error || { code: 'CREATE_FAILED', message: 'Failed to create plan' }, 400);
    }

    // Sync to Stripe in background (don't block response)
    syncPlanToStripe(result.plan.id).catch((err) =>
      console.error('Failed to sync plan to Stripe:', err)
    );

    return apiSuccess(result.plan, 201);
  } catch (error) {
    console.error('Create plan error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create plan' }, 500);
  }
}
