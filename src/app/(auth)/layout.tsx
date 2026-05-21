export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="fc-bg-canvas" aria-hidden="true">
        <div className="fc-bg-orb fc-bg-orb-1" />
        <div className="fc-bg-orb fc-bg-orb-2" />
        <div className="fc-bg-orb fc-bg-orb-3" />
      </div>
      <div className="relative z-10 w-full max-w-sm px-4">
        {children}
      </div>
    </div>
  )
}
