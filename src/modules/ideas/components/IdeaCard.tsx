'use client'

import Link from 'next/link'
import type { Idea } from '@/modules/ideas/types'
import { IDEA_STATUSES, CENTS_DIMENSIONS } from '@/modules/ideas/constants'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  generated:    { bg: '#E8F5E9', text: '#2E7D52' },
  committed:    { bg: '#E3F2FD', text: '#1565C0' },
  validando:    { bg: '#FFF8E1', text: '#F57F17' },
  construyendo: { bg: '#FCE4EC', text: '#C62828' },
  operando:     { bg: '#E8F5E9', text: '#1B5E20' },
  discarded:    { bg: '#F5F5F5', text: '#9E9E9E' },
}

interface IdeaCardProps {
  idea: Idea
}

export function IdeaCard({ idea }: IdeaCardProps) {
  const statusMeta = IDEA_STATUSES.find(s => s.key === idea.status)
  const colors = STATUS_COLORS[idea.status] ?? { bg: '#F5F5F5', text: '#9E9E9E' }

  const raw = idea as unknown as Record<string, number | null>
  const centsTotal = CENTS_DIMENSIONS.reduce((sum, dim) => sum + (raw[dim.db_column] ?? 0), 0)
  const centsCount = CENTS_DIMENSIONS.filter(dim => raw[dim.db_column] !== null).length

  return (
    <Link href={`/ideas/${idea.id}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          border: '1.5px solid #E4EDE8',
          borderRadius: 12,
          padding: '14px 16px',
          backgroundColor: '#fff',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = '#3A9E6A')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = '#E4EDE8')}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <p style={{ fontSize: 14, fontWeight: 600, color: '#141F19', fontFamily: 'var(--font-sans)', margin: 0, flex: 1 }}>
            {idea.title}
          </p>
          <span
            style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
              backgroundColor: colors.bg, color: colors.text,
              fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
            }}
          >
            {statusMeta?.label ?? idea.status}
          </span>
        </div>
        {idea.concept && (
          <p style={{ fontSize: 12, color: '#7A9A8A', fontFamily: 'var(--font-sans)', margin: '0 0 10px', lineHeight: 1.5 }}>
            {idea.concept}
          </p>
        )}
        {centsCount > 0 && (
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11, color: '#7A9A8A', fontFamily: 'var(--font-mono)' }}>
              CENTS {centsTotal}/{centsCount * 10}
            </span>
            {idea.cents_complete && (
              <span style={{ fontSize: 10, color: '#3A9E6A', fontFamily: 'var(--font-sans)' }}>✓ completo</span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
