import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { VALID_USER_IDS } from '@/lib/dev-auth'

export function proxy(request: NextRequest) {
  // Si no hay usuarios dev configurados, app pública — no bloquear
  if (VALID_USER_IDS.size === 0) return NextResponse.next()

  // Rutas que siempre pasan sin PIN
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/dev-login') || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next()
  }

  // Verificar cookie: guarda userId (no el PIN)
  const devCookie = request.cookies.get('dev_access')
  if (devCookie?.value && VALID_USER_IDS.has(devCookie.value)) return NextResponse.next()

  // Sin acceso → redirigir al login de dev
  const loginUrl = new URL('/dev-login', request.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
