import { cookies } from 'next/headers';
import { logout } from '@gym/core';
import { apiSuccess } from '@/lib/api';
import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;

  if (sessionToken) {
    await logout(sessionToken);
  }

  cookieStore.set(clearSessionCookie());

  return apiSuccess({ message: 'Logged out successfully' });
}
