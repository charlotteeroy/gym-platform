import { cookies } from 'next/headers';
import { loginUser } from '@gym/core';
import { prisma } from '@gym/database';
import { setSessionCookie } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return apiError(
        { code: 'VALIDATION_ERROR', message: 'Email and password are required' },
        400
      );
    }

    // Login the user
    const result = await loginUser({ email, password });

    if (!result.success) {
      return apiUnauthorized(result.error?.message ?? 'Login failed');
    }

    // Session and user exist when success is true
    const session = result.session!;
    const user = result.user!;

    // Check if this user is a member
    const member = await prisma.member.findFirst({
      where: { userId: user.id },
      include: { gym: true },
    });

    if (!member) {
      return apiUnauthorized('No member account found. Please use staff login.');
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(setSessionCookie(session.token, session.expiresAt));

    return apiSuccess({
      user: {
        id: user.id,
        email: user.email,
      },
      member: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        gymId: member.gymId,
        gymName: member.gym.name,
      },
    });
  } catch (error) {
    console.error('Member login error:', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      500
    );
  }
}
