import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/', '/login', '/register', '/member-login', '/member-signup'];

// Routes that require staff/admin access
const adminRoutes = ['/dashboard', '/members', '/subscriptions', '/settings'];

// Routes that require member access
const memberRoutes = ['/classes', '/portal'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session');

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow API routes and static files
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  const isAuthenticated = !!sessionCookie?.value;

  // Admin routes - require auth, redirect to /login
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  if (isAdminRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Member routes - require auth, redirect to /member-login
  const isMemberRoute = memberRoutes.some(route => pathname.startsWith(route));
  if (isMemberRoute && !isAuthenticated) {
    const loginUrl = new URL('/member-login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
};
