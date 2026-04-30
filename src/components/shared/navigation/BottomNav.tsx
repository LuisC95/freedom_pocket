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
]

interface BottomNavProps {
  isAdmin?: boolean
}

export function BottomNav({ isAdmin = false }: BottomNavProps) {
  const pathname = usePathname()
  const visibleItems = navItems.filter(item => item.href !== '/ideas' || isAdmin)

  return (
    <nav
      className="flex-shrink-0 flex md:hidden items-center justify-around h-[66px] mx-4 mb-3 px-2 relative z-40"
      style={{
        background: 'rgba(8,18,12,0.80)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '9999px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {visibleItems.map((item) => {
        const isActive = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3.5 py-1.5 rounded-full transition-all duration-150',
              isActive
                ? 'text-[#4DC98A]'
                : 'text-[rgba(238,245,240,0.35)] hover:text-[rgba(238,245,240,0.65)]'
            )}
            style={isActive ? { background: 'rgba(58,158,106,0.18)' } : undefined}
          >
            {item.icon}
            <span className="text-[9px] font-medium" style={{ fontFamily: 'var(--font-sans)' }}>
              {item.label}
            </span>
          </Link>
        )
      })}

      <LogoutButton variant="bottomnav" />
    </nav>
  )
}
