import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Cookie name that the auth store mirrors the access token into so that this
 * (edge) middleware can guard routes before any client-side JS runs.
 */
const AUTH_COOKIE = 'ces_access_token';

/** Routes that are always reachable without authentication. */
const PUBLIC_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  // Unauthenticated user trying to reach a protected route -> /login.
  if (!token && !isPublic) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already authenticated but visiting /login -> send to the dashboard home ("/").
  if (token && isPublic) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals, API routes and static assets.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)'],
};
