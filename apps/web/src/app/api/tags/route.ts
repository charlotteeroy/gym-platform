import { createTag, listTags } from '@gym/core';
import { createTagSchema } from '@gym/shared';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiValidationError, apiUnauthorized, apiForbidden } from '@/lib/api';

// GET /api/tags - List all tags for the gym
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

    const tags = await listTags(staff.gymId);

    return apiSuccess({ tags });
  } catch (error) {
    console.error('List tags error:', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      500
    );
  }
}

// POST /api/tags - Create a new tag
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return apiForbidden('You do not have access to any gym');
    }

    const body = await request.json();

    // Validate input
    const parsed = createTagSchema.safeParse(body);
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

    const result = await createTag(staff.gymId, parsed.data);

    if (!result.success) {
      return apiError(result.error, 400);
    }

    return apiSuccess({ tag: result.tag }, 201);
  } catch (error) {
    console.error('Create tag error:', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      500
    );
  }
}
