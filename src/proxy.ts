import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const DEV_PIN = process.env.DEV_ACCESS_PIN

export function proxy(request: NextRequest) {
  // Si no hay PIN configurado, app pública — no bloquear
  if (!DEV_PIN) return NextResponse.next()

  // Rutas que siempre pasan sin PIN
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/dev-login') || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next()
  }

  // Verificar cookie de acceso
  const pinCookie = request.cookies.get('dev_access')
  if (pinCookie?.value === DEV_PIN) return NextResponse.next()

  // Sin acceso → redirigir al login de dev
  const loginUrl = new URL('/dev-login', request.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}