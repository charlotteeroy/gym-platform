import { updateTag, deleteTag, getTagById } from '@gym/core';
import { updateTagSchema } from '@gym/shared';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiValidationError, apiUnauthorized, apiForbidden } from '@/lib/api';

// PATCH /api/tags/[id] - Update a tag
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return apiForbidden('You do not have access to any gym');
    }

    const { id } = await params;

    // Verify tag belongs to this gym
    const tag = await getTagById(id);
    if (!tag || tag.gymId !== staff.gymId) {
      return apiError({ code: 'NOT_FOUND', message: 'Tag not found' }, 404);
    }

    const body = await request.json();

    // Validate input
    const parsed = updateTagSchema.safeParse(body);
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

    const result = await updateTag(id, parsed.data);

    if (!result.success) {
      return apiError(result.error, 400);
    }

    return apiSuccess({ tag: result.tag });
  } catch (error) {
    console.error('Update tag error:', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      500
    );
  }
}

// DELETE /api/tags/[id] - Delete a tag
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return apiForbidden('You do not have access to any gym');
    }

    const { id } = await params;

    // Verify tag belongs to this gym
    const tag = await getTagById(id);
    if (!tag || tag.gymId !== staff.gymId) {
      return apiError({ code: 'NOT_FOUND', message: 'Tag not found' }, 404);
    }

    const result = await deleteTag(id);

    if (!result.success) {
      return apiError(result.error!, 400);
    }

    return apiSuccess({ success: true });
  } catch (error) {
    console.error('Delete tag error:', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      500
    );
  }
}
