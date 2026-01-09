import { cookies } from 'next/headers';
import { loginUser } from '@gym/core';
import { loginSchema } from '@gym/shared';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api';
import { setSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = loginSchema.safeParse(body);
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

    // Attempt login
    const result = await loginUser(parsed.data);

    if (!result || !result.success) {
      return apiError(result?.error || { code: 'LOGIN_FAILED', message: 'Login failed' }, 401);
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(setSessionCookie(result.session.token, result.session.expiresAt));

    return apiSuccess({
      user: {
        id: result.user.id,
        email: result.user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return apiError(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      500
    );
  }
}
