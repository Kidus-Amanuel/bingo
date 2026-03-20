import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Define protected routes
    const isDashboardRoute = pathname.startsWith('/dashboard');
    const isOperatorRoute = pathname.startsWith('/operator');
    const isAuthRoute = pathname === '/login' || pathname === '/signup';

    // 2. Check for Supabase session cookie
    // Note: Without @supabase/ssr, we check for the standard cookie name 
    // or rely on client-side redirect if not found.
    const hasSession = request.cookies.get('sb-access-token');

    if ((isDashboardRoute || isOperatorRoute) && !hasSession) {
        // Redirect to login if accessing protected route without session
        // return NextResponse.redirect(new URL('/login', request.url));
        // NOTE: For now, we allow the client-side layout to handle this 
        // because setting up cookie-based auth manually is brittle without the helper lib.
    }

    if (isAuthRoute && hasSession) {
        // return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/operator/:path*', '/login', '/signup'],
};
