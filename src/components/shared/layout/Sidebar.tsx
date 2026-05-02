'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LogoutButton } from '@/components/shared/LogoutButton'

const navItems = [
  {
    label: 'Mi Realidad',
    href: '/mi-realidad',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="12" width="4" height="8" rx="1" />
        <rect x="10" y="7" width="4" height="13" rx="1" />
        <rect x="17" y="3" width="4" height="17" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Brújula',
    href: '/brujula',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="9" />
        <path d="M16.2 7.8l-2.6 5.4-5.4 2.6 2.6-5.4 5.4-2.6z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'Ideas',
    href: '/ideas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 2c-3.5 0-6 3-6 6.5 0 2.5 1.2 4.5 3 5.5v2h6v-2c1.8-1 3-3 3-5.5C18 5 15.5 2 12 2z" />
        <path d="M9 19h6M10 22h4" />
      </svg>
    ),
  },
  {
    label: 'Config',
    href: '/configuracion',
    alwaysVisible: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

interface SidebarProps {
  isAdmin?: boolean
}

export function Sidebar({ isAdmin = false }: SidebarProps) {
  const pathname = usePathname()
  const visibleItems = navItems.filter(item =>
    item.href !== '/ideas' || isAdmin || ('alwaysVisible' in item && item.alwaysVisible)
  )

  return (
    <aside
      className="fixed left-0 top-0 z-40 hidden md:flex flex-col items-center w-[72px] h-screen py-[18px] pb-4 gap-0.5"
      style={{
        background: 'rgba(10,20,14,0.70)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Logo */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 font-bold text-sm text-white shrink-0"
        style={{
          background: 'linear-gradient(135deg, #2E7D52 0%, #1F6B3E 100%)',
          fontFamily: 'var(--font-mono)',
          boxShadow: '0 4px 20px rgba(46,125,82,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
        }}
      >
        FC
      </div>

      {/* Nav items */}
      <nav className="flex flex-col items-center gap-0.5 flex-1">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center gap-1 w-[58px] py-2.5 px-1 rounded-xl transition-all duration-150',
                isActive
                  ? 'text-[#4DC98A]'
                  : 'text-[rgba(238,245,240,0.3)] hover:text-[rgba(238,245,240,0.65)] hover:bg-[rgba(255,255,255,0.04)]'
              )}
              style={isActive ? {
                background: 'rgba(58,158,106,0.18)',
                border: '1px solid rgba(58,158,106,0.35)',
              } : undefined}
            >
              {isActive && (
                <span className="absolute left-[-1px] top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-[#4DC98A] rounded-r-full" />
              )}
              {item.icon}
              <span className="text-[9px] font-medium leading-tight text-center" style={{ fontFamily: 'var(--font-sans)' }}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      <LogoutButton variant="sidebar" />
    </aside>
  )
}
