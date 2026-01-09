import { cookies } from 'next/headers';
import { registerUser } from '@gym/core';
import { registerSchema } from '@gym/shared';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api';
import { setSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = registerSchema.safeParse(body);
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

    // Register user
    const result = await registerUser(parsed.data);

    if (!result.success) {
      return apiError(result.error ?? { code: 'REGISTRATION_FAILED', message: 'Registration failed' }, 400);
    }

    // Session and user exist when success is true
    const session = result.session!;
    const user = result.user!;

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(setSessionCookie(session.token, session.expiresAt));

    return apiSuccess(
      {
        user: {
          id: user.id,
          email: user.email,
        },
      },
      201
    );
  } catch (error) {
    console.error('Registration error:', error);
    return apiError(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      500
    );
  }
}
