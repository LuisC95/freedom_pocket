'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const PIN_TO_USER: Record<string, string> = {
  [process.env.DEV_ACCESS_PIN_LUIS!]:   process.env.DEV_USER_ID_LUIS!,
  [process.env.DEV_ACCESS_PIN_PAREJA!]: process.env.DEV_USER_ID_PAREJA!,
}

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
