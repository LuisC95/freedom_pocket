'use client'

import { useRouter } from 'next/navigation'
import type { MapaData } from '@/modules/ideas/types'
import { CAMINOS } from '@/modules/ideas/constants'

interface Props {
  data: MapaData
}

export function MapaPage({ data }: Props) {
  const router = useRouter()

  const caminosWithMatch = CAMINOS.map(c => ({
    ...c,
    match: data.caminos.find(m => m.id === c.id)?.match ?? 50,
  }))

  return (
    <div className="flex flex-col gap-4">
      {/* Hero card */}
      <div className="rounded-2xl bg-[#1A2520] p-5">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[#7A9A8A]">
          Módulo · Ideas
        </div>
        <h1 className="mb-2 text-[22px] font-black leading-tight text-white">
          Tu mapa de<br />oportunidades
        </h1>
        <p className="mb-4 text-[12px] leading-relaxed text-[#7A9A8A]">
          Basado en tu perfil:{' '}
          <span className="font-semibold text-white">
            {data.occupation ?? 'empleado'} · {data.free_hours_week} hrs/sem · meta ${data.monthly_gap.toFixed(0)}/mes
          </span>
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Hora real',     value: `$${data.hourly_rate.toFixed(1)}` },
            { label: 'Horas libres',  value: `${data.free_hours_week}/sem` },
            { label: 'Gap mensual',   value: `$${data.monthly_gap.toFixed(0)}` },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-white/10 p-2 text-center">
              <div className="font-mono text-sm font-black text-[#C69B30]">{s.value}</div>
              <div className="text-[10px] text-[#7A9A8A]">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Nav secundaria */}
      <div className="flex gap-2">
        <button
          onClick={() => router.push('/ideas/cazador')}
          className="flex flex-1 cursor-pointer flex-col items-center rounded-xl border border-[#e0ebe4] bg-[#EAF0EC] px-3 py-2.5"
        >
          <span className="text-base">👂</span>
          <span className="mt-0.5 text-[11px] font-semibold text-[#141F19]">Cazador</span>
          <span className="text-[10px] text-[#7A9A8A]">Registrar observación</span>
        </button>
        <button
          onClick={() => router.push('/ideas/banco')}
          className="flex flex-1 cursor-pointer flex-col items-center rounded-xl border border-[#e0ebe4] bg-[#EAF0EC] px-3 py-2.5"
        >
          <span className="text-base">💡</span>
          <span className="mt-0.5 text-[11px] font-semibold text-[#141F19]">Mis Ideas</span>
          <span className="text-[10px] text-[#7A9A8A]">Ver banco de ideas</span>
        </button>
      </div>

      {/* Caminos */}
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#7A9A8A]">
        3 caminos para tu perfil
      </div>

      <div className="flex flex-col gap-2.5">
        {caminosWithMatch.map(c => (
          <button
            key={c.id}
            onClick={() => router.push(`/ideas/banco?source=mapa&camino=${c.id}`)}
            className="w-full rounded-2xl border-2 border-[#e0ebe4] bg-white p-4 text-left transition-all hover:shadow-md"
            style={{ borderColor: '#e0ebe4' }}
          >
            <div className="flex items-start gap-3">
              <span className="text-[28px] leading-none">{c.emoji}</span>
              <div className="flex-1">
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="text-sm font-bold text-[#141F19]">{c.titulo}</span>
                  <span
                    className="rounded-full px-2 py-0.5 font-mono text-[11px] font-bold"
                    style={{ background: c.color + '18', color: c.color }}
                  >
                    {c.match}%
                  </span>
                </div>
                <div className="mb-2 text-[12px] text-[#7A9A8A]">{c.sub}</div>
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className="rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold"
                    style={{ background: c.color + '18', color: c.color, borderColor: c.color + '30' }}
                  >
                    ⏱ {c.tiempo}
                  </span>
                  <span className="rounded-full border border-[#7A9A8A30] bg-[#7A9A8A18] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#7A9A8A]">
                    🚧 Barrera {c.barrera}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
