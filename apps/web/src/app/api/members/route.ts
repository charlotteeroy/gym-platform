import { createMember, listMembers } from '@gym/core';
import { createMemberSchema, memberFilterSchema } from '@gym/shared';
import { getSession, getCurrentStaff, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiValidationError, apiUnauthorized, apiForbidden } from '@/lib/api';

// GET /api/members - List members
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    // Get gym ID from query params or auto-detect from staff
    const { searchParams } = new URL(request.url);
    let gymId = searchParams.get('gymId');

    // Auto-detect gym from staff if not provided
    if (!gymId) {
      const staff = await getStaffWithGym();
      if (!staff) {
        return apiForbidden('You do not have access to any gym');
      }
      gymId = staff.gymId;
    } else {
      // Verify staff access to specified gym
      const staff = await getCurrentStaff(gymId);
      if (!staff) {
        return apiForbidden('You do not have access to this gym');
      }
    }

    // Parse filters
    const tagsParam = searchParams.get('tags');
    const filters = memberFilterSchema.parse({
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      tags: tagsParam ? tagsParam.split(',').filter(Boolean) : undefined,
      activityLevel: searchParams.get('activityLevel') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
      sortBy: searchParams.get('sortBy') || 'joinedAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    const result = await listMembers(gymId, filters);

    return apiSuccess(result);
  } catch (error) {
    console.error('List members error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to list members' }, 500);
  }
}

// POST /api/members - Create member
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const body = await request.json();
    const { gymId: providedGymId, ...memberData } = body;

    // Auto-detect gym from staff if not provided
    let gymId = providedGymId;
    if (!gymId) {
      const staff = await getStaffWithGym();
      if (!staff) {
        return apiForbidden('You do not have access to any gym');
      }
      gymId = staff.gymId;
    } else {
      // Verify staff access to specified gym
      const staff = await getCurrentStaff(gymId);
      if (!staff) {
        return apiForbidden('You do not have access to this gym');
      }
    }

    // Validate input
    const parsed = createMemberSchema.safeParse(memberData);
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

    // Create member
    const result = await createMember(gymId, parsed.data);

    if (!result || !result.success) {
      return apiError(result?.error || { code: 'CREATE_FAILED', message: 'Failed to create member' }, 400);
    }

    return apiSuccess(result.member, 201);
  } catch (error) {
    console.error('Create member error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create member' }, 500);
  }
}
