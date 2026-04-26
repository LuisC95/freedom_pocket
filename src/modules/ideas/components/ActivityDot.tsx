'use client'

interface ActivityDotProps {
  days: number
}

export function ActivityDot({ days }: ActivityDotProps) {
  if (days <= 3) return null

  const urgent = days > 14
  const color = urgent ? '#E84434' : '#C69B30'

  return (
    <span
      className="inline-flex items-center gap-[4px] text-[11px]"
      style={{ color, fontFamily: 'var(--font-sans)' }}
    >
      <span
        className="inline-block rounded-full"
        style={{
          width: 6,
          height: 6,
          background: color,
          boxShadow: `0 0 6px ${color}`,
        }}
      />
      {days}d sin actividad
    </span>
  )
}
