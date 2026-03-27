'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function validateDevPin(pin: string, from: string) {
  const devPin = process.env.DEV_ACCESS_PIN

  if (!devPin || pin !== devPin) {
    return { error: true }
  }

  const cookieStore = await cookies()
  cookieStore.set('dev_access', pin, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  })

  redirect(from || '/dashboard')
}
