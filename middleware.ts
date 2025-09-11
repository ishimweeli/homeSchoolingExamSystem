import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Admin routes protection
    if (path.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Parent/Teacher routes protection
    if (path.startsWith('/exams/create') || path.startsWith('/children')) {
      if (!['PARENT', 'TEACHER', 'ADMIN'].includes(token?.role as string)) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Student routes protection
    if (path.startsWith('/exams/take') && token?.role !== 'STUDENT') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/exams/:path*',
    '/results/:path*',
    '/analytics/:path*',
    '/admin/:path*',
    '/children/:path*',
    '/settings/:path*',
    '/materials/:path*',
  ],
}