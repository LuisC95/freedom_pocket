// src/lib/dev-auth.ts
// Mapa PIN → userId para el sistema de acceso dev.
// Prioridad: vars nuevas (LUIS/PAREJA) → fallback a vars legacy (DEV_ACCESS_PIN / DEV_USER_ID).
// Para desarrollo local conviene guardar estos pares en `.env.development.local`,
// así `vercel env pull .env.local` no pisa los PINs ni la continuidad de perfiles.
// Usado por proxy.ts, dev-login/actions.ts y layout.tsx.

function buildPinToUser(): Record<string, string> {
  const map: Record<string, string> = {}

  const pinLuis   = process.env.DEV_ACCESS_PIN_LUIS
  const userLuis  = process.env.DEV_USER_ID_LUIS
  const pinPareja = process.env.DEV_ACCESS_PIN_PAREJA
  const userPareja = process.env.DEV_USER_ID_PAREJA

  if (pinLuis && userLuis)     map[pinLuis]   = userLuis
  if (pinPareja && userPareja) map[pinPareja] = userPareja

  // Fallback a vars legacy si no hay ninguna var nueva configurada
  if (Object.keys(map).length === 0) {
    const legacyPin  = process.env.DEV_ACCESS_PIN
    const legacyUser = process.env.DEV_USER_ID
    if (legacyPin && legacyUser) map[legacyPin] = legacyUser
  }

  return map
}

export const PIN_TO_USER: Record<string, string> = buildPinToUser()

export const VALID_USER_IDS: Set<string> = new Set(Object.values(PIN_TO_USER))
