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

  const allItems = [...ITEMS, { key: 'sprint', label: 'Sprint', icon: '⚡', href: sprintHref }]

  return (
    <div className="ideas-module-nav" aria-label="Navegación del módulo Ideas">
      {allItems.map(item => {
        const active = item.key === 'mapa'
          ? pathname === '/ideas'
          : pathname.startsWith(item.key === 'sprint' ? '/ideas/sprint' : item.href)
        const disabled = item.key === 'sprint' && !activeSprintId
        const isSprintActive = item.key === 'sprint' && activeSprintId && !active

        const content = (
          <>
            <span className="text-[16px] leading-none">{item.icon}</span>
            <span className="text-[10px] font-semibold">{item.label}</span>
            {active && <span className="h-1 w-1 rounded-full" style={{ background: 'var(--green-bright)' }} />}
            {isSprintActive && <span className="h-1 w-1 rounded-full" style={{ background: 'var(--text-gold)' }} />}
          </>
        )

        if (disabled) {
          return (
            <button
              key={item.key}
              type="button"
              disabled
              className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-2 opacity-25"
              style={{ color: 'var(--text-muted)' }}
            >
              {content}
            </button>
          )
        }

        return (
          <Link
            key={item.key}
            href={item.href}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-2 transition-all"
            style={{
              color: active
                ? 'var(--green-bright)'
                : isSprintActive
                  ? 'var(--text-gold)'
                  : 'var(--text-muted)',
              background: active
                ? 'var(--green-dim)'
                : isSprintActive
                  ? 'rgba(198,155,48,0.12)'
                  : 'transparent',
              border: isSprintActive ? '1px solid rgba(198,155,48,0.2)' : undefined,
            }}
          >
            {content}
          </Link>
        )
      })}
    </div>
  )
}
