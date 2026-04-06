'use client'

import { useTransition } from 'react'
import { approveRecurringTransaction } from '../actions'
import type { RecurringTemplate } from '../types'

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)
}

interface RecurringBannerProps {
  pending: RecurringTemplate[]
  onApproved: () => void
}

export function RecurringBanner({ pending, onApproved }: RecurringBannerProps) {
  if (!pending.length) return null

  return (
    <div style={{ backgroundColor: '#1A2520', borderRadius: '12px', padding: '12px 16px', borderLeft: '3px solid #C69B30' }} className="mb-4">
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.09em', color: '#C69B30' }} className="mb-2.5">
        recurrentes pendientes
      </p>
      {pending.map(t => (
        <BannerItem key={t.id} template={t} onApproved={onApproved} />
      ))}
    </div>
  )
}

function BannerItem({ template, onApproved }: { template: RecurringTemplate; onApproved: () => void }) {
  const [pending, startTransition] = useTransition()

  function handleApprove() {
    startTransition(async () => {
      await approveRecurringTransaction(template.id)
      onApproved()
    })
  }

  const dotColor = template.category?.color ?? '#7A9A8A'

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid #2E7D5220' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
        <div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#F2F7F4' }}>{template.name}</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#7A9A8A' }}>
            {`${fmt(template.amount, template.currency)} · día ${template.day_of_month}`}
          </p>
        </div>
      </div>
      <button
        onClick={handleApprove}
        disabled={pending}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: '#3A9E6A',
          backgroundColor: '#3A9E6A20',
          border: '0.5px solid #3A9E6A40',
          padding: '3px 10px',
          borderRadius: '5px',
          cursor: 'pointer',
          opacity: pending ? 0.5 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {pending ? '…' : '✓ Aprobar'}
      </button>
    </div>
  )
}
