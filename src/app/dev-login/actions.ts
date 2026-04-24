'use server'

import { cookies } from 'next/headers'
import { PIN_TO_USER } from '@/lib/dev-auth'

export async function validateDevPin(pin: string, from: string) {
  const userId = PIN_TO_USER[pin]

  if (!userId) {
    return { error: true as const }
  }

  const cookieStore = await cookies()
  cookieStore.set('dev_access', userId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  })

  return { error: false as const, redirectTo: from || '/dashboard' }
}
