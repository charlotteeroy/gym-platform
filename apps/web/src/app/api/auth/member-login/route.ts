/**
 * Member Login API Route
 *
 * Authenticates a gym member (customer) and creates a session.
 * Unlike /api/auth/login, this route verifies the user has a Member record,
 * not just a Staff record.
 *
 * POST /api/auth/member-login
 * Body: { email: string, password: string }
 *
 * Returns: { user: { id, email }, member: { id, firstName, lastName, gymId, gymName } }
 *
 * Note: Uses AuthResult discriminated union - see login/route.ts for explanation.
 */
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
      return apiUnauthorized(result.error.message);
    }

    // Check if this user is a member - TypeScript knows user exists when success is true
    const member = await prisma.member.findFirst({
      where: { userId: result.user.id },
      include: { gym: true },
    });

    if (!member) {
      return apiUnauthorized('No member account found. Please use staff login.');
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(setSessionCookie(result.session.token, result.session.expiresAt));

    return apiSuccess({
      user: {
        id: result.user.id,
        email: result.user.email,
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
