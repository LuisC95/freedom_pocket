'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MapaData } from '@/modules/ideas/types'
import { CAMINOS } from '@/modules/ideas/constants'

interface Props {
  data: MapaData
}

export function MapaPage({ data }: Props) {
  const router = useRouter()
  const [sel, setSel] = useState<string | null>(null)

  const caminosWithMatch = CAMINOS.map(c => ({
    ...c,
    match: data.caminos.find(m => m.id === c.id)?.match ?? 50,
  }))

  const handleCaminoClick = (id: string) => {
    setSel(id)
    router.push(`/ideas/banco?source=mapa&camino=${id}`)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Hero card */}
      <div className="glass-hero p-5">
        <div className="fc-label-micro mb-1">Módulo · Ideas</div>
        <h1 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 800, lineHeight: 1.2, marginBottom: 8, fontFamily: 'var(--font-sans)' }}>
          Tu mapa de<br />oportunidades
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
          Basado en tu perfil:{' '}
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {data.occupation ?? 'empleado'} · {data.free_hours_week} hrs/sem · meta ${data.monthly_gap.toFixed(0)}/mes
          </span>
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Hora real',    value: `$${data.hourly_rate.toFixed(1)}` },
            { label: 'Horas libres', value: `${data.free_hours_week}/sem` },
            { label: 'Gap mensual',  value: `$${data.monthly_gap.toFixed(0)}` },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px', textAlign: 'center' }}>
              <div className="glow-gold" style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800, color: 'var(--text-gold)' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="flex gap-2">
        <button
          onClick={() => router.push('/ideas/cazador')}
          className="glass flex flex-1 cursor-pointer flex-col items-center px-3 py-3 transition-all hover:bg-[rgba(255,255,255,0.09)] active:scale-[0.97]"
          style={{ borderRadius: 'var(--r-card)' }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>👂</span>
          <span style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>Cazador</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>Registrar observación</span>
        </button>
        <button
          onClick={() => router.push('/ideas/banco')}
          className="glass flex flex-1 cursor-pointer flex-col items-center px-3 py-3 transition-all hover:bg-[rgba(255,255,255,0.09)] active:scale-[0.97]"
          style={{ borderRadius: 'var(--r-card)' }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>💡</span>
          <span style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>Mis Ideas</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>Ver banco de ideas</span>
        </button>
      </div>

      {/* Caminos */}
      <div className="fc-label-micro mt-1">3 caminos para tu perfil</div>

      <div className="flex flex-col gap-2.5">
        {caminosWithMatch.map(c => {
          const isSelected = sel === c.id
          return (
            <button
              key={c.id}
              onClick={() => handleCaminoClick(c.id)}
              className="glass w-full p-4 text-left transition-all"
              style={{
                cursor: 'pointer',
                border: `${isSelected ? '2px' : '1px'} solid ${isSelected ? c.color + '60' : 'var(--glass-border)'}`,
                background: isSelected ? c.color + '10' : undefined,
                boxShadow: isSelected ? `0 4px 20px ${c.color}18` : undefined,
              }}
            >
              <div className="flex items-start gap-3">
                <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{c.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2, gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.titulo}
                    </span>
                    <span style={{ flexShrink: 0, background: c.color + '20', color: c.color, borderRadius: 999, padding: '2px 8px', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700 }}>
                      {c.match}%
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: 'var(--font-sans)' }}>{c.sub}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ background: c.color + '18', color: c.color, border: `1px solid ${c.color}30`, borderRadius: 999, padding: '2px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>
                      ⏱ {c.tiempo}
                    </span>
                    <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 999, padding: '2px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>
                      🚧 Barrera {c.barrera}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
