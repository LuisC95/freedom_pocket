// Reemplaza este UUID con el ID real del usuario de prueba en Supabase
// Dashboard → Authentication → Users → copia el UUID
export const DEV_USER_ID = '1e04cc3d-2c30-4cf9-a977-bb7209aece3a'

export interface DevUser {
  id: string
  email: string
  name: string
}

export const DEV_USER: DevUser = {
  id: DEV_USER_ID,
  email: 'dev@fastlanecompass.com',
  name: 'Dev User',
}
