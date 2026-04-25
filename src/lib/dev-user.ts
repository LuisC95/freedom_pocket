import { cookies } from 'next/headers'
import { assertServerRuntime } from '@/lib/assert-server-runtime'

assertServerRuntime('dev-user')

// Lee el userId desde la cookie 'dev_access' (seteada al validar el PIN).
// Lanza si no hay sesión activa — nunca devuelve undefined.
export async function getDevUserId(): Promise<string> {
  const cookieStore = await cookies()
  const userId = cookieStore.get('dev_access')?.value
  if (!userId) throw new Error('No hay sesión activa')
  return userId
}
