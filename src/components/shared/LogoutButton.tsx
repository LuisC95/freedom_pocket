'use client'

import { useRouter } from 'next/navigation'
import { logout } from '@/app/dev-login/logout'

interface LogoutButtonProps {
  variant: 'sidebar' | 'bottomnav'
}

export function LogoutButton({ variant }: LogoutButtonProps) {
  const router = useRouter()

  async function handleLogout() {
    await logout()
    router.push('/dev-login')
  }

  if (variant === 'sidebar') {
    return (
      <button
        onClick={handleLogout}
        title="Cerrar sesión"
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors hover:bg-white/10"
        style={{ color: '#6A8A7A' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    )
  }

  return (
    <button
      onClick={handleLogout}
      className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-colors text-[#6A8A7A] hover:text-[#3A9E6A]"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      <span className="text-[9px] font-medium" style={{ fontFamily: 'var(--font-sans)' }}>Salir</span>
    </button>
  )
}
