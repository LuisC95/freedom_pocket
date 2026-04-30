'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface IdeasModuleNavProps {
  activeSprintId?: string | null
}

const ITEMS = [
  { key: 'mapa', label: 'Mapa', icon: '🗺️', href: '/ideas' },
  { key: 'cazador', label: 'Cazador', icon: '👂', href: '/ideas/cazador' },
  { key: 'banco', label: 'Ideas', icon: '💡', href: '/ideas/banco' },
] as const

export function IdeasModuleNav({ activeSprintId }: IdeasModuleNavProps) {
  const pathname = usePathname()
  const sprintHref = activeSprintId ? `/ideas/sprint/${activeSprintId}` : '/ideas/banco'

  return (
    <div className="ideas-module-nav" aria-label="Navegación del módulo Ideas">
      {[...ITEMS, { key: 'sprint', label: 'Sprint', icon: '⚡', href: sprintHref }].map(item => {
        const active = item.key === 'mapa'
          ? pathname === '/ideas'
          : pathname.startsWith(item.key === 'sprint' ? '/ideas/sprint' : item.href)
        const disabled = item.key === 'sprint' && !activeSprintId
        const content = (
          <>
            <span className="text-[16px] leading-none">{item.icon}</span>
            <span className="text-[10px] font-semibold">{item.label}</span>
            {active && <span className="h-1 w-1 rounded-full bg-[#2E7D52]" />}
          </>
        )

        if (disabled) {
          return (
            <button
              key={item.key}
              type="button"
              disabled
              className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-[#7A9A8A] opacity-35"
            >
              {content}
            </button>
          )
        }

        return (
          <Link
            key={item.key}
            href={item.href}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-2"
            style={{ color: active ? '#2E7D52' : '#7A9A8A', background: active ? '#2E7D5212' : 'transparent' }}
          >
            {content}
          </Link>
        )
      })}
    </div>
  )
}
