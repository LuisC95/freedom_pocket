import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { VALID_USER_IDS } from '@/lib/dev-auth'

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/dev-login']

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p))
    || pathname.startsWith('/_next')
    || pathname.startsWith('/favicon')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublic(pathname)) return NextResponse.next()

  // Dev PIN mode — fast cookie check, no DB round-trip
  if (VALID_USER_IDS.size > 0) {
    const devCookie = request.cookies.get('dev_access')
    if (devCookie?.value && VALID_USER_IDS.has(devCookie.value)) return NextResponse.next()
    const loginUrl = new URL('/dev-login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Prod Supabase auth — refresh session in middleware to keep cookies fresh
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
