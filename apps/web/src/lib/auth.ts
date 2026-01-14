import { cookies } from 'next/headers';
import { validateSession } from '@gym/core';
import { prisma } from '@gym/database';

const SESSION_COOKIE_NAME = 'session';

export async function getSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const result = await validateSession(sessionToken);

  // Check if validation succeeded by checking for user property
  if (!result || !('user' in result) || !result.user) {
    return null;
  }

  return result as { success: true; user: typeof result.user; session: any };
}

export async function getCurrentUser() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  return session.user;
}

export async function getCurrentStaff(gymId: string) {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const staff = await prisma.staff.findFirst({
    where: {
      userId: session.user.id,
      gymId,
      isActive: true,
    },
  });

  return staff;
}

export async function getStaffWithGym() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const staff = await prisma.staff.findFirst({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    include: {
      gym: true,
    },
  });

  return staff;
}

export async function getCurrentMember(gymId: string) {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const member = await prisma.member.findFirst({
    where: {
      userId: session.user.id,
      gymId,
    },
  });

  return member;
}

export function setSessionCookie(token: string, expiresAt: Date) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    expires: expiresAt,
    path: '/',
  };
}

export function clearSessionCookie() {
  return {
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    expires: new Date(0),
    path: '/',
  };
}
