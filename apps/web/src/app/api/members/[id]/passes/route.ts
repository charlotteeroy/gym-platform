import { getMemberById, getMemberPasses, activatePass } from '@gym/core';
import { getSession, getCurrentStaff } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound, apiValidationError } from '@/lib/api';
import { assignPassSchema } from '@gym/shared';

// GET /api/members/[id]/passes - List member's passes with balances
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const { id } = await params;
    const member = await getMemberById(id);
    if (!member) return apiNotFound('Member not found');

    const staff = await getCurrentStaff(member.gymId);
    if (!staff) return apiForbidden('You do not have access to this member');

    const passes = await getMemberPasses(id);

    return apiSuccess(passes);
  } catch (error) {
    console.error('Error listing member passes:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to list member passes' }, 500);
  }
}

// POST /api/members/[id]/passes - Assign a pass to a member
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const { id } = await params;
    const member = await getMemberById(id);
    if (!member) return apiNotFound('Member not found');

    const staff = await getCurrentStaff(member.gymId);
    if (!staff) return apiForbidden('You do not have access to this member');

    if (!['OWNER', 'ADMIN', 'MANAGER'].includes(staff.role)) {
      return apiForbidden('Permission denied');
    }

    const body = await request.json();
    const parsed = assignPassSchema.safeParse(body);

    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      parsed.error.errors.forEach((err) => {
        const field = err.path.join('.');
        if (!errors[field]) errors[field] = [];
        errors[field].push(err.message);
      });
      return apiValidationError(errors);
    }

    const result = await activatePass(
      id,
      parsed.data.productId,
      member.gymId,
      undefined,
      parsed.data.notes
    );

    if (!result.success) {
      return apiError(result.error, 400);
    }

    return apiSuccess(result.data, 201);
  } catch (error) {
    console.error('Error assigning pass:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to assign pass' }, 500);
  }
}
