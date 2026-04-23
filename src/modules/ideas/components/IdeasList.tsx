'use client'

import { useState } from 'react'
import type { Idea, IdeaStatus } from '@/modules/ideas/types'
import { IDEA_STATUSES } from '@/modules/ideas/constants'
import { IdeaCard } from './IdeaCard'

interface IdeasListProps {
  ideas: Idea[]
}

const FILTER_OPTIONS: Array<{ key: IdeaStatus | 'all'; label: string }> = [
  { key: 'all', label: 'Todas' },
  { key: 'generated', label: 'Generadas' },
  { key: 'committed', label: 'Comprometidas' },
  { key: 'validando', label: 'Validando' },
  { key: 'construyendo', label: 'Construyendo' },
  { key: 'operando', label: 'Operando' },
  { key: 'discarded', label: 'Descartadas' },
]

export function IdeasList({ ideas }: IdeasListProps) {
  const [filter, setFilter] = useState<IdeaStatus | 'all'>('all')

  const filtered = filter === 'all' ? ideas : ideas.filter(i => i.status === filter)

  const activeCounts = IDEA_STATUSES.filter(s => ideas.some(i => i.status === s.key))
    .map(s => s.key)

  const filtersToShow = FILTER_OPTIONS.filter(
    f => f.key === 'all' || activeCounts.includes(f.key as IdeaStatus)
  )

  return (
    <div>
      {filtersToShow.length > 2 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
          {filtersToShow.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: filter === f.key ? 600 : 400,
                fontFamily: 'var(--font-sans)',
                border: `1.5px solid ${filter === f.key ? '#3A9E6A' : '#E4EDE8'}`,
                backgroundColor: filter === f.key ? '#F0FBF4' : '#fff',
                color: filter === f.key ? '#3A9E6A' : '#7A9A8A',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p style={{ fontSize: 13, color: '#7A9A8A', fontFamily: 'var(--font-sans)', textAlign: 'center', padding: '24px 0' }}>
          No hay ideas con este filtro.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(idea => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}
    </div>
  )
}
