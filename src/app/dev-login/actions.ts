'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { PIN_TO_USER } from '@/lib/dev-auth'

export async function validateDevPin(pin: string, from: string) {
  const userId = PIN_TO_USER[pin]

  if (!userId) {
    return { error: true }
  }

  const cookieStore = await cookies()
  cookieStore.set('dev_access', userId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  })

  redirect(from || '/dashboard')
}
