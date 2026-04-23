'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

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

interface SidebarProps {
  isAdmin?: boolean
}

export function Sidebar({ isAdmin = false }: SidebarProps) {
  const pathname = usePathname()
  const visibleItems = navItems.filter(item => item.href !== '/ideas' || isAdmin)

  return (
    <aside
      className="fixed left-0 top-0 z-40 hidden md:flex flex-col items-center w-[68px] h-screen py-4 gap-2"
      style={{ backgroundColor: 'var(--color-sidebar)' }}
    >
      {/* Logo */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 font-bold text-sm text-white shrink-0"
        style={{ backgroundColor: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}
      >
        FC
      </div>

      {/* Nav items */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 w-14 py-2.5 px-1 rounded-xl transition-colors',
                isActive ? 'text-[#3A9E6A]' : 'text-[#6A8A7A] hover:text-[#3A9E6A]'
              )}
              style={isActive ? { backgroundColor: '#2E7D5228' } : undefined}
            >
              {item.icon}
              <span className="text-[9px] font-medium leading-tight text-center" style={{ fontFamily: 'var(--font-sans)' }}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
        style={{ backgroundColor: 'var(--color-accent)', fontFamily: 'var(--font-sans)' }}
      >
        JD
      </div>
    </aside>
  )
}
