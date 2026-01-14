/**
 * Member Register API Route
 *
 * Creates a new user account AND member profile in one transaction.
 * Members must provide a gym slug/code to join a specific gym.
 *
 * POST /api/auth/member-register
 * Body: { email, password, firstName, lastName, phone?, gymSlug }
 *
 * Returns: { user: { id, email }, member: { id, firstName, lastName } } on success (201 Created)
 */
import { cookies } from 'next/headers';
import { registerMember } from '@gym/core';
import { memberRegisterSchema } from '@gym/shared';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api';
import { setSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = memberRegisterSchema.safeParse(body);
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

    // Register member (creates User + Member)
    const result = await registerMember(parsed.data);

    if (!result.success) {
      return apiError(result.error, 400);
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(setSessionCookie(result.session.token, result.session.expiresAt));

    return apiSuccess(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
        },
        member: {
          id: result.member.id,
          firstName: result.member.firstName,
          lastName: result.member.lastName,
        },
      },
      201
    );
  } catch (error) {
    console.error('Member registration error:', error);
    return apiError(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      500
    );
  }
}
